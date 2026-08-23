/**
 * Diagnostic du bandeau de suggestion de retard (écran Résultats) : la suggestion
 * « Avancer le départ » ne peut aider que si RIEN, avant l'arrêt en retard, n'oblige
 * déjà le véhicule à patienter jusqu'à l'ouverture d'un créneau. Si un arrêt plus tôt
 * dans la même tournée est déjà "callé" sur l'heure d'ouverture de son créneau (le
 * véhicule y arrive avant l'ouverture et attend), toute avance de l'heure de départ
 * est intégralement absorbée par cette attente : elle ne fait reculer aucun arrêt
 * suivant, et donc jamais l'arrêt en retard. Un départ plus tôt ne peut alors
 * strictement rien changer, quel que soit le nombre de tentatives.
 */

interface DelayDiagnosisStop {
  sequence: number;
  etaArrival: string;
  scheduledWindowStart: string | null;
  withinTimeWindow: boolean;
  pharmacy: { name: string };
}

interface DelayDiagnosisRoute {
  stops: DelayDiagnosisStop[];
}

export interface DepartureShiftBlocker {
  /** Nom de la pharmacie dont l'arrêt "bloque" (le véhicule y attend déjà l'ouverture). */
  pharmacyName: string;
  /** Heure d'ouverture du créneau sur laquelle cet arrêt est callé. */
  windowStart: string;
}

/**
 * Cherche, parmi les tournées, un arrêt qui bloque l'effet d'un départ avancé sur au
 * moins une livraison en retard : un arrêt antérieur (même tournée) déjà en attente
 * de l'ouverture de son créneau. Retourne `null` si aucun blocage de ce type n'est
 * détecté (le départ avancé a alors de bonnes chances d'aider).
 */
export function findDepartureShiftBlocker(
  routes: DelayDiagnosisRoute[]
): DepartureShiftBlocker | null {
  for (const route of routes) {
    const stops = [...route.stops].sort((a, b) => a.sequence - b.sequence);
    const firstViolationIndex = stops.findIndex((s) => !s.withinTimeWindow);
    // Pas de retard sur cette tournée, ou le tout premier arrêt est déjà celui en
    // retard (rien d'antérieur ne peut le bloquer) : rien à signaler ici.
    if (firstViolationIndex <= 0) continue;

    for (let i = 0; i < firstViolationIndex; i++) {
      const stop = stops[i];
      if (stop.scheduledWindowStart && stop.etaArrival === stop.scheduledWindowStart) {
        return { pharmacyName: stop.pharmacy.name, windowStart: stop.scheduledWindowStart };
      }
    }
  }
  return null;
}
