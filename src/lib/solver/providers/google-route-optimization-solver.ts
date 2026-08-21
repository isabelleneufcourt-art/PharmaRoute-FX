/**
 * Solver "Google Route Optimization" (Cloud Fleet Routing).
 *
 * ⚠️ Implémenté au meilleur effort d'après la documentation publique de
 * l'API (https://developers.google.com/maps/documentation/route-optimization),
 * mais NON testé en conditions réelles faute de projet GCP/compte de service
 * disponible dans cet environnement. Vérifiez le comportement avec vos
 * propres identifiants avant un usage en production — voir le README.
 *
 * Nécessite un compte de service GCP (JSON complet dans
 * GOOGLE_SERVICE_ACCOUNT_JSON) et un projet avec l'API Route Optimization
 * activée (GOOGLE_CLOUD_PROJECT_ID).
 */

import { roadDistanceKm, travelTimeMinutes } from "../geometry";
import { decodePolyline, isPlausibleRouteGeometry } from "../polyline";
import type { SolverInput, SolverResult, SolverRouteResult, SolverStopResult, VrptwSolver } from "../types";
import { getGoogleAccessToken, parseServiceAccount, type GoogleServiceAccount } from "./google-auth";

interface OptimizeToursVisit {
  shipmentIndex: number;
  startTime: string;
}

interface OptimizeToursRoute {
  visits?: OptimizeToursVisit[];
  metrics?: { travelDistanceMeters?: number | string; travelDuration?: string };
  /** Tracé encodé de l'itinéraire complet (overview polyline), si fourni par l'API. */
  routePolyline?: { points?: string };
}

interface OptimizeToursResponse {
  routes?: OptimizeToursRoute[];
  skippedShipments?: { index: number }[];
}

function serviceAccountJsonEnv(): string | undefined {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  return raw ? raw : undefined;
}

function resolveProjectId(serviceAccount: GoogleServiceAccount): string | undefined {
  return process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() || serviceAccount.project_id;
}

/** Convertit des minutes depuis minuit en horodatage RFC3339, ancré sur la date du jour (UTC). */
function minutesToIsoToday(minutes: number): string {
  const now = new Date();
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(dayStart + Math.round(minutes) * 60_000).toISOString();
}

function isoToMinutesToday(iso: string): number {
  const now = new Date();
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (new Date(iso).getTime() - dayStart) / 60_000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const googleRouteOptimizationSolver: VrptwSolver = {
  id: "GOOGLE_ROUTE_OPTIMIZATION",
  label: "Google Route Optimization",

  isConfigured: () => Boolean(serviceAccountJsonEnv()),

  configurationHint: () =>
    "Configurez GOOGLE_SERVICE_ACCOUNT_JSON (clé JSON complète d'un compte de service GCP) et GOOGLE_CLOUD_PROJECT_ID dans .env. Nécessite un projet GCP avec l'API Route Optimization activée.",

  async solve(input: SolverInput): Promise<SolverResult> {
    const raw = serviceAccountJsonEnv();
    if (!raw) throw new Error(googleRouteOptimizationSolver.configurationHint());

    const serviceAccount = parseServiceAccount(raw);
    const projectId = resolveProjectId(serviceAccount);
    if (!projectId) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID manquant (absent aussi du compte de service)");
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    const { depot, stops, vehicleCount, departureTimeMinutes } = input;

    if (stops.length === 0 || vehicleCount <= 0) {
      return { routes: [], totalDistanceKm: 0, totalDurationMin: 0, violationsCount: 0 };
    }

    const shipments = stops.map((stop) => ({
      label: stop.pharmacyId,
      deliveries: [
        {
          arrivalLocation: { latitude: stop.lat, longitude: stop.lng },
          duration: `${Math.round(stop.serviceTimeMinutes * 60)}s`,
          timeWindows: [
            {
              startTime: minutesToIsoToday(stop.timeWindowStart),
              endTime: minutesToIsoToday(stop.timeWindowEnd),
            },
          ],
        },
      ],
    }));

    const vehicles = Array.from({ length: vehicleCount }, (_, i) => ({
      label: `Véhicule ${i + 1}`,
      startLocation: { latitude: depot.lat, longitude: depot.lng },
      endLocation: { latitude: depot.lat, longitude: depot.lng },
    }));

    const response = await fetch(
      `https://routeoptimization.googleapis.com/v1/projects/${projectId}:optimizeTours`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: {
            globalStartTime: minutesToIsoToday(departureTimeMinutes),
            globalEndTime: minutesToIsoToday(departureTimeMinutes + 16 * 60),
            shipments,
            vehicles,
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Route Optimization a répondu ${response.status} : ${body.slice(0, 300)}`);
    }

    const json: OptimizeToursResponse = await response.json();

    let violationsCount = 0;
    const routes: SolverRouteResult[] = (json.routes ?? []).map((route, vehicleIndex) => {
      let previousPoint = { lat: depot.lat, lng: depot.lng };

      const stopResults: SolverStopResult[] = (route.visits ?? []).map((visit, index) => {
        const stop = stops[visit.shipmentIndex];
        const arrivalMinutes = isoToMinutesToday(visit.startTime);
        const departureMinutes = arrivalMinutes + stop.serviceTimeMinutes;
        const withinTimeWindow = arrivalMinutes <= stop.timeWindowEnd + 1e-6;
        if (!withinTimeWindow) violationsCount += 1;

        // L'API ne détaille pas la distance/durée par segment : on l'estime
        // via Haversine pour l'affichage informatif du détail de la tournée
        // (les totaux ci-dessous, eux, viennent bien de Google).
        const legDistanceKm = roadDistanceKm(previousPoint, stop);
        const legDurationMin = travelTimeMinutes(legDistanceKm, 28);
        previousPoint = stop;

        return {
          pharmacyId: stop.pharmacyId,
          sequence: index + 1,
          etaArrivalMinutes: Math.round(arrivalMinutes),
          etaDepartureMinutes: Math.round(departureMinutes),
          withinTimeWindow,
          distanceFromPrevKm: round2(legDistanceKm),
          durationFromPrevMin: Math.round(legDurationMin),
        };
      });

      const travelDistanceMeters = Number(route.metrics?.travelDistanceMeters ?? 0);
      const travelDurationSeconds = Number(String(route.metrics?.travelDuration ?? "0s").replace("s", ""));

      let geometry: [number, number][] | undefined;
      if (route.routePolyline?.points) {
        try {
          const decoded = decodePolyline(route.routePolyline.points);
          if (isPlausibleRouteGeometry(decoded)) geometry = decoded;
        } catch (error) {
          console.warn(
            `[google-route-optimization-solver] Impossible de décoder le tracé du véhicule ${vehicleIndex + 1} :`,
            error instanceof Error ? error.message : error
          );
        }
      }

      return {
        vehicleIndex,
        stops: stopResults,
        totalDistanceKm: round2(travelDistanceMeters / 1000),
        totalDurationMin: Math.round(travelDurationSeconds / 60),
        geometry,
      };
    });

    const totalDistanceKm = round2(routes.reduce((sum, r) => sum + r.totalDistanceKm, 0));
    const totalDurationMin = routes.reduce((max, r) => Math.max(max, r.totalDurationMin), 0);
    const unassignedPharmacyIds = (json.skippedShipments ?? [])
      .map((s) => stops[s.index]?.pharmacyId)
      .filter((id): id is string => Boolean(id));

    return { routes, totalDistanceKm, totalDurationMin, violationsCount, unassignedPharmacyIds };
  },
};
