interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Distance à vol d'oiseau (km) entre deux points, formule de Haversine. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Facteur de circuité appliqué à la distance à vol d'oiseau pour approcher
 * une distance routière réaliste (routes urbaines/suburbaines belges), en
 * l'absence d'un moteur de routing réel (VROOM, Google Routes…).
 */
const ROAD_DETOUR_FACTOR = 1.3;

/** Distance routière simulée (km) entre deux points. */
export function roadDistanceKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * ROAD_DETOUR_FACTOR;
}

/** Temps de trajet (minutes) pour une distance donnée à une vitesse moyenne (km/h). */
export function travelTimeMinutes(distanceKm: number, averageSpeedKmh: number): number {
  return (distanceKm / averageSpeedKmh) * 60;
}

/**
 * Cap (relèvement, en degrés 0-360) du point `to` vu depuis `from`, utilisé
 * pour trier les arrêts angulairement autour du dépôt (algorithme du balayage).
 */
export function bearingFromDepot(from: LatLng, to: LatLng): number {
  const dLat = to.lat - from.lat;
  const dLng = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180);
  let angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}
