"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Truck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SolverProviderId } from "@/lib/solver/types";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, formatDateOnly, getWeekdayFromDate, parseDateOnly } from "@/lib/weekday";

interface SolverAvailabilityEntry {
  configured: boolean;
  hint: string;
}

interface OptimizeFormProps {
  defaultDepartureTime: string;
  pharmacyCount: number;
  suggestedVehicleCount: number;
  disabled?: boolean;
  solverAvailability: Record<SolverProviderId, SolverAvailabilityEntry>;
}

const SOLVER_OPTIONS: { id: SolverProviderId; label: string }[] = [
  { id: "INTERNAL", label: "Simulation interne PharmaRoute FX" },
  { id: "OPENROUTE_VROOM", label: "OpenRouteService / VROOM (trajets routiers réels)" },
  { id: "GOOGLE_ROUTE_OPTIMIZATION", label: "Google Route Optimization" },
];

export function OptimizeForm({
  defaultDepartureTime,
  pharmacyCount,
  suggestedVehicleCount,
  disabled = false,
  solverAvailability,
}: OptimizeFormProps) {
  const router = useRouter();
  const [vehicleCount, setVehicleCount] = React.useState(String(suggestedVehicleCount));
  const [departureTime, setDepartureTime] = React.useState(defaultDepartureTime);
  const [deliveryDate, setDeliveryDate] = React.useState(() => formatDateOnly(new Date()));
  const [solverProvider, setSolverProvider] = React.useState<SolverProviderId>("INTERNAL");
  const [loading, setLoading] = React.useState(false);

  const selectedHint = solverAvailability[solverProvider]?.hint;
  const weekday = deliveryDate ? getWeekdayFromDate(parseDateOnly(deliveryDate)) : null;
  const isSunday = deliveryDate !== "" && weekday === null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleCount: Number(vehicleCount),
          departureTime,
          deliveryDate,
          solverProvider,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Impossible de lancer l'optimisation");
        return;
      }

      if (json.excludedCount > 0) {
        toast.warning(
          `${json.excludedCount} pharmacie(s) fermée(s) ce jour-là n'ont pas été incluses dans le calcul.`
        );
      }
      if (json.unassignedCount > 0) {
        toast.warning(
          `Tournées calculées, mais ${json.unassignedCount} pharmacie(s) n'ont pas pu être intégrées dans une tournée respectant leur fenêtre horaire.`
        );
      } else {
        toast.success("Tournées calculées avec succès");
      }
      router.push(`/results/${json.optimizationId}`);
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <CardTitle>Paramètres de la tournée</CardTitle>
        </div>
        <CardDescription>
          Le solver répartit les {pharmacyCount} pharmacie{pharmacyCount > 1 ? "s" : ""} entre les
          véhicules disponibles, en respectant au mieux leurs fenêtres horaires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="deliveryDate">Date de livraison</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              disabled={disabled}
              required
            />
            <p className={cn("text-xs", isSunday ? "text-destructive" : "text-muted-foreground")}>
              {isSunday
                ? "Aucune livraison n'est programmée le dimanche — choisissez un autre jour."
                : weekday
                  ? `${WEEKDAY_LABELS[weekday]} — seules les pharmacies ouvertes ce jour-là seront incluses.`
                  : ""}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleCount">Nombre de véhicules</Label>
            <Input
              id="vehicleCount"
              type="number"
              min={1}
              max={50}
              value={vehicleCount}
              onChange={(e) => setVehicleCount(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departureTime">Heure de départ du dépôt</Label>
            <Input
              id="departureTime"
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Moteur d&apos;optimisation (solver VRPTW)</Label>
            <Select
              value={solverProvider}
              onValueChange={(v) => setSolverProvider(v as SolverProviderId)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOLVER_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      {option.label}
                      {solverAvailability[option.id]?.configured ? (
                        option.id !== "INTERNAL" && (
                          <Badge variant="success" className="text-[10px]">
                            Configuré
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Non configuré
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {solverAvailability[solverProvider]?.configured
                ? solverProvider === "INTERNAL"
                  ? "Distances simulées (Haversine + facteur de circuité), aucune configuration requise."
                  : "Configuré : ce calcul utilisera des trajets routiers réels."
                : selectedHint}
            </p>
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={
                disabled || loading || isSunday || !solverAvailability[solverProvider]?.configured
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Lancer l&apos;optimisation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
