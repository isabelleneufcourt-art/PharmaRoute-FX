/** Utilitaires de conversion d'heures "HH:mm" ↔ minutes depuis minuit, utilisés par le solver VRPTW. */

/** Convertit "07:30" → 450 (minutes depuis minuit). */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Convertit un nombre de minutes depuis minuit → "07:30". Gère le dépassement de minuit (mod 24h). */
export function minutesToTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Ajoute (ou retire) un nombre de minutes à une heure "HH:mm". */
export function addMinutesToTime(time: string, delta: number): string {
  return minutesToTime(parseTimeToMinutes(time) + delta);
}

/** Formate une durée en minutes en "1h25" (ou "45 min" si < 1h). */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h${String(remainder).padStart(2, "0")}`;
}
