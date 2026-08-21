/**
 * Solver VRPTW interne (simulation).
 *
 * En l'absence d'une API externe branchée (Google Route Optimization,
 * OpenRouteService/VROOM), PharmaRoute FX calcule des tournées réalistes
 * avec une heuristique classique en 3 étapes :
 *
 *  1. Balayage angulaire (sweep) : les pharmacies sont réparties entre
 *     véhicules par secteurs angulaires contigus autour du dépôt, équilibrés
 *     par charge (nombre de bacs). Ça évite les tournées qui se croisent.
 *  2. Construction par plus proche voisin, puis amélioration locale 2-opt
 *     pour réduire la distance totale de chaque tournée.
 *  3. Simulation de la chronologie (heure de départ → arrivées/départs
 *     successifs) pour calculer l'ETA de chaque arrêt et vérifier le
 *     respect de sa fenêtre horaire.
 */

import { bearingFromDepot, roadDistanceKm, travelTimeMinutes } from "./geometry";
import type {
  SolverDepot,
  SolverInput,
  SolverResult,
  SolverRouteResult,
  SolverStop,
  SolverStopResult,
  VrptwSolver,
} from "./types";

const DEFAULT_AVERAGE_SPEED_KMH = 28;
/** Plafond d'itérations du 2-opt par tournée, pour garder un calcul quasi instantané. */
const TWO_OPT_MAX_ITERATIONS = 400;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Répartit les arrêts (déjà triés angulairement) en `vehicleCount` secteurs contigus équilibrés en charge. */
function sweepAssign(sortedStops: SolverStop[], vehicleCount: number): SolverStop[][] {
  const buckets: SolverStop[][] = Array.from({ length: vehicleCount }, () => []);
  if (sortedStops.length === 0) return buckets;

  const totalDemand = sortedStops.reduce((sum, s) => sum + Math.max(s.demand, 1), 0);
  const targetPerVehicle = totalDemand / vehicleCount;

  let bucketIndex = 0;
  let currentLoad = 0;
  for (const stop of sortedStops) {
    if (bucketIndex < vehicleCount - 1 && currentLoad >= targetPerVehicle && buckets[bucketIndex].length > 0) {
      bucketIndex += 1;
      currentLoad = 0;
    }
    buckets[bucketIndex].push(stop);
    currentLoad += Math.max(stop.demand, 1);
  }
  return buckets;
}

/** Construction gloutonne par plus proche voisin, en partant du dépôt. */
function nearestNeighborOrder(depot: SolverDepot, stops: SolverStop[]): SolverStop[] {
  const remaining = [...stops];
  const ordered: SolverStop[] = [];
  let current: { lat: number; lng: number } = depot;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const distance = roadDistanceKm(current, remaining[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function tourDistance(depot: SolverDepot, order: SolverStop[]): number {
  const points = [depot, ...order, depot];
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += roadDistanceKm(points[i], points[i + 1]);
  }
  return distance;
}

/** Amélioration locale 2-opt : échange de segments tant que la tournée (dépôt → arrêts → dépôt) raccourcit. */
function twoOptImprove(depot: SolverDepot, initialOrder: SolverStop[]): SolverStop[] {
  if (initialOrder.length < 4) return initialOrder;

  let best = initialOrder;
  let bestDistance = tourDistance(depot, best);
  let iterations = 0;
  let improved = true;

  while (improved && iterations < TWO_OPT_MAX_ITERATIONS) {
    improved = false;
    outer: for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateDistance = tourDistance(depot, candidate);
        iterations += 1;
        if (candidateDistance < bestDistance - 1e-6) {
          best = candidate;
          bestDistance = candidateDistance;
          improved = true;
          break outer;
        }
        if (iterations >= TWO_OPT_MAX_ITERATIONS) break outer;
      }
    }
  }
  return best;
}

