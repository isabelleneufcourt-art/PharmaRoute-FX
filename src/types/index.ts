import type { Depot, Pharmacy, Prisma } from "@/generated/prisma/client";

export type { Depot, Pharmacy };

export type OptimizationWithRoutes = Prisma.OptimizationGetPayload<{
  include: {
    depot: true;
    routes: {
      include: {
        stops: {
          include: { pharmacy: true };
        };
      };
    };
  };
}>;

export type RouteWithStops = OptimizationWithRoutes["routes"][number];
export type RouteStopWithPharmacy = RouteWithStops["stops"][number];

/** Une tournée avec son optimisation/dépôt parents, pour la feuille de route chauffeur. */
export type RouteWithDetails = Prisma.RouteGetPayload<{
  include: {
    optimization: { include: { depot: true } };
    stops: { include: { pharmacy: true } };
  };
}>;
