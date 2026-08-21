/** Palette de couleurs distinctes attribuées aux tournées (une par véhicule). */
export const ROUTE_COLORS = [
  "#2563eb", // bleu
  "#dc2626", // rouge
  "#16a34a", // vert
  "#d97706", // orange
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // rose
  "#65a30d", // vert olive
  "#ea580c", // orange foncé
  "#4f46e5", // indigo
];

export function getRouteColor(vehicleIndex: number): string {
  return ROUTE_COLORS[vehicleIndex % ROUTE_COLORS.length];
}
