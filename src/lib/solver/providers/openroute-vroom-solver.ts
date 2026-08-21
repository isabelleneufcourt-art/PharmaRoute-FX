/**
 * Solver "OpenRouteService / VROOM" : bascule automatiquement vers des
 * trajets routiers réels dès qu'une des deux configurations est présente
 * dans .env.
 *
 *  - VROOM_API_URL configuré → priorité à VROOM, qui résout lui-même le
 *    VRPTW complet (meilleure qualité, fenêtres horaires strictes).
 *  - Sinon, ORS_API_KEY configuré → matrice de distances/durées réelles via
 *    OpenRouteService, combinée à l'heuristique VRPTW interne.
 *  - Sinon → non configuré (voir `isConfigured`/`configurationHint`).
 */

import { runHeuristic, type DistanceFn, type EnginePoint } from "../heuristic-engine";
import type { SolverInput, SolverResult, VrptwSolver } from "../types";
import { fetchOrsMatrix } from "./ors-client";
import { solveWithVroom } from "./vroom-client";

function vroomUrl(): string | undefined {
  const url = process.env.VROOM_API_URL?.trim();
  return url ? url : undefined;
}

function orsApiKey(): string | undefined {
  const key = process.env.ORS_API_KEY?.trim();
  return key ? key : undefined;
}

async function solveWithOrsMatrix(input: SolverInput, apiKey: string): Promise<SolverResult> {
  const points: EnginePoint[] = [input.depot, ...input.stops];
  const matrix = await fetchOrsMatrix(points, apiKey);

  const indexByPoint = new Map<EnginePoint, number>();
  points.forEach((point, index) => indexByPoint.set(point, index));

  const dist: DistanceFn = (a, b) => {
    const i = indexByPoint.get(a);
    const j = indexByPoint.get(b);
    if (i === undefined || j === undefined) {
      throw new Error("Point inconnu de la matrice OpenRouteService");
    }
    return { distanceKm: matrix.distanceKm[i][j], durationMin: matrix.durationMin[i][j] };
  };

  return runHeuristic(input, dist);
}

export const openRouteVroomSolver: VrptwSolver = {
  id: "OPENROUTE_VROOM",
  label: "OpenRouteService / VROOM",

  isConfigured: () => Boolean(vroomUrl() || orsApiKey()),

  configurationHint: () =>
    "Configurez VROOM_API_URL (instance VROOM auto-hébergée) ou ORS_API_KEY (clé OpenRouteService, gratuite sur openrouteservice.org) dans .env pour utiliser des trajets routiers réels.",

  async solve(input: SolverInput): Promise<SolverResult> {
    const url = vroomUrl();
    if (url) return solveWithVroom(input, url);

    const apiKey = orsApiKey();
    if (apiKey) return solveWithOrsMatrix(input, apiKey);

    throw new Error("Aucun fournisseur OpenRouteService/VROOM configuré (ORS_API_KEY ou VROOM_API_URL).");
  },
};
