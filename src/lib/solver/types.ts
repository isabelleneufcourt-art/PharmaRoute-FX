/**
 * Interface générique de solver VRPTW.
 *
 * Toute implémentation (simulation interne, Google Route Optimization API,
 * OpenRouteService / VROOM…) consomme un `SolverInput` et retourne un
 * `SolverResult` normalisé, indépendant du fournisseur. Cela permet de
 * brancher un vrai solver externe plus tard sans changer le reste de
 * l'application (routes API, persistance, UI).
 */

export interface SolverDepot {
  lat: number;
  lng: number;
}

export interface SolverStop {
  pharmacyId: string;
  lat: number;
  lng: number;
  /** Nombre de bacs à livrer (utilisé pour équilibrer la charge entre véhicules). */
  demand: number;
  /** Temps de déchargement fixe sur place, en minutes. */
  serviceTimeMinutes: number;
  /** Fenêtre horaire de livraison autorisée, en minutes depuis minuit. */
  timeWindowStart: number;
  timeWindowEnd: number;
}

export interface SolverInput {
  depot: SolverDepot;
  stops: SolverStop[];
  vehicleCount: number;
  /** Heure de départ du dépôt, en minutes depuis minuit. */
  departureTimeMinutes: number;
  /** Vitesse moyenne simulée (km/h), pour convertir distance → durée. */
  averageSpeedKmh?: number;
}

export interface SolverStopResult {
  pharmacyId: string;
  /** Position dans la tournée (1 = premier arrêt après le dépôt). */
  sequence: number;
  etaArrivalMinutes: number;
  etaDepartureMinutes: number;
  /** La livraison a-t-elle lieu dans la fenêtre horaire de la pharmacie ? */
  withinTimeWindow: boolean;
  distanceFromPrevKm: number;
  durationFromPrevMin: number;
}

export interface SolverRouteResult {
  vehicleIndex: number;
  stops: SolverStopResult[];
  /** Distance totale de la tournée, retour au dépôt inclus. */
  totalDistanceKm: number;
  /** Durée totale de la tournée, retour au dépôt inclus. */
  totalDurationMin: number;
}

export interface SolverResult {
  routes: SolverRouteResult[];
  totalDistanceKm: number;
  /** Durée de la tournée la plus longue (= heure de fin de la dernière tournée). */
  totalDurationMin: number;
  /** Nombre d'arrêts dont la fenêtre horaire n'a pas été respectée. */
  violationsCount: number;
  /**
   * Pharmacies qu'un solver à contraintes strictes (ex: VROOM) n'a pas pu
   * intégrer à aucune tournée sans violer une fenêtre horaire. Vide pour les
   * solvers qui assignent systématiquement tous les arrêts (INTERNAL,
   * OpenRouteService via l'heuristique interne).
   */
  unassignedPharmacyIds?: string[];
}

export type SolverProviderId = "INTERNAL" | "GOOGLE_ROUTE_OPTIMIZATION" | "OPENROUTE_VROOM";

export interface VrptwSolver {
  readonly id: SolverProviderId;
  readonly label: string;
  /** Le fournisseur dispose-t-il de la configuration requise (clé API, endpoint…) ? */
  isConfigured(): boolean;
  /** Message expliquant comment configurer ce fournisseur, affiché s'il n'est pas prêt. */
  configurationHint(): string;
  solve(input: SolverInput): Promise<SolverResult>;
}

/** Erreur levée quand un solver externe n'est pas configuré (clé API / endpoint manquant). */
export class SolverConfigurationError extends Error {}
