import { internalSolver } from "./internal-solver";
import type { SolverProviderId, VrptwSolver } from "./types";

export * from "./types";
export { getRouteColor, ROUTE_COLORS } from "./colors";

/**
 * Sélectionne l'implémentation de solver VRPTW à utiliser.
 *
 * GOOGLE_ROUTE_OPTIMIZATION et OPENROUTE_VROOM sont prévus dans le modèle de
 * données et l'interface `VrptwSolver`, mais nécessitent une clé API /
 * un endpoint à configurer (voir `.env.example`). Tant qu'ils ne sont pas
 * branchés, on retombe sur la simulation interne pour que l'optimisation
 * reste toujours disponible.
 */
export function getSolver(provider: SolverProviderId): VrptwSolver {
  switch (provider) {
    case "INTERNAL":
      return internalSolver;
    case "GOOGLE_ROUTE_OPTIMIZATION":
    case "OPENROUTE_VROOM":
      return internalSolver;
    default:
      return internalSolver;
  }
}
