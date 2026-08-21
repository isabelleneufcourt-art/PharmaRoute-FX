/**
 * Cœur de l'heuristique VRPTW (balayage angulaire + plus proche voisin + 2-opt
 * + simulation de chronologie), partagé par tous les solvers qui n'effectuent
 * pas leur propre optimisation complète (contrairement à VROOM, qui résout
 * lui-même le problème). Seule la façon d'obtenir la distance/durée entre
 * deux points varie selon le fournisseur : Haversine simulée pour le solver
 * interne, matrice routière réelle pour OpenRouteService.
 */

import { bearingFromDepot } from "./geometry";
import type {
  SolverDepot,
  SolverInput,
  SolverResult,
  SolverRouteResult,
  SolverStop,
  SolverStopResult,
} from "./types";
import { resolveDeliveryWindow } from "./window-matching";

export interface EnginePoint {
  lat: number;
  lng: number;
}

/** Distance (km) et durée (min) de trajet entre deux points, quelle qu'en soit la source. */
export type DistanceFn = (a: EnginePoint, b: EnginePoint) => { distanceKm: number; durationMin: number };

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
function nearestNeighborOrder(depot: SolverDepot, stops: SolverStop[], dist: DistanceFn): SolverStop[] {
  const remaining = [...stops];
  const ordered: SolverStop[] = [];
  let current: EnginePoint = depot;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const { distanceKm } = dist(current, remaining[i]);
      if (distanceKm < bestDistance) {
        bestDistance = distanceKm;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function tourDistance(depot: SolverDepot, order: SolverStop[], dist: DistanceFn): number {
  const points: EnginePoint[] = [depot, ...order, depot];
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += dist(points[i], points[i + 1]).distanceKm;
  }
  return distance;
}

/** Amélioration locale 2-opt : échange de segments tant que la tournée (dépôt → arrêts → dépôt) raccourcit. */
function twoOptImprove(depot: SolverDepot, initialOrder: SolverStop[], dist: DistanceFn): SolverStop[] {
  if (initialOrder.length < 4) return initialOrder;

  let best = initialOrder;
  let bestDistance = tourDistance(depot, best, dist);
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
        const candidateDistance = tourDistance(depot, candidate, dist);
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
  dist: DistanceFn
): { stops: SolverStopResult[]; totalDistanceKm: number; totalDurationMin: number } {
  let currentLocation: EnginePoint = depot;
  let currentTime = departureTimeMinutes;
  let totalDistance = 0;

  const stops: SolverStopResult[] = order.map((stop, index) => {
    const { distanceKm, durationMin } = dist(currentLocation, stop);
    const arrival = currentTime + durationMin;
    // Le camion attend si nécessaire jusqu'à l'ouverture du créneau retenu.
    const { serviceStart, withinTimeWindow, matched } = resolveDeliveryWindow(arrival, stop.timeWindows);
    const departure = serviceStart + stop.serviceTimeMinutes;

    totalDistance += distanceKm;
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
      matchedPeriod: matched.period,
      matchedWindowStartMinutes: matched.startMinutes,
      matchedWindowEndMinutes: matched.endMinutes,
      distanceFromPrevKm: round2(distanceKm),
      durationFromPrevMin: Math.round(durationMin),
    };
  });

  // Retour au dépôt : compté dans le kilométrage/temps total de la tournée.
  const { distanceKm: returnDistanceKm, durationMin: returnDurationMin } = dist(currentLocation, depot);
  totalDistance += returnDistanceKm;
  const totalDurationMin = currentTime + returnDurationMin - departureTimeMinutes;

  return {
    stops,
    totalDistanceKm: round2(totalDistance),
    totalDurationMin: Math.round(totalDurationMin),
  };
}

/** Exécute l'heuristique complète (balayage + plus proche voisin + 2-opt + chronologie). */
export function runHeuristic(input: SolverInput, dist: DistanceFn): SolverResult {
  const { depot, stops, vehicleCount, departureTimeMinutes } = input;

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

    const nnOrder = nearestNeighborOrder(depot, bucket, dist);
    const optimizedOrder = twoOptImprove(depot, nnOrder, dist);
    const timeline = simulateTimeline(depot, optimizedOrder, departureTimeMinutes, dist);

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
}
