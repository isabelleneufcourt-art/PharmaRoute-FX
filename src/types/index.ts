import type {
  Depot,
  Pharmacy,
  PharmacyTimeWindow,
  Prisma,
  TourTemplate,
  User,
} from "@/generated/prisma/client";

export type { Depot, Pharmacy, PharmacyTimeWindow, TourTemplate, User };

/** Utilisateur chauffeur, tel qu'exposé au dispatcher pour l'assignation de tournées. */
export type DriverOption = Pick<User, "id" | "name" | "email">;

/** Pharmacie avec sa grille hebdomadaire complète de créneaux (Lundi-Samedi) et son dépôt d'affectation. */
export type PharmacyWithTimeWindows = Pharmacy & {
  timeWindows: PharmacyTimeWindow[];
  depot: Depot | null;
};

/** Dépôt avec le nombre de pharmacies qui lui sont affectées. */
export type DepotWithPharmacyCount = Depot & { _count: { pharmacies: number } };

/** Tournée type (plan de transport récurrent/théorique) telle qu'inscrite sur la fiche pharmacie. */
export type PharmacyTourMembership = {
  sequence: number;
  tourTemplate: Pick<TourTemplate, "id" | "code" | "name" | "period" | "isActive">;
};

/** Pharmacie avec sa grille hebdomadaire, son dépôt, et les tournées types auxquelles elle appartient. */
export type PharmacyDetail = PharmacyWithTimeWindows & {
  tourStops: PharmacyTourMembership[];
};

export type TourTemplateStopWithPharmacy = {
  id: string;
  sequence: number;
  pharmacy: Pharmacy;
};

/** Tournée type avec ses arrêts (pharmacies + ordre théorique), pour la carte et le formulaire. */
export type TourTemplateWithStops = TourTemplate & {
  depot: Depot;
  stops: TourTemplateStopWithPharmacy[];
};

/** Tournée type telle que renvoyée par la liste : arrêts complets + compteur + charge théorique. */
export type TourTemplateWithStopCount = TourTemplateWithStops & {
  _count: { stops: number };
  /** Somme des `bacsCount` des pharmacies incluses (charge théorique). */
  totalBacs: number;
};

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
