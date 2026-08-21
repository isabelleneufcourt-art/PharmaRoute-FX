import { internalSolver } from "./internal-solver";
import { googleRouteOptimizationSolver } from "./providers/google-route-optimization-solver";
import { openRouteVroomSolver } from "./providers/openroute-vroom-solver";
import type { SolverProviderId, VrptwSolver } from "./types";

export * from "./types";
export { getRouteColor, ROUTE_COLORS } from "./colors";
export { SOLVER_PROVIDER_LABELS } from "./labels";

const SOLVERS: Record<SolverProviderId, VrptwSolver> = {
  INTERNAL: internalSolver,
  OPENROUTE_VROOM: openRouteVroomSolver,
  GOOGLE_ROUTE_OPTIMIZATION: googleRouteOptimizationSolver,
};

/** Sélectionne l'implémentation de solver VRPTW à utiliser. */
export function getSolver(provider: SolverProviderId): VrptwSolver {
  return SOLVERS[provider] ?? internalSolver;
}

/** État de configuration de chaque fournisseur, pour l'UI (écran Optimisation). */
export function getSolverAvailability(): Record<SolverProviderId, { configured: boolean; hint: string }> {
  const entries = (Object.keys(SOLVERS) as SolverProviderId[]).map((id) => {
    const solver = SOLVERS[id];
    return [id, { configured: solver.isConfigured(), hint: solver.configurationHint() }] as const;
  });
  return Object.fromEntries(entries) as Record<SolverProviderId, { configured: boolean; hint: string }>;
}
