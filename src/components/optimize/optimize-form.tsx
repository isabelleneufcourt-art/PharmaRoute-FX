"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Play, Search, Truck } from "lucide-react";
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

interface PharmacyOption {
  id: string;
  apbCode: string;
  name: string;
  postalCode: string;
  city: string;
  depotId: string | null;
}

interface DepotOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface OptimizeFormProps {
  depots: DepotOption[];
  defaultDepotId: string;
  defaultDepartureTime: string;
  pharmacies: PharmacyOption[];
  suggestedVehicleCount: number;
  disabled?: boolean;
  solverAvailability: Record<SolverProviderId, SolverAvailabilityEntry>;
}

const SOLVER_OPTIONS: { id: SolverProviderId; label: string }[] = [
  { id: "INTERNAL", label: "Simulation interne PharmaRoute FX" },
  { id: "OPENROUTE_VROOM", label: "OpenRouteService / VROOM (trajets routiers réels)" },
  { id: "GOOGLE_ROUTE_OPTIMIZATION", label: "Google Route Optimization" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function OptimizeForm({
  depots,
  defaultDepotId,
  defaultDepartureTime,
  pharmacies,
  suggestedVehicleCount,
  disabled = false,
  solverAvailability,
}: OptimizeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pré-remplissage optionnel depuis la carte des pharmacies (`/pharmacies/map`) :
  // dépôt et/ou sélection de pharmacies passés en paramètres d'URL.
  const initialDepotId = searchParams.get("depotId") || defaultDepotId;
  const initialPharmacyIds = React.useMemo(() => {
    const raw = searchParams.get("pharmacyIds");
    return raw ? new Set(raw.split(",").filter(Boolean)) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [depotId, setDepotId] = React.useState(initialDepotId);
  const [vehicleCount, setVehicleCount] = React.useState(String(suggestedVehicleCount));
  const [departureTime, setDepartureTime] = React.useState(defaultDepartureTime);
  const [deliveryDate, setDeliveryDate] = React.useState(() => formatDateOnly(new Date()));
  const [solverProvider, setSolverProvider] = React.useState<SolverProviderId>("INTERNAL");
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const eligiblePharmacies = React.useMemo(
    () =>
      pharmacies.filter((p) =>
        p.depotId ? p.depotId === depotId : depotId === defaultDepotId
      ),
    [pharmacies, depotId, defaultDepotId]
  );

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => {
    if (initialPharmacyIds) {
      const eligibleIds = new Set(eligiblePharmacies.map((p) => p.id));
      return new Set(Array.from(initialPharmacyIds).filter((id) => eligibleIds.has(id)));
    }
    return new Set(eligiblePharmacies.map((p) => p.id));
  });

  const selectedHint = solverAvailability[solverProvider]?.hint;
  const weekday = deliveryDate ? getWeekdayFromDate(parseDateOnly(deliveryDate)) : null;
  const isSunday = deliveryDate !== "" && weekday === null;

  const filteredPharmacies = React.useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return eligiblePharmacies;
    return eligiblePharmacies.filter((p) =>
      [p.name, p.apbCode, p.postalCode, p.city].some((field) => normalize(field).includes(term))
    );
  }, [eligiblePharmacies, search]);

  function handleDepotChange(nextDepotId: string) {
    setDepotId(nextDepotId);
    // Changer de dépôt change le périmètre de pharmacies concernées : on
    // resélectionne automatiquement tout ce qui appartient au nouveau dépôt.
    const nextEligible = pharmacies.filter((p) =>
      p.depotId ? p.depotId === nextDepotId : nextDepotId === defaultDepotId
    );
    setSelectedIds(new Set(nextEligible.map((p) => p.id)));
    setSearch("");
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(eligiblePharmacies.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const noneSelected = selectedIds.size === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (noneSelected) {
      toast.error("Sélectionnez au moins une pharmacie");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depotId,
          vehicleCount: Number(vehicleCount),
          departureTime,
          deliveryDate,
          solverProvider,
          pharmacyIds: Array.from(selectedIds),
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
      if (json.deselectedCount > 0) {
        toast.info(
          `${json.deselectedCount} pharmacie(s) non sélectionnée(s) n'ont pas été incluses dans le calcul.`
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
          Le solver répartit les pharmacies sélectionnées entre les véhicules disponibles, en
          respectant au mieux leurs fenêtres horaires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="depotId">Dépôt de départ</Label>
            <Select value={depotId} onValueChange={handleDepotChange} disabled={disabled}>
              <SelectTrigger id="depotId">
                <SelectValue placeholder="Sélectionnez un dépôt" />
              </SelectTrigger>
              <SelectContent>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {d.isDefault ? " (principal)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Point de départ et de retour des véhicules. Seules les pharmacies affectées à ce
              dépôt (ou sans affectation, si dépôt principal) sont proposées ci-dessous.
            </p>
          </div>

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

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Pharmacies à inclure</Label>
              <Badge variant={noneSelected ? "warning" : "outline"}>
                {selectedIds.size} / {eligiblePharmacies.length} sélectionnée
                {selectedIds.size > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher (nom, code APB, code postal, ville)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={disabled}
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={disabled}
              >
                Tout sélectionner
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={disabled}
              >
                Tout désélectionner
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {filteredPharmacies.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  {eligiblePharmacies.length === 0
                    ? "Aucune pharmacie affectée à ce dépôt."
                    : "Aucune pharmacie ne correspond."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredPharmacies.map((pharmacy) => {
                    const checked = selectedIds.has(pharmacy.id);
                    return (
                      <li key={pharmacy.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/50",
                            disabled && "pointer-events-none opacity-60"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                            checked={checked}
                            onChange={(e) => toggleOne(pharmacy.id, e.target.checked)}
                            disabled={disabled}
                          />
                          <span className="flex-1 truncate">
                            <span className="font-medium">{pharmacy.name}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              {pharmacy.postalCode} {pharmacy.city} · {pharmacy.apbCode}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {noneSelected && (
              <p className="text-xs text-destructive">
                Sélectionnez au moins une pharmacie pour lancer un calcul.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={
                disabled ||
                loading ||
                isSunday ||
                noneSelected ||
                !solverAvailability[solverProvider]?.configured
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
