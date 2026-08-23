"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Truck, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addMinutesToTime } from "@/lib/time";
import type { DepartureShiftBlocker } from "@/lib/solver/delay-diagnosis";
import type { SolverProviderId } from "@/lib/solver/types";

/** Décalage d'heure de départ proposé pour tenter d'éliminer les retards. */
const SUGGESTED_DEPARTURE_SHIFT_MIN = 30;

interface DelaySuggestionBannerProps {
  violationsCount: number;
  depotId: string;
  vehicleCount: number;
  departureTime: string;
  deliveryDate: string;
  solverProvider: SolverProviderId;
  /** Sélection manuelle de pharmacies de l'optimisation d'origine (null = toutes celles ouvertes ce jour-là). */
  selectedPharmacyIds: string[] | null;
  /** Non-null si un arrêt antérieur au retard attend déjà l'ouverture de son créneau :
   *  avancer le départ n'y changera alors rien (l'attente absorbe tout l'avancement). */
  departureShiftBlocker: DepartureShiftBlocker | null;
}

type Suggestion = "ADD_VEHICLE" | "SHIFT_DEPARTURE";

export function DelaySuggestionBanner({
  violationsCount,
  depotId,
  vehicleCount,
  departureTime,
  deliveryDate,
  solverProvider,
  selectedPharmacyIds,
  departureShiftBlocker,
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
          depotId,
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
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              ) : departureShiftBlocker ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Clock3 className="h-3.5 w-3.5" />
              )}
              Avancer le départ à {earlierDeparture} et relancer
            </Button>
          </div>
        </div>

        {departureShiftBlocker && (
          <p className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              <strong>{departureShiftBlocker.pharmacyName}</strong>, plus tôt dans la tournée,
              attend déjà l&apos;ouverture de son créneau ({departureShiftBlocker.windowStart}) :
              avancer le départ ne fera reculer aucun arrêt suivant, donc probablement pas le
              retard non plus, quel que soit le nombre de tentatives. Essayez plutôt
              d&apos;ajouter un véhicule, ou vérifiez si un accès anticipé (sas/clé) est possible
              chez {departureShiftBlocker.pharmacyName}.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
