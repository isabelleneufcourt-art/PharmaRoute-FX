import type { Depot, Pharmacy, PharmacyTimeWindow, Prisma, User } from "@/generated/prisma/client";

export type { Depot, Pharmacy, PharmacyTimeWindow, User };

/** Utilisateur chauffeur, tel qu'exposé au dispatcher pour l'assignation de tournées. */
export type DriverOption = Pick<User, "id" | "name" | "email">;

/** Pharmacie avec sa grille hebdomadaire complète de créneaux (Lundi-Samedi). */
export type PharmacyWithTimeWindows = Pharmacy & { timeWindows: PharmacyTimeWindow[] };

export type OptimizationWithRoutes = Prisma.OptimizationGetPayload<{
  include: {
    depot: true;
    routes: {
      include: {
        driver: true;
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
