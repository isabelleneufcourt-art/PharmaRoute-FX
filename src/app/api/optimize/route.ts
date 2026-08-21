import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { approximateBelgianCoordinates } from "@/lib/geo/belgian-geocode";
import { prisma } from "@/lib/prisma";
import { getRouteColor, getSolver } from "@/lib/solver";
import { minutesToTime, parseTimeToMinutes } from "@/lib/time";
import { optimizeRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  let optimizationId: string | null = null;

  try {
    const body = await request.json();
    const { vehicleCount, departureTime, solverProvider } = optimizeRequestSchema.parse(body);

    const depot = await prisma.depot.findFirst({ where: { isActive: true } });
    if (!depot) {
      return NextResponse.json(
        { error: "Configurez d'abord le dépôt central avant de lancer une optimisation" },
        { status: 400 }
      );
    }

    const pharmacies = await prisma.pharmacy.findMany({ where: { isActive: true } });
    if (pharmacies.length === 0) {
      return NextResponse.json(
        { error: "Importez au moins une pharmacie avant de lancer une optimisation" },
        { status: 400 }
      );
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
        });
      })
    );

    const optimization = await prisma.optimization.create({
      data: {
        depotId: depot.id,
        vehicleCount,
        departureTime,
        solverProvider,
        status: "RUNNING",
      },
    });
    optimizationId = optimization.id;

    const solver = getSolver(solverProvider);
    const result = await solver.solve({
      depot: { lat: depotLat, lng: depotLng },
      stops: pharmaciesWithCoords.map((pharmacy) => ({
        pharmacyId: pharmacy.id,
        lat: pharmacy.latitude as number,
        lng: pharmacy.longitude as number,
        demand: pharmacy.bacsCount,
        serviceTimeMinutes: pharmacy.serviceTimeMinutes,
        timeWindowStart: parseTimeToMinutes(pharmacy.timeWindowStart),
        timeWindowEnd: parseTimeToMinutes(pharmacy.timeWindowEnd),
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

    return NextResponse.json({ optimizationId: optimization.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Paramètres d'optimisation invalides", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("[POST /api/optimize]", error);

    if (optimizationId) {
      await prisma.optimization
        .update({
          where: { id: optimizationId },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Erreur inconnue",
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({ error: "Le calcul de l'optimisation a échoué" }, { status: 500 });
  }
}
