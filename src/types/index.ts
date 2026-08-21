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
