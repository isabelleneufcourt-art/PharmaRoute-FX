"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import type { Depot, TourTemplateWithStops } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PharmacyOption {
  id: string;
  apbCode: string;
  name: string;
  postalCode: string;
  city: string;
  bacsCount: number;
}

interface TourTemplateFormDialogProps {
  tourTemplate?: TourTemplateWithStops;
  depots: Depot[];
  pharmacies: PharmacyOption[];
  /** Rendu personnalisé du déclencheur (sinon un bouton par défaut est utilisé). */
  trigger?: React.ReactNode;
}

const NO_PERIOD_VALUE = "__none__";

const emptyForm = {
  code: "",
  name: "",
  depotId: "",
  period: NO_PERIOD_VALUE,
  vehicleLabel: "",
  vehicleCapacityBacs: "",
  notes: "",
};

export function TourTemplateFormDialog({
  tourTemplate,
  depots,
  pharmacies,
  trigger,
}: TourTemplateFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(tourTemplate);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(
    tourTemplate
      ? {
          code: tourTemplate.code,
          name: tourTemplate.name,
          depotId: tourTemplate.depotId,
          period: tourTemplate.period ?? NO_PERIOD_VALUE,
          vehicleLabel: tourTemplate.vehicleLabel ?? "",
          vehicleCapacityBacs:
            tourTemplate.vehicleCapacityBacs != null ? String(tourTemplate.vehicleCapacityBacs) : "",
          notes: tourTemplate.notes ?? "",
        }
      : {
          ...emptyForm,
          depotId: depots.find((d) => d.isDefault)?.id ?? depots[0]?.id ?? "",
        }
  );
  const [orderedIds, setOrderedIds] = React.useState<string[]>(
    tourTemplate ? tourTemplate.stops.map((s) => s.pharmacy.id) : []
  );
  const [search, setSearch] = React.useState("");

  const pharmacyById = React.useMemo(() => {
    const map = new Map<string, PharmacyOption>();
    for (const p of pharmacies) map.set(p.id, p);
    return map;
  }, [pharmacies]);

  const selectedSet = React.useMemo(() => new Set(orderedIds), [orderedIds]);

  function normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  const filteredPharmacies = React.useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return pharmacies;
    return pharmacies.filter((p) =>
      [p.name, p.apbCode, p.postalCode, p.city].some((field) => normalize(field).includes(term))
    );
  }, [pharmacies, search]);

  function toggle(id: string, checked: boolean) {
    setOrderedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function move(index: number, delta: number) {
    setOrderedIds((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setOrderedIds((prev) => prev.filter((x) => x !== id));
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const totalBacs = orderedIds.reduce((sum, id) => sum + (pharmacyById.get(id)?.bacsCount ?? 0), 0);
  const capacity = form.vehicleCapacityBacs ? Number(form.vehicleCapacityBacs) : null;
  const overCapacity = capacity != null && totalBacs > capacity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(
        isEdit ? `/api/tour-templates/${tourTemplate!.id}` : "/api/tour-templates",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            period: form.period === NO_PERIOD_VALUE ? null : form.period,
            stops: orderedIds.map((pharmacyId, index) => ({ pharmacyId, sequence: index + 1 })),
          }),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of json.issues ?? []) {
          fieldErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(fieldErrors);
        toast.error(json.error ?? "Impossible d'enregistrer la tournée");
        return;
      }

      toast.success(isEdit ? "Tournée mise à jour" : "Tournée créée");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isEdit ? "ghost" : "default"} size={isEdit ? "icon" : "default"}>
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {!isEdit && "Ajouter une tournée"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la tournée" : "Nouvelle tournée type"}</DialogTitle>
          <DialogDescription>
            Plan de transport général récurrent : pharmacies incluses et leur ordre de passage
            théorique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-code">Code</Label>
            <Input
              id="tt-code"
              placeholder="Ex: T01"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              required
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-name">Nom</Label>
            <Input
              id="tt-name"
              placeholder="Ex: Tournée Matin T01"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-depot">Dépôt</Label>
            <Select value={form.depotId} onValueChange={(v) => update("depotId", v)}>
              <SelectTrigger id="tt-depot">
                <SelectValue placeholder="Sélectionnez un dépôt" />
              </SelectTrigger>
              <SelectContent>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.depotId && <p className="text-xs text-destructive">{errors.depotId}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-period">Créneau théorique</Label>
            <Select value={form.period} onValueChange={(v) => update("period", v)}>
              <SelectTrigger id="tt-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PERIOD_VALUE}>Journée complète</SelectItem>
                <SelectItem value="MORNING">Matin</SelectItem>
                <SelectItem value="AFTERNOON">Après-midi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-vehicle">Véhicule type (optionnel)</Label>
            <Input
              id="tt-vehicle"
              placeholder="Ex: Camionnette 1"
              value={form.vehicleLabel}
              onChange={(e) => update("vehicleLabel", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tt-capacity">Capacité théorique (bacs)</Label>
            <Input
              id="tt-capacity"
              type="number"
              min={1}
              placeholder="Ex: 40"
              value={form.vehicleCapacityBacs}
              onChange={(e) => update("vehicleCapacityBacs", e.target.value)}
            />
            {errors.vehicleCapacityBacs && (
              <p className="text-xs text-destructive">{errors.vehicleCapacityBacs}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tt-notes">Notes (optionnel)</Label>
            <Input
              id="tt-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Pharmacies incluses (ordre de la tournée)</Label>
              <Badge variant={overCapacity ? "warning" : "outline"}>
                Charge théorique : {totalBacs}
                {capacity != null ? ` / ${capacity} bacs` : " bacs"}
              </Badge>
            </div>
            {overCapacity && (
              <p className="text-xs text-warning">
                La charge théorique dépasse la capacité indiquée du véhicule.
              </p>
            )}
            {errors.stops && <p className="text-xs text-destructive">{errors.stops}</p>}

            {orderedIds.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-border p-2">
                {orderedIds.map((id, index) => {
                  const pharmacy = pharmacyById.get(id);
                  if (!pharmacy) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">
                        <span className="font-medium">{pharmacy.name}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {pharmacy.postalCode} {pharmacy.city} · {pharmacy.bacsCount} bac
                          {pharmacy.bacsCount > 1 ? "s" : ""}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === orderedIds.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => remove(id)}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher une pharmacie à ajouter…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border">
              {filteredPharmacies.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Aucune pharmacie ne correspond.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredPharmacies.map((pharmacy) => {
                    const checked = selectedSet.has(pharmacy.id);
                    return (
                      <li key={pharmacy.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/50",
                            checked && "opacity-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                            checked={checked}
                            onChange={(e) => toggle(pharmacy.id, e.target.checked)}
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
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
