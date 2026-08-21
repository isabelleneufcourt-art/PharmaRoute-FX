"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { getRouteColor } from "@/lib/solver/colors";

export interface MapPharmacy {
  id: string;
  apbCode: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  bacsCount: number;
  depotId: string | null;
}

export interface MapDepot {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface PharmacyMapProps {
  pharmacies: MapPharmacy[];
  depots: MapDepot[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}

const BRUSSELS_FALLBACK: [number, number] = [50.8503, 4.3517];

/** Couleur associée à un dépôt (cycle sur la même palette que les tournées),
 *  déterminée par sa position dans la liste des dépôts. */
function colorForDepot(depotId: string | null, depots: MapDepot[]): string {
  if (!depotId) {
    const defaultIndex = depots.findIndex((d) => d.isDefault);
    return getRouteColor(defaultIndex >= 0 ? defaultIndex : 0);
  }
  const index = depots.findIndex((d) => d.id === depotId);
  return getRouteColor(index >= 0 ? index : 0);
}

function buildDepotIcon() {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#171717;color:white;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);">D</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function buildPharmacyIcon(color: string, selected: boolean) {
  const border = selected ? "#171717" : "white";
  const borderWidth = selected ? 3 : 2;
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${color};color:white;font-size:11px;font-weight:700;border:${borderWidth}px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,0.4);">${selected ? "✓" : ""}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
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

export default function PharmacyMap({ pharmacies, depots, selectedIds, onToggle }: PharmacyMapProps) {
  const depotPositions: [number, number][] = depots
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => [d.latitude as number, d.longitude as number]);

  const pharmacyPositions: [number, number][] = pharmacies
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => [p.latitude as number, p.longitude as number]);

  const allPositions = [...depotPositions, ...pharmacyPositions];
  const center = allPositions[0] ?? BRUSSELS_FALLBACK;

  return (
    <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={allPositions} />

      {depots.map(
        (depot) =>
          depot.latitude != null &&
          depot.longitude != null && (
            <Marker key={depot.id} position={[depot.latitude, depot.longitude]} icon={buildDepotIcon()}>
              <Popup>
                <strong>{depot.name}</strong>
                {depot.isDefault && <span> (principal)</span>}
                <br />
                {depot.address}
              </Popup>
            </Marker>
          )
      )}

      {pharmacies.map(
        (pharmacy) =>
          pharmacy.latitude != null &&
          pharmacy.longitude != null && (
            <Marker
              key={pharmacy.id}
              position={[pharmacy.latitude, pharmacy.longitude]}
              icon={buildPharmacyIcon(colorForDepot(pharmacy.depotId, depots), selectedIds.has(pharmacy.id))}
            >
              <Popup>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                  <strong>{pharmacy.name}</strong>
                  <span>
                    {pharmacy.address}, {pharmacy.postalCode} {pharmacy.city}
                  </span>
                  <span style={{ color: "#666" }}>
                    APB {pharmacy.apbCode} · {pharmacy.bacsCount} bac{pharmacy.bacsCount > 1 ? "s" : ""}
                  </span>
                  <span style={{ color: "#666" }}>
                    Dépôt : {depots.find((d) => d.id === pharmacy.depotId)?.name ?? "Principal"}
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pharmacy.id)}
                      onChange={(e) => onToggle(pharmacy.id, e.target.checked)}
                    />
                    Sélectionner pour l&apos;optimisation
                  </label>
                </div>
              </Popup>
            </Marker>
          )
      )}
    </MapContainer>
  );
}
