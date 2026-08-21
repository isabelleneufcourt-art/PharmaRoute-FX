/**
 * Géocodage approximatif des codes postaux belges.
 *
 * PharmaRoute FX n'utilise pas encore d'API de géocodage externe : cette
 * fonction attribue à chaque adresse une position déterministe et
 * géographiquement plausible, dérivée de la zone postale (province) et
 * d'une empreinte de l'adresse. Elle sert de solution de repli tant qu'une
 * pharmacie ou le dépôt n'a pas de latitude/longitude connue, afin que la
 * carte et le solver VRPTW disposent toujours de coordonnées exploitables.
 *
 * À remplacer par un vrai géocodeur (Google Geocoding, Nominatim/OSM…) en
 * gardant la même signature `{ postalCode, address } -> { lat, lng }`.
 */

interface PostalZone {
  minPrefix: number;
  maxPrefix: number;
  label: string;
  center: { lat: number; lng: number };
  /** Rayon approximatif (km) de dispersion des points au sein de la zone. */
  radiusKm: number;
}

// Zones dérivées de la structure réelle des codes postaux belges par province.
const POSTAL_ZONES: PostalZone[] = [
  { minPrefix: 10, maxPrefix: 12, label: "Bruxelles-Capitale", center: { lat: 50.8503, lng: 4.3517 }, radiusKm: 7 },
  { minPrefix: 13, maxPrefix: 14, label: "Brabant wallon", center: { lat: 50.67, lng: 4.6 }, radiusKm: 14 },
  { minPrefix: 15, maxPrefix: 19, label: "Brabant flamand (nord)", center: { lat: 50.95, lng: 4.35 }, radiusKm: 18 },
  { minPrefix: 20, maxPrefix: 29, label: "Anvers", center: { lat: 51.22, lng: 4.4 }, radiusKm: 22 },
  { minPrefix: 30, maxPrefix: 34, label: "Brabant flamand (Louvain)", center: { lat: 50.88, lng: 4.7 }, radiusKm: 14 },
  { minPrefix: 35, maxPrefix: 39, label: "Limbourg", center: { lat: 50.93, lng: 5.34 }, radiusKm: 22 },
  { minPrefix: 40, maxPrefix: 49, label: "Liège", center: { lat: 50.63, lng: 5.57 }, radiusKm: 28 },
  { minPrefix: 50, maxPrefix: 59, label: "Namur", center: { lat: 50.47, lng: 4.87 }, radiusKm: 28 },
  { minPrefix: 60, maxPrefix: 65, label: "Hainaut (Charleroi)", center: { lat: 50.41, lng: 4.44 }, radiusKm: 18 },
  { minPrefix: 66, maxPrefix: 69, label: "Luxembourg", center: { lat: 49.93, lng: 5.5 }, radiusKm: 28 },
  { minPrefix: 70, maxPrefix: 79, label: "Hainaut (Mons/Tournai)", center: { lat: 50.45, lng: 3.75 }, radiusKm: 24 },
  { minPrefix: 80, maxPrefix: 89, label: "Flandre occidentale", center: { lat: 51.05, lng: 3.05 }, radiusKm: 24 },
  { minPrefix: 90, maxPrefix: 99, label: "Flandre orientale", center: { lat: 51.05, lng: 3.85 }, radiusKm: 24 },
];

const BELGIUM_FALLBACK_CENTER = { lat: 50.5039, lng: 4.4699 };

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function findZone(postalCode: string): PostalZone | null {
  const prefix = Number(postalCode.slice(0, 2));
  if (Number.isNaN(prefix)) return null;
  return POSTAL_ZONES.find((zone) => prefix >= zone.minPrefix && prefix <= zone.maxPrefix) ?? null;
}

export interface ApproxCoordinates {
  lat: number;
  lng: number;
}

/**
 * Retourne une position déterministe et plausible pour une adresse belge,
 * basée sur son code postal (± dispersion pseudo-aléatoire mais stable).
 */
export function approximateBelgianCoordinates(
  postalCode: string,
  seed = ""
): ApproxCoordinates {
  const zone = findZone(postalCode);
  const center = zone?.center ?? BELGIUM_FALLBACK_CENTER;
  const radiusKm = zone?.radiusKm ?? 30;

  const hash = hashString(`${postalCode}|${seed}`);
  const angleRad = (hash % 360) * (Math.PI / 180);
  const distanceFraction = (Math.floor(hash / 360) % 1000) / 1000; // 0..1, répartition dans le rayon de la zone
  const distanceKm = distanceFraction * radiusKm;

  const dLat = (distanceKm / 111) * Math.sin(angleRad);
  const dLng =
    (distanceKm / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.cos(angleRad);

  return {
    lat: Number((center.lat + dLat).toFixed(6)),
    lng: Number((center.lng + dLng).toFixed(6)),
  };
}
