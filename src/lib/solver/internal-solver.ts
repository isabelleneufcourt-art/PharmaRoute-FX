/**
 * Solver VRPTW interne (simulation).
 *
 * Toujours disponible, sans configuration : utilisé par défaut, et comme
 * repli documenté quand aucun fournisseur externe n'est configuré. Calcule
 * des distances/durées simulées (Haversine × facteur de circuité, vitesse
 * moyenne) puis délègue à l'heuristique VRPTW partagée (balayage + plus
 * proche voisin + 2-opt + chronologie) — voir `heuristic-engine.ts`.
 */

import { roadDistanceKm, travelTimeMinutes } from "./geometry";
import { runHeuristic, type DistanceFn } from "./heuristic-engine";
import type { SolverInput, SolverResult, VrptwSolver } from "./types";

const DEFAULT_AVERAGE_SPEED_KMH = 28;

export const internalSolver: VrptwSolver = {
  id: "INTERNAL",
  label: "Simulation interne",
  isConfigured: () => true,
  configurationHint: () => "",

  async solve(input: SolverInput): Promise<SolverResult> {
    const averageSpeedKmh = input.averageSpeedKmh ?? DEFAULT_AVERAGE_SPEED_KMH;
    const dist: DistanceFn = (a, b) => {
      const distanceKm = roadDistanceKm(a, b);
      return { distanceKm, durationMin: travelTimeMinutes(distanceKm, averageSpeedKmh) };
    };
    return runHeuristic(input, dist);
  },
};
