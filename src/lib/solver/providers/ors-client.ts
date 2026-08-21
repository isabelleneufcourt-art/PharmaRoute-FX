/**
 * Client pour l'API Matrix d'OpenRouteService (https://openrouteservice.org).
 * Renvoie une matrice de distances/durées calculées sur le réseau routier
 * réel (profil "driving-car"), Belgique incluse — utilisée en entrée de
 * l'heuristique VRPTW partagée à la place des distances Haversine simulées.
 */

const ORS_MATRIX_URL = "https://api.openrouteservice.org/v2/matrix/driving-car";
const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

export interface OrsPoint {
  lat: number;
  lng: number;
}

export interface OrsMatrix {
  /** distanceKm[i][j] : distance routière entre points[i] et points[j] */
  distanceKm: number[][];
  /** durationMin[i][j] : durée de trajet routier entre points[i] et points[j] */
  durationMin: number[][];
}

export async function fetchOrsMatrix(points: OrsPoint[], apiKey: string): Promise<OrsMatrix> {
  const response = await fetch(ORS_MATRIX_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locations: points.map((p) => [p.lng, p.lat]),
      metrics: ["distance", "duration"],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouteService Matrix API a répondu ${response.status} : ${body.slice(0, 300) || response.statusText}`
    );
  }

  const json = await response.json();
  if (!Array.isArray(json?.distances) || !Array.isArray(json?.durations)) {
    throw new Error("Réponse OpenRouteService Matrix API invalide (distances/durations manquantes)");
  }

  return {
    distanceKm: json.distances.map((row: number[]) => row.map((meters) => meters / 1000)),
    durationMin: json.durations.map((row: number[]) => row.map((seconds) => seconds / 60)),
  };
}

/**
 * Récupère le tracé réel (suit le réseau routier) reliant une suite ordonnée
 * de points, via l'API Directions d'OpenRouteService. Retourne des points
 * [lat, lng], prêts à afficher sur la carte Leaflet.
 */
export async function fetchOrsRouteGeometry(
  orderedPoints: OrsPoint[],
  apiKey: string
): Promise<[number, number][]> {
  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify({
      coordinates: orderedPoints.map((p) => [p.lng, p.lat]),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouteService Directions API a répondu ${response.status} : ${body.slice(0, 300) || response.statusText}`
    );
  }

  const json = await response.json();
  const coordinates: [number, number][] | undefined = json?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) {
    throw new Error("Réponse OpenRouteService Directions API invalide (géométrie manquante)");
  }

  // GeoJSON fournit [lng, lat] ; on repasse en [lat, lng] pour Leaflet.
  return coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
}
