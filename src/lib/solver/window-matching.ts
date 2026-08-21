import type { SolverTimeWindow } from "./types";

/**
 * Détermine, parmi les créneaux ouverts ce jour-là (triés par heure de
 * début), celui à utiliser pour une arrivée donnée :
 *  - arrivée dans un créneau (ou avant son ouverture) → livraison dans ce
 *    créneau, en patientant si besoin jusqu'à son ouverture ;
 *  - arrivée après la fin de tous les créneaux → retard, on retient le
 *    dernier créneau du jour comme référence pour l'affichage.
 *
 * Partagé par l'heuristique interne et les connecteurs externes (VROOM,
 * Google) pour déterminer/afficher quel créneau (matin/après-midi) a été
 * effectivement utilisé pour chaque livraison.
 */
export function resolveDeliveryWindow(
  arrivalMinutes: number,
  windows: SolverTimeWindow[]
): { serviceStart: number; withinTimeWindow: boolean; matched: SolverTimeWindow } {
  for (const window of windows) {
    if (arrivalMinutes <= window.endMinutes) {
      return {
        serviceStart: Math.max(arrivalMinutes, window.startMinutes),
        withinTimeWindow: true,
        matched: window,
      };
    }
  }
  const last = windows[windows.length - 1];
  return { serviceStart: arrivalMinutes, withinTimeWindow: false, matched: last };
}
