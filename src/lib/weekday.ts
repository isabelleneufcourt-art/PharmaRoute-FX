/**
 * Jours de livraison possibles pour le marché belge (Lundi → Samedi, jamais
 * le dimanche). Ordre utilisé partout où la grille hebdomadaire est
 * affichée (formulaire, import CSV, etc.).
 */
export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type WeekdayId = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayId, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
};

export const WEEKDAY_SHORT_LABELS: Record<WeekdayId, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mer",
  THURSDAY: "Jeu",
  FRIDAY: "Ven",
  SATURDAY: "Sam",
};

export const DELIVERY_PERIODS = ["MORNING", "AFTERNOON"] as const;
export type DeliveryPeriodId = (typeof DELIVERY_PERIODS)[number];

export const DELIVERY_PERIOD_LABELS: Record<DeliveryPeriodId, string> = {
  MORNING: "Matin",
  AFTERNOON: "Après-midi",
};

/**
 * Détermine le jour de livraison (Lundi-Samedi) correspondant à une date.
 * Retourne `null` pour un dimanche : le marché belge ne prévoit pas de
 * tournée ce jour-là.
 */
export function getWeekdayFromDate(date: Date): WeekdayId | null {
  // getUTCDay() plutôt que getDay() : évite tout décalage de fuseau horaire
  // puisque la date est construite/transportée en UTC (voir `parseDateOnly`).
  // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const jsDay = date.getUTCDay();
  if (jsDay === 0) return null;
  return WEEKDAYS[jsDay - 1];
}

/** Parse une date "YYYY-MM-DD" (issue d'un `<input type="date">`) en `Date` UTC stable. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formate une `Date` en "YYYY-MM-DD" pour un `<input type="date">` ou l'API. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
