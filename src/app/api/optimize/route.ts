import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { approximateBelgianCoordinates } from "@/lib/geo/belgian-geocode";
import { prisma } from "@/lib/prisma";
import { getRouteColor, getSolver } from "@/lib/solver";
import type { SolverTimeWindow } from "@/lib/solver/types";
import { minutesToTime, parseTimeToMinutes } from "@/lib/time";
import { optimizeRequestSchema } from "@/lib/validations";
import { getWeekdayFromDate, parseDateOnly } from "@/lib/weekday";

interface PharmacyForTimeWindows {
  earlyAccessEnabled: boolean;
  earlyAccessTime: string | null;
  timeWindows: { startTime: string; endTime: string; period: SolverTimeWindow["period"] }[];
}

/**
 * Construit les créneaux ouverts d'une pharmacie pour le jour ciblé, triés par heure
 * de début. Si la livraison hors-horaires (sas/clé) est activée, l'heure de début du
 * tout premier créneau du jour est abaissée jusqu'à l'heure d'accès chauffeur — le
 * solver peut alors planifier une arrivée avant l'ouverture officielle de l'officine,
 * sans que celle-ci ne soit modifiée sur la fiche pharmacie.
 */
function buildStopTimeWindows(pharmacy: PharmacyForTimeWindows): SolverTimeWindow[] {
  const windows = pharmacy.timeWindows
    .map(
      (w): SolverTimeWindow => ({
        startMinutes: parseTimeToMinutes(w.startTime),
        endMinutes: parseTimeToMinutes(w.endTime),
        period: w.period,
      })
    )
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (pharmacy.earlyAccessEnabled && pharmacy.earlyAccessTime && windows.length > 0) {
    const earlyAccessMinutes = parseTimeToMinutes(pharmacy.earlyAccessTime);
    windows[0] = {
      ...windows[0],
      startMinutes: Math.min(windows[0].startMinutes, earlyAccessMinutes),
    };
  }

  return windows;
}

