"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import type { Depot } from "@/types";
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

interface DepotFormDialogProps {
  depot?: Depot;
  /** Rendu personnalisé du déclencheur (sinon un bouton par défaut est utilisé). */
  trigger?: React.ReactNode;
}

const emptyForm = {
  name: "",
  code: "",
  address: "",
  postalCode: "",
  city: "",
  openingTime: "06:30",
};

export function DepotFormDialog({ depot, trigger }: DepotFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(depot);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(
    depot
      ? {
          name: depot.name,
          code: depot.code ?? "",
          address: depot.address,
          postalCode: depot.postalCode,
          city: depot.city,
          openingTime: depot.openingTime,
        }
      : emptyForm
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(isEdit ? `/api/depots/${depot!.id}` : "/api/depots", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of json.issues ?? []) {
          fieldErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(fieldErrors);
        toast.error(json.error ?? "Impossible d'enregistrer le dépôt");
        return;
      }

      toast.success(isEdit ? "Dépôt mis à jour" : "Dépôt créé");
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
            {!isEdit && "Ajouter un dépôt"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le dépôt" : "Nouveau dépôt"}</DialogTitle>
          <DialogDescription>
            Point de départ et de retour des tournées pour ce dépôt/secteur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="depot-name">Nom du dépôt</Label>
            <Input
              id="depot-name"
              placeholder="Ex: Dépôt Liège"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="depot-code">Code (optionnel)</Label>
            <Input
              id="depot-code"
              placeholder="Ex: LIEGE"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Utilisé pour affecter des pharmacies à ce dépôt lors de l&apos;import CSV (colonne
              &laquo;&nbsp;Depot&nbsp;&raquo; / &laquo;&nbsp;Code_Depot&nbsp;&raquo;).
            </p>
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="depot-address">Adresse</Label>
            <Input
              id="depot-address"
              placeholder="Ex: Chaussée de Louvain 431"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depot-cp">Code postal</Label>
            <Input
              id="depot-cp"
              placeholder="1000"
              inputMode="numeric"
              maxLength={4}
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              required
            />
            {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depot-city">Ville</Label>
            <Input
              id="depot-city"
              placeholder="Bruxelles"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depot-opening">Heure de départ par défaut</Label>
            <Input
              id="depot-opening"
              type="time"
              value={form.openingTime}
              onChange={(e) => update("openingTime", e.target.value)}
              required
            />
            {errors.openingTime && (
              <p className="text-xs text-destructive">{errors.openingTime}</p>
            )}
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
