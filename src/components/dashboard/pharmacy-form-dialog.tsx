"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import type { PharmacyWithTimeWindows } from "@/types";
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
import { WeeklyWindowsEditor } from "@/components/dashboard/weekly-windows-editor";
import { rowsToWeeklyWindows } from "@/lib/pharmacy-windows";
import { defaultWeeklyWindows, type WeeklyWindowsInput } from "@/lib/validations";

interface PharmacyFormDialogProps {
  pharmacy?: PharmacyWithTimeWindows;
  /** Rendu personnalisé du déclencheur (sinon un bouton par défaut est utilisé). */
  trigger?: React.ReactNode;
}

const emptyForm = {
  apbCode: "",
  name: "",
  address: "",
  postalCode: "",
  city: "",
  bacsCount: "1",
  serviceTimeMinutes: "5",
  contactName: "",
  contactPhone: "",
  notes: "",
};

export function PharmacyFormDialog({ pharmacy, trigger }: PharmacyFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(pharmacy);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(
    pharmacy
      ? {
          apbCode: pharmacy.apbCode,
          name: pharmacy.name,
          address: pharmacy.address,
          postalCode: pharmacy.postalCode,
          city: pharmacy.city,
          bacsCount: String(pharmacy.bacsCount),
          serviceTimeMinutes: String(pharmacy.serviceTimeMinutes),
          contactName: pharmacy.contactName ?? "",
          contactPhone: pharmacy.contactPhone ?? "",
          notes: pharmacy.notes ?? "",
        }
      : emptyForm
  );
  const [timeWindows, setTimeWindows] = React.useState<WeeklyWindowsInput>(
    pharmacy ? rowsToWeeklyWindows(pharmacy.timeWindows) : defaultWeeklyWindows()
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(isEdit ? `/api/pharmacies/${pharmacy!.id}` : "/api/pharmacies", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, timeWindows }),
      });
      const json = await res.json();

      if (!res.ok) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of json.issues ?? []) {
          fieldErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(fieldErrors);
        toast.error(json.error ?? "Impossible d'enregistrer la pharmacie");
        return;
      }

      toast.success(isEdit ? "Pharmacie mise à jour" : "Pharmacie ajoutée");
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
            {!isEdit && "Ajouter une pharmacie"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la pharmacie" : "Nouvelle pharmacie"}</DialogTitle>
          <DialogDescription>
            Code APB, adresse belge, grille horaire hebdomadaire et nombre de bacs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apbCode">Code APB</Label>
            <Input
              id="apbCode"
              value={form.apbCode}
              onChange={(e) => update("apbCode", e.target.value)}
              required
            />
            {errors.apbCode && <p className="text-xs text-destructive">{errors.apbCode}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom de la pharmacie</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input
              id="postalCode"
              inputMode="numeric"
              maxLength={4}
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              required
            />
            {errors.postalCode && (
              <p className="text-xs text-destructive">{errors.postalCode}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Grille horaire de livraison (Lundi → Samedi)</Label>
            <WeeklyWindowsEditor
              value={timeWindows}
              onChange={setTimeWindows}
              error={errors.timeWindows}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bacsCount">Nombre de bacs</Label>
            <Input
              id="bacsCount"
              type="number"
              min={1}
              value={form.bacsCount}
              onChange={(e) => update("bacsCount", e.target.value)}
              required
            />
            {errors.bacsCount && <p className="text-xs text-destructive">{errors.bacsCount}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serviceTimeMinutes">Temps de déchargement (min)</Label>
            <Input
              id="serviceTimeMinutes"
              type="number"
              min={0}
              value={form.serviceTimeMinutes}
              onChange={(e) => update("serviceTimeMinutes", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Contact (optionnel)</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">Téléphone (optionnel)</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input
              id="notes"
              placeholder="Ex: livraison quai arrière"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
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