export async function POST(request: NextRequest) {
  let optimizationId: string | null = null;

  try {
    const body = await request.json();
    const { vehicleCount, departureTime, deliveryDate, solverProvider, pharmacyIds } =
      optimizeRequestSchema.parse(body);

    const deliveryDateObj = parseDateOnly(deliveryDate);
    const weekday = getWeekdayFromDate(deliveryDateObj);
    if (!weekday) {
      return NextResponse.json(
        { error: "Aucune livraison n'est programmée le dimanche — choisissez un autre jour" },
        { status: 400 }
      );
    }

    const depot = await prisma.depot.findFirst({ where: { isActive: true } });
    if (!depot) {
      return NextResponse.json(
        { error: "Configurez d'abord le dépôt central avant de lancer une optimisation" },
        { status: 400 }
      );
    }

    const allPharmacies = await prisma.pharmacy.findMany({
      where: { isActive: true },
      include: { timeWindows: { where: { weekday } } },
    });
    if (allPharmacies.length === 0) {
      return NextResponse.json(
        { error: "Importez au moins une pharmacie avant de lancer une optimisation" },
        { status: 400 }
      );
    }

    // Seules les pharmacies ayant au moins un créneau ouvert ce jour-là participent
    // à l'optimisation ; les autres sont simplement absentes de cette tournée.
    const openToday = allPharmacies.filter((p) => p.timeWindows.length > 0);
    const excludedCount = allPharmacies.length - openToday.length;

    // Sélection manuelle du dispatcher (cases cochées à l'écran Optimisation) :
    // restreint encore la liste aux pharmacies choisies parmi celles ouvertes ce jour-là.
    const selectedIdSet = pharmacyIds ? new Set(pharmacyIds) : null;
    const pharmacies = selectedIdSet
      ? openToday.filter((p) => selectedIdSet.has(p.id))
      : openToday;
    const deselectedCount = selectedIdSet ? openToday.length - pharmacies.length : 0;

    if (pharmacies.length === 0) {
      return NextResponse.json(
        {
          error: selectedIdSet
            ? "Aucune des pharmacies sélectionnées n'a de créneau ouvert ce jour-là."
            : "Aucune pharmacie n'a de créneau ouvert ce jour-là. Vérifiez la grille horaire des pharmacies ou choisissez une autre date.",
        },
        { status: 400 }
      );
    }

    // On vérifie la configuration du solver AVANT de créer quoi que ce soit en
    // base : un fournisseur externe mal configuré ne doit pas laisser
    // d'optimisation "RUNNING"/"FAILED" orpheline.
    const solver = getSolver(solverProvider);
    if (!solver.isConfigured()) {
      return NextResponse.json({ error: solver.configurationHint() }, { status: 400 });
    }

    // Géocodage de secours pour le dépôt / les pharmacies sans coordonnées connues.
    let depotLat = depot.latitude;
    let depotLng = depot.longitude;
    if (depotLat == null || depotLng == null) {
      const approx = approximateBelgianCoordinates(depot.postalCode, depot.address);
      depotLat = approx.lat;
      depotLng = approx.lng;
      await prisma.depot.update({
        where: { id: depot.id },
        data: { latitude: approx.lat, longitude: approx.lng },
      });
    }

    const pharmaciesWithCoords = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        if (pharmacy.latitude != null && pharmacy.longitude != null) return pharmacy;
        const approx = approximateBelgianCoordinates(pharmacy.postalCode, pharmacy.address);
        return prisma.pharmacy.update({
          where: { id: pharmacy.id },
          data: { latitude: approx.lat, longitude: approx.lng },
          include: { timeWindows: { where: { weekday } } },
        });
      })
    );

    const optimization = await prisma.optimization.create({
      data: {
        depotId: depot.id,
        vehicleCount,
        departureTime,
        deliveryDate: deliveryDateObj,
        solverProvider,
        selectedPharmacyIds: pharmacyIds ? JSON.stringify(pharmacyIds) : null,
        status: "RUNNING",
      },
    });
    optimizationId = optimization.id;

    const result = await solver.solve({
      depot: { lat: depotLat, lng: depotLng },
      stops: pharmaciesWithCoords.map((pharmacy) => ({
        pharmacyId: pharmacy.id,
        lat: pharmacy.latitude as number,
        lng: pharmacy.longitude as number,
        demand: pharmacy.bacsCount,
        serviceTimeMinutes: pharmacy.serviceTimeMinutes,
        // Créneaux ouverts ce jour-là (matin et/ou après-midi), triés par heure de début.
        timeWindows: buildStopTimeWindows(pharmacy),
      })),
      vehicleCount,
      departureTimeMinutes: parseTimeToMinutes(departureTime),
    });

    await prisma.$transaction(async (tx) => {
      for (const route of result.routes) {
        const createdRoute = await tx.route.create({
          data: {
            optimizationId: optimization.id,
            vehicleLabel: `Véhicule ${route.vehicleIndex + 1}`,
            vehicleIndex: route.vehicleIndex,
            totalDistanceKm: route.totalDistanceKm,
            totalDurationMin: route.totalDurationMin,
            colorHex: getRouteColor(route.vehicleIndex),
            geometry: route.geometry ? JSON.stringify(route.geometry) : null,
          },
        });

        for (const stop of route.stops) {
          await tx.routeStop.create({
            data: {
              routeId: createdRoute.id,
              pharmacyId: stop.pharmacyId,
              sequence: stop.sequence,
              etaArrival: minutesToTime(stop.etaArrivalMinutes),
              etaDeparture: minutesToTime(stop.etaDepartureMinutes),
              withinTimeWindow: stop.withinTimeWindow,
              deliveryPeriod: stop.matchedPeriod,
              scheduledWindowStart: minutesToTime(stop.matchedWindowStartMinutes),
              scheduledWindowEnd: minutesToTime(stop.matchedWindowEndMinutes),
              distanceFromPrevKm: stop.distanceFromPrevKm,
              durationFromPrevMin: stop.durationFromPrevMin,
            },
          });
        }
      }

      await tx.optimization.update({
        where: { id: optimization.id },
        data: {
          status: "COMPLETED",
          totalDistanceKm: result.totalDistanceKm,
          totalDurationMin: result.totalDurationMin,
          violationsCount: result.violationsCount,
          completedAt: new Date(),
        },
      });
    });

    return NextResponse.json(
      {
        optimizationId: optimization.id,
        unassignedCount: result.unassignedPharmacyIds?.length ?? 0,
        excludedCount,
        deselectedCount,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Paramètres d'optimisation invalides", issues: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[POST /api/optimize]", error);

    if (optimizationId) {
      await prisma.optimization
        .update({
          where: { id: optimizationId },
          data: { status: "FAILED", errorMessage: message },
        })
        .catch(() => undefined);
    }

    return NextResponse.json(
      { error: `Le calcul de l'optimisation a échoué : ${message}` },
      { status: 500 }
    );
  }
}
