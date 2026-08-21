/**
 * Client pour un serveur VROOM (https://github.com/VROOM-Project/vroom).
 * Contrairement à l'heuristique interne, VROOM résout lui-même le VRPTW
 * complet (bin packing, séquencement, fenêtres horaires strictes) à partir
 * des coordonnées brutes — il calcule sa propre matrice routière réelle via
 * le routeur configuré côté serveur (OSRM par défaut).
 *
 * Les fenêtres horaires sont des contraintes strictes chez VROOM : un arrêt
 * impossible à satisfaire par aucun véhicule est renvoyé dans `unassigned`
 * plutôt que d'être planifié en retard.
 */

import type { SolverInput, SolverResult, SolverRouteResult, SolverStopResult } from "../types";

interface VroomStep {
  type: "start" | "end" | "job" | "pickup" | "delivery" | "break";
  id?: number;
  arrival?: number;
  duration?: number;
  distance?: number;
}

interface VroomRoute {
  vehicle: number;
  steps: VroomStep[];
}

interface VroomResponse {
  code: number;
  error?: string;
  routes?: VroomRoute[];
  unassigned?: { id: number }[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function solveWithVroom(input: SolverInput, vroomUrl: string): Promise<SolverResult> {
  const { depot, stops, vehicleCount, departureTimeMinutes } = input;

  if (stops.length === 0 || vehicleCount <= 0) {
    return { routes: [], totalDistanceKm: 0, totalDurationMin: 0, violationsCount: 0 };
  }

  // VROOM exige des identifiants entiers positifs : on fait le lien avec nos pharmacyId (chaînes).
  const jobIdToPharmacyId = new Map<number, string>();
  const jobs = stops.map((stop, index) => {
    const jobId = index + 1;
    jobIdToPharmacyId.set(jobId, stop.pharmacyId);
    return {
      id: jobId,
      location: [stop.lng, stop.lat],
      service: Math.round(stop.serviceTimeMinutes * 60),
      time_windows: [[Math.round(stop.timeWindowStart * 60), Math.round(stop.timeWindowEnd * 60)]],
    };
  });

  const departureSec = Math.round(departureTimeMinutes * 60);
  // Fenêtre véhicule large (16h après le départ) pour ne pas contraindre artificiellement
  // le retour au dépôt — seules les fenêtres des pharmacies sont réellement significatives.
  const vehicles = Array.from({ length: vehicleCount }, (_, i) => ({
    id: i,
    start: [depot.lng, depot.lat],
    end: [depot.lng, depot.lat],
    time_window: [departureSec, departureSec + 16 * 3600],
  }));

  const response = await fetch(vroomUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicles, jobs }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`VROOM a répondu ${response.status} : ${body.slice(0, 300) || response.statusText}`);
  }

  const json: VroomResponse = await response.json();
  if (json.code !== 0) {
    throw new Error(`VROOM a retourné une erreur (code ${json.code}) : ${json.error ?? "inconnue"}`);
  }

  const routeByVehicle = new Map<number, VroomRoute>();
  for (const route of json.routes ?? []) routeByVehicle.set(route.vehicle, route);

  let violationsCount = 0;
  const routes: SolverRouteResult[] = vehicles.map((vehicle) => {
    const vroomRoute = routeByVehicle.get(vehicle.id);
    if (!vroomRoute) {
      return { vehicleIndex: vehicle.id, stops: [], totalDistanceKm: 0, totalDurationMin: 0 };
    }

    let prevDistance = 0;
    let prevDuration = 0;
    let sequence = 0;
    const stopResults: SolverStopResult[] = [];

    for (const step of vroomRoute.steps) {
      if (step.type !== "job" || step.id === undefined) {
        prevDistance = step.distance ?? prevDistance;
        prevDuration = step.duration ?? prevDuration;
        continue;
      }

      const pharmacyId = jobIdToPharmacyId.get(step.id);
      const stopInput = stops.find((s) => s.pharmacyId === pharmacyId);
      if (!pharmacyId || !stopInput) continue;

      sequence += 1;
      const arrivalMinutes = (step.arrival ?? 0) / 60;
      const departureMinutes = arrivalMinutes + stopInput.serviceTimeMinutes;
      const withinTimeWindow = (step.arrival ?? 0) <= stopInput.timeWindowEnd * 60;
      const distanceKm = ((step.distance ?? prevDistance) - prevDistance) / 1000;
      const durationMin = ((step.duration ?? prevDuration) - prevDuration) / 60;

      if (!withinTimeWindow) violationsCount += 1;

      stopResults.push({
        pharmacyId,
        sequence,
        etaArrivalMinutes: Math.round(arrivalMinutes),
        etaDepartureMinutes: Math.round(departureMinutes),
        withinTimeWindow,
        distanceFromPrevKm: round2(distanceKm),
        durationFromPrevMin: Math.round(durationMin),
      });

      prevDistance = step.distance ?? prevDistance;
      prevDuration = step.duration ?? prevDuration;
    }

    const lastStep = vroomRoute.steps[vroomRoute.steps.length - 1];
    return {
      vehicleIndex: vehicle.id,
      stops: stopResults,
      totalDistanceKm: round2((lastStep?.distance ?? 0) / 1000),
      totalDurationMin: Math.round((lastStep?.duration ?? 0) / 60),
    };
  });

  const totalDistanceKm = round2(routes.reduce((sum, r) => sum + r.totalDistanceKm, 0));
  const totalDurationMin = routes.reduce((max, r) => Math.max(max, r.totalDurationMin), 0);
  const unassignedPharmacyIds = (json.unassigned ?? [])
    .map((u) => jobIdToPharmacyId.get(u.id))
    .filter((id): id is string => Boolean(id));

  return { routes, totalDistanceKm, totalDurationMin, violationsCount, unassignedPharmacyIds };
}
