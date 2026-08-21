import type { SolverProviderId } from "./types";

export const SOLVER_PROVIDER_LABELS: Record<SolverProviderId, string> = {
  INTERNAL: "Simulation interne",
  OPENROUTE_VROOM: "OpenRouteService / VROOM",
  GOOGLE_ROUTE_OPTIMIZATION: "Google Route Optimization",
};
