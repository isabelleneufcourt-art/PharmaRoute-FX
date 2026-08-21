"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export interface RouteMapDepot {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RouteMapStop {
  sequence: number;
  etaArrival: string;
  withinTimeWindow: boolean;
  pharmacy: {
    id: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
}

export interface RouteMapRoute {
  id: string;
  vehicleLabel: string;
  colorHex: string;
  stops: RouteMapStop[];
  /** Tracé réel (JSON de points [lat, lng]), ou `null` si non disponible (repli sur un trait direct). */
  geometry: string | null;
}

/** Parse la géométrie stockée en base ; retourne `null` si absente ou invalide. */
function parseRouteGeometry(geometry: string | null): [number, number][] | null {
  if (!geometry) return null;
  try {
    const parsed = JSON.parse(geometry);
    if (
      Array.isArray(parsed) &&
      parsed.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number"))
    ) {
      return parsed as [number, number][];
    }
  } catch {
    // Géométrie corrompue ou format inattendu : on ignore et on repliera sur un trait direct.
  }
  return null;
}

export interface RouteMapProps {
  depot: RouteMapDepot;
  routes: RouteMapRoute[];
}

const BRUSSELS_FALLBACK: [number, number] = [50.8503, 4.3517];

function buildDepotIcon() {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#171717;color:white;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);">D</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function buildStopIcon(number: number, color: string, withinTimeWindow: boolean) {
  const borderColor = withinTimeWindow ? "white" : "#dc2626";
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:white;font-size:11px;font-weight:700;border:2.5px solid ${borderColor};box-shadow:0 1px 4px rgba(0,0,0,0.4);">${number}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const key = positions.map((p) => p.join(",")).join("|");

  React.useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

export default function RouteMap({ depot, routes }: RouteMapProps) {
  const depotPosition: [number, number] | null =
    depot.latitude != null && depot.longitude != null ? [depot.latitude, depot.longitude] : null;

  const allPositions: [number, number][] = [];
  if (depotPosition) allPositions.push(depotPosition);
  for (const route of routes) {
    const geometry = parseRouteGeometry(route.geometry);
    if (geometry) {
      allPositions.push(...geometry);
    } else {
      for (const stop of route.stops) {
        if (stop.pharmacy.latitude != null && stop.pharmacy.longitude != null) {
          allPositions.push([stop.pharmacy.latitude, stop.pharmacy.longitude]);
        }
      }
    }
  }

  const center = depotPosition ?? allPositions[0] ?? BRUSSELS_FALLBACK;

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={allPositions} />

      {depotPosition && (
        <Marker position={depotPosition} icon={buildDepotIcon()}>
          <Popup>
            <strong>{depot.name}</strong>
            <br />
            {depot.address}
          </Popup>
        </Marker>
      )}

      {routes.map((route) => {
        const realGeometry = parseRouteGeometry(route.geometry);

        const stopPositions = route.stops
          .filter((s) => s.pharmacy.latitude != null && s.pharmacy.longitude != null)
          .map((s) => [s.pharmacy.latitude as number, s.pharmacy.longitude as number] as [number, number]);

        // Tracé réel (suit le réseau routier) si disponible, sinon repli sur un trait direct
        // dépôt → arrêts → dépôt (simulation interne, ou géométrie indisponible).
        const path =
          realGeometry ?? (depotPosition ? [depotPosition, ...stopPositions, depotPosition] : stopPositions);

        return (
          <React.Fragment key={route.id}>
            {path.length > 1 && (
              <Polyline
                positions={path}
                pathOptions={{
                  color: route.colorHex,
                  weight: 4,
                  opacity: 0.7,
                  dashArray: realGeometry ? undefined : "6 6",
                }}
              />
            )}
            {route.stops.map(
              (stop) =>
                stop.pharmacy.latitude != null &&
                stop.pharmacy.longitude != null && (
                  <Marker
                    key={stop.pharmacy.id}
                    position={[stop.pharmacy.latitude, stop.pharmacy.longitude]}
                    icon={buildStopIcon(stop.sequence, route.colorHex, stop.withinTimeWindow)}
                  >
                    <Popup>
                      <strong>
                        {stop.sequence}. {stop.pharmacy.name}
                      </strong>
                      <br />
                      {stop.pharmacy.address}, {stop.pharmacy.postalCode} {stop.pharmacy.city}
                      <br />
                      {route.vehicleLabel} — ETA {stop.etaArrival}{" "}
                      {stop.withinTimeWindow ? "✅" : "⚠️ hors créneau"}
                    </Popup>
                  </Marker>
                )
            )}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
