"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Package, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StopCard, type StopCardData } from "@/components/driver-sheet/stop-card";
import { formatDurationMinutes } from "@/lib/time";
import type { RouteWithDetails } from "@/types";

interface DriverSheetViewProps {
  route: RouteWithDetails;
}

export function DriverSheetView({ route }: DriverSheetViewProps) {
  const [stops, setStops] = React.useState<StopCardData[]>(route.stops);
  // Calculée uniquement après le montage côté client pour éviter un
  // mismatch d'hydratation (l'heure "maintenant" diffère du rendu serveur).
  const [generatedAt, setGeneratedAt] = React.useState<string | null>(null);
  React.useEffect(() => {
    setGeneratedAt(new Date().toLocaleString("fr-BE"));
  }, []);

  const deliveredCount = stops.filter((s) => s.completed).length;
  const totalEmptyBacs = stops.reduce((sum, s) => sum + s.emptyBacsRetrieved, 0);
  const totalBacsToDeliver = stops.reduce((sum, s) => sum + s.pharmacy.bacsCount, 0);
  const progressPercent = stops.length > 0 ? Math.round((deliveredCount / stops.length) * 100) : 0;

  async function handleUpdate(
    stopId: string,
    patch: { completed?: boolean; emptyBacsRetrieved?: number }
  ) {
    const previous = stops.find((s) => s.id === stopId);
    setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, ...patch } : s)));

    try {
      const res = await fetch(`/api/route-stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Échec de l'enregistrement, réessayez");
      if (previous) setStops((prev) => prev.map((s) => (s.id === stopId ? previous : s)));
    }
  }

  const createdAt = new Date(route.optimization.createdAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 print:max-w-full print:px-0 print:py-0">
      <div className="no-print mb-5 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/results/${route.optimizationId}`}>
            <ArrowLeft className="h-4 w-4" />
            Retour aux résultats
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimer / Exporter PDF
        </Button>
      </div>

      <div className="mb-5 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: route.colorHex }} />
          <h1 className="text-xl font-bold">Feuille de route — {route.vehicleLabel}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {createdAt.toLocaleDateString("fr-BE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}{" "}
          — Départ {route.optimization.departureTime}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <InfoBlock label="Dépôt" value={route.optimization.depot.name} />
          <InfoBlock
            label="Adresse dépôt"
            value={`${route.optimization.depot.postalCode} ${route.optimization.depot.city}`}
          />
          <InfoBlock label="Arrêts" value={String(stops.length)} />
          <InfoBlock
            label="Distance / durée"
            value={`${route.totalDistanceKm?.toFixed(1) ?? "—"} km · ${
              route.totalDurationMin != null ? formatDurationMinutes(route.totalDurationMin) : "—"
            }`}
          />
        </dl>
      </div>

      <div className="no-print mb-5 rounded-md border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {deliveredCount} / {stops.length} livraison{stops.length > 1 ? "s" : ""} effectuée
            {deliveredCount > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {totalEmptyBacs} bac{totalEmptyBacs > 1 ? "s" : ""} vide{totalEmptyBacs > 1 ? "s" : ""} récupéré
            {totalEmptyBacs > 1 ? "s" : ""} / {totalBacsToDeliver} livré{totalBacsToDeliver > 1 ? "s" : ""}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {stops.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun arrêt sur cette tournée.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {stops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              color={route.colorHex}
              onUpdate={(patch) => handleUpdate(stop.id, patch)}
            />
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground print:mt-4">
        PharmaRoute FX{generatedAt ? ` — feuille de route générée le ${generatedAt}` : ""}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
