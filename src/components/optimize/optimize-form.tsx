"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Truck } from "lucide-react";
import { toast } from "sonner";

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

interface OptimizeFormProps {
  defaultDepartureTime: string;
  pharmacyCount: number;
  suggestedVehicleCount: number;
  disabled?: boolean;
}

export function OptimizeForm({
  defaultDepartureTime,
  pharmacyCount,
  suggestedVehicleCount,
  disabled = false,
}: OptimizeFormProps) {
  const router = useRouter();
  const [vehicleCount, setVehicleCount] = React.useState(String(suggestedVehicleCount));
  const [departureTime, setDepartureTime] = React.useState(defaultDepartureTime);
  const [solverProvider, setSolverProvider] = React.useState("INTERNAL");
  const [loading, setLoading] = React.useState(false);

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
          solverProvider,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Impossible de lancer l'optimisation");
        return;
      }

      toast.success("Tournées calculées avec succès");
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
            <Select value={solverProvider} onValueChange={setSolverProvider} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL">Simulation interne PharmaRoute FX</SelectItem>
                <SelectItem value="GOOGLE_ROUTE_OPTIMIZATION" disabled>
                  Google Route Optimization API (bientôt — clé API requise)
                </SelectItem>
                <SelectItem value="OPENROUTE_VROOM" disabled>
                  OpenRouteService / VROOM (bientôt — endpoint requis)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              L&apos;interface est prête pour un solver externe ; en attendant sa configuration
              (voir <code className="font-mono">.env.example</code>), le calcul utilise la
              simulation interne (balayage angulaire + plus proche voisin + 2-opt).
            </p>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={disabled || loading}>
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
