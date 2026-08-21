/**
 * Décodage du format "Encoded Polyline Algorithm Format" (utilisé par
 * OSRM/VROOM et par Google) — chaîne compacte représentant une suite de
 * points [lat, lng].
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/**
 * Vérifie que des coordonnées décodées sont géographiquement plausibles.
 * Sert de garde-fou : si la précision réelle du polyline diffère de celle
 * supposée au décodage (5 est le standard OSRM/Google, mais certaines
 * configurations utilisent 6), les valeurs obtenues sortent largement des
 * bornes valides — on préfère alors ignorer la géométrie plutôt que
 * d'afficher un tracé incohérent.
 */
export function isPlausibleRouteGeometry(coordinates: [number, number][]): boolean {
  if (coordinates.length === 0) return false;
  return coordinates.every(
    ([lat, lng]) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}