/** Simule la chronologie d'une tournée : ETA de chaque arrêt et respect des fenêtres horaires. */
function simulateTimeline(
  depot: SolverDepot,
  order: SolverStop[],
  departureTimeMinutes: number,
  averageSpeedKmh: number
): { stops: SolverStopResult[]; totalDistanceKm: number; totalDurationMin: number } {
  let currentLocation: { lat: number; lng: number } = depot;
  let currentTime = departureTimeMinutes;
  let totalDistance = 0;

  const stops: SolverStopResult[] = order.map((stop, index) => {
    const distance = roadDistanceKm(currentLocation, stop);
    const travelMinutes = travelTimeMinutes(distance, averageSpeedKmh);
    const arrival = currentTime + travelMinutes;
    // Le camion attend si nécessaire jusqu'à l'ouverture de la fenêtre.
    const serviceStart = Math.max(arrival, stop.timeWindowStart);
    const withinTimeWindow = arrival <= stop.timeWindowEnd;
    const departure = serviceStart + stop.serviceTimeMinutes;

    totalDistance += distance;
    currentTime = departure;
    currentLocation = stop;

    return {
      pharmacyId: stop.pharmacyId,
      sequence: index + 1,
      // Heure de livraison effective (le véhicule patiente si arrivé avant l'ouverture
      // du créneau) — c'est cette heure qui doit être communiquée à la pharmacie.
      etaArrivalMinutes: Math.round(serviceStart),
      etaDepartureMinutes: Math.round(departure),
      withinTimeWindow,
      distanceFromPrevKm: round2(distance),
      durationFromPrevMin: Math.round(travelMinutes),
    };
  });

  // Retour au dépôt : compté dans le kilométrage/temps total de la tournée.
  const returnDistance = roadDistanceKm(currentLocation, depot);
  const returnTravelMinutes = travelTimeMinutes(returnDistance, averageSpeedKmh);
  totalDistance += returnDistance;
  const totalDurationMin = currentTime + returnTravelMinutes - departureTimeMinutes;

  return {
    stops,
    totalDistanceKm: round2(totalDistance),
    totalDurationMin: Math.round(totalDurationMin),
  };
}

export const internalSolver: VrptwSolver = {
  id: "INTERNAL",

  async solve(input: SolverInput): Promise<SolverResult> {
    const { depot, stops, vehicleCount, departureTimeMinutes } = input;
    const averageSpeedKmh = input.averageSpeedKmh ?? DEFAULT_AVERAGE_SPEED_KMH;

    if (stops.length === 0 || vehicleCount <= 0) {
      return { routes: [], totalDistanceKm: 0, totalDurationMin: 0, violationsCount: 0 };
    }

    const sortedByBearing = [...stops].sort(
      (a, b) => bearingFromDepot(depot, a) - bearingFromDepot(depot, b)
    );
    const buckets = sweepAssign(sortedByBearing, vehicleCount);

    let violationsCount = 0;
    const routes: SolverRouteResult[] = buckets.map((bucket, vehicleIndex) => {
      if (bucket.length === 0) {
        return { vehicleIndex, stops: [], totalDistanceKm: 0, totalDurationMin: 0 };
      }

      const nnOrder = nearestNeighborOrder(depot, bucket);
      const optimizedOrder = twoOptImprove(depot, nnOrder);
      const timeline = simulateTimeline(depot, optimizedOrder, departureTimeMinutes, averageSpeedKmh);

      violationsCount += timeline.stops.filter((s) => !s.withinTimeWindow).length;

      return {
        vehicleIndex,
        stops: timeline.stops,
        totalDistanceKm: timeline.totalDistanceKm,
        totalDurationMin: timeline.totalDurationMin,
      };
    });

    const totalDistanceKm = round2(routes.reduce((sum, r) => sum + r.totalDistanceKm, 0));
    const totalDurationMin = routes.reduce((max, r) => Math.max(max, r.totalDurationMin), 0);

    return { routes, totalDistanceKm, totalDurationMin, violationsCount };
  },
};
