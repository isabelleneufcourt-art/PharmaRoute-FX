"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPinned } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PharmacyMapLoader } from "@/components/pharmacies/pharmacy-map-loader";
import type { MapDepot, MapPharmacy } from "@/components/pharmacies/pharmacy-map";

const ALL_DEPOTS_VALUE = "__all__";

interface PharmacyMapViewProps {
  pharmacies: MapPharmacy[];
  depots: MapDepot[];
  defaultDepotId: string;
}

export function PharmacyMapView({ pharmacies, depots, defaultDepotId }: PharmacyMapViewProps) {
  const router = useRouter();
  const [depotFilter, setDepotFilter] = React.useState<string>(ALL_DEPOTS_VALUE);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const visiblePharmacies = React.useMemo(() => {
    if (depotFilter === ALL_DEPOTS_VALUE) return pharmacies;
    return pharmacies.filter((p) =>
      p.depotId ? p.depotId === depotFilter : depotFilter === defaultDepotId
    );
  }, [pharmacies, depotFilter, defaultDepotId]);

  const geolocatedCount = visiblePharmacies.filter(
    (p) => p.latitude != null && p.longitude != null
  ).length;

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of visiblePharmacies) next.add(p.id);
      return next;
    });
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function sendToOptimize() {
    if (selectedIds.size === 0) return;

    const selected = pharmacies.filter((p) => selectedIds.has(p.id));
    const resolvedDepotIds = new Set(selected.map((p) => p.depotId ?? defaultDepotId));
    const singleDepotId = resolvedDepotIds.size === 1 ? Array.from(resolvedDepotIds)[0] : null;

    if (!singleDepotId) {
      toast.info(
        "La sélection couvre plusieurs dépôts : seules les pharmacies du dépôt choisi à l'écran Optimisation seront pré-cochées."
      );
    }

    const params = new URLSearchParams();
    params.set("pharmacyIds", Array.from(selectedIds).join(","));
    if (singleDepotId) params.set("depotId", singleDepotId);
    router.push(`/optimize?${params.toString()}`);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="no-print flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Carte des pharmacies</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dépôt/secteur</span>
          <Select value={depotFilter} onValueChange={setDepotFilter}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPOTS_VALUE}>Tous les dépôts</SelectItem>
              {depots.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                  {d.isDefault ? " (principal)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline">
          {geolocatedCount} / {visiblePharmacies.length} affichée
          {visiblePharmacies.length > 1 ? "s" : ""}
        </Badge>
        <Badge variant={selectedIds.size > 0 ? "success" : "outline"}>
          {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            Tout sélectionner (visible)
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Tout désélectionner
          </Button>
          <Button size="sm" disabled={selectedIds.size === 0} onClick={sendToOptimize}>
            Envoyer vers l&apos;optimisation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        <PharmacyMapLoader
          pharmacies={visiblePharmacies}
          depots={depots}
          selectedIds={selectedIds}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}
