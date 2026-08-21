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
 *
 * Dans les deux cas, le tracé réel de chaque tournée (suit le réseau
 * routier) est récupéré pour l'affichage sur la carte — voir `geometry` sur
 * chaque `SolverRouteResult`. Un échec de récupération de géométrie (quota,
 * requête invalide…) ne fait pas échouer l'optimisation : la tournée reste
 * valide, simplement sans tracé détaillé (repli sur un trait direct).
 */

import { runHeuristic, type DistanceFn, type EnginePoint } from "../heuristic-engine";
import type { SolverInput, SolverResult, SolverRouteResult, SolverStop, VrptwSolver } from "../types";
import { fetchOrsMatrix, fetchOrsRouteGeometry, type OrsPoint } from "./ors-client";
import { solveWithVroom } from "./vroom-client";

function vroomUrl(): string | undefined {
  const url = process.env.VROOM_API_URL?.trim();
  return url ? url : undefined;
}

function orsApiKey(): string | undefined {
  const key = process.env.ORS_API_KEY?.trim();
  return key ? key : undefined;
}

/** Récupère et attache le tracé réel de chaque tournée non vide, via l'API Directions ORS. */
async function attachOrsGeometries(
  routes: SolverRouteResult[],
  depot: OrsPoint,
  stopsById: Map<string, SolverStop>,
  apiKey: string
): Promise<SolverRouteResult[]> {
  return Promise.all(
    routes.map(async (route) => {
      if (route.stops.length === 0) return route;

      const orderedPoints: OrsPoint[] = [
        depot,
        ...route.stops.map((s) => stopsById.get(s.pharmacyId)!),
        depot,
      ];

      try {
        const geometry = await fetchOrsRouteGeometry(orderedPoints, apiKey);
        return { ...route, geometry };
      } catch (error) {
        console.warn(
          `[openroute-vroom-solver] Tracé indisponible pour le véhicule ${route.vehicleIndex + 1} :`,
          error instanceof Error ? error.message : error
        );
        return route;
      }
    })
  );
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

  const result = runHeuristic(input, dist);

  const stopsById = new Map(input.stops.map((s) => [s.pharmacyId, s]));
  const routes = await attachOrsGeometries(result.routes, input.depot, stopsById, apiKey);

  return { ...result, routes };
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
