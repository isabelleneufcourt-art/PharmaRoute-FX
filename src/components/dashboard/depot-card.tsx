"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { Depot } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DepotCardProps {
  depot: Depot | null;
}

const emptyForm = {
  name: "",
  address: "",
  postalCode: "",
  city: "",
  openingTime: "06:30",
};

export function DepotCard({ depot }: DepotCardProps) {
  const router = useRouter();
  const [form, setForm] = React.useState(
    depot
      ? {
          name: depot.name,
          address: depot.address,
          postalCode: depot.postalCode,
          city: depot.city,
          openingTime: depot.openingTime,
        }
      : emptyForm
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch("/api/depot", {
        method: "PUT",
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

      toast.success("Dépôt central enregistré");
      router.refresh();
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <CardTitle>Dépôt central</CardTitle>
        </div>
        <CardDescription>
          Point de départ et de retour de toutes les tournées de livraison.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="depot-name">Nom du dépôt</Label>
            <Input
              id="depot-name"
              placeholder="Ex: Dépôt central Bruxelles"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
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
            {errors.postalCode && (
              <p className="text-xs text-destructive">{errors.postalCode}</p>
            )}
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

          <div className="flex items-end sm:col-span-1">
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer le dépôt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
