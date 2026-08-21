"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Truck, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addMinutesToTime } from "@/lib/time";
import type { SolverProviderId } from "@/lib/solver/types";

/** Décalage d'heure de départ proposé pour tenter d'éliminer les retards. */
const SUGGESTED_DEPARTURE_SHIFT_MIN = 30;

interface DelaySuggestionBannerProps {
  violationsCount: number;
  vehicleCount: number;
  departureTime: string;
  deliveryDate: string;
  solverProvider: SolverProviderId;
  /** Sélection manuelle de pharmacies de l'optimisation d'origine (null = toutes celles ouvertes ce jour-là). */
  selectedPharmacyIds: string[] | null;
}

type Suggestion = "ADD_VEHICLE" | "SHIFT_DEPARTURE";

export function DelaySuggestionBanner({
  violationsCount,
  vehicleCount,
  departureTime,
  deliveryDate,
  solverProvider,
  selectedPharmacyIds,
}: DelaySuggestionBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<Suggestion | null>(null);

  if (violationsCount <= 0) return null;

  const earlierDeparture = addMinutesToTime(departureTime, -SUGGESTED_DEPARTURE_SHIFT_MIN);

  async function relaunch(suggestion: Suggestion) {
    setLoading(suggestion);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleCount: suggestion === "ADD_VEHICLE" ? vehicleCount + 1 : vehicleCount,
          departureTime: suggestion === "SHIFT_DEPARTURE" ? earlierDeparture : departureTime,
          deliveryDate,
          solverProvider,
          ...(selectedPharmacyIds ? { pharmacyIds: selectedPharmacyIds } : {}),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Impossible de relancer l'optimisation");
        return;
      }

      toast.success(
        json.unassignedCount > 0
          ? `Nouveau calcul terminé, mais ${json.unassignedCount} pharmacie(s) restent non intégrées.`
          : "Nouveau calcul terminé"
      );
      router.push(`/results/${json.optimizationId}`);
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="no-print border-warning/40 bg-warning/5">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <span className="font-medium">
              {violationsCount} livraison{violationsCount > 1 ? "s" : ""} en retard
            </span>{" "}
            (hors fenêtre horaire). Essayez l&apos;un des ajustements suivants et relancez le
            calcul pour tenter de les éliminer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => relaunch("ADD_VEHICLE")}
            disabled={loading !== null}
          >
            {loading === "ADD_VEHICLE" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Truck className="h-3.5 w-3.5" />
            )}
            Ajouter un véhicule ({vehicleCount + 1}) et relancer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => relaunch("SHIFT_DEPARTURE")}
            disabled={loading !== null}
          >
            {loading === "SHIFT_DEPARTURE" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock3 className="h-3.5 w-3.5" />
            )}
            Avancer le départ à {earlierDeparture} et relancer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
