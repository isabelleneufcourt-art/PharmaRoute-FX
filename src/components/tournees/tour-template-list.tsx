"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Boxes, MapPinned, Route as RouteIcon, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import type { Depot, TourTemplateWithStopCount } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TourTemplateFormDialog } from "@/components/tournees/tour-template-form-dialog";
import { DELIVERY_PERIOD_LABELS } from "@/lib/weekday";

interface PharmacyOption {
  id: string;
  apbCode: string;
  name: string;
  postalCode: string;
  city: string;
  bacsCount: number;
}

interface TourTemplateListProps {
  tourTemplates: TourTemplateWithStopCount[];
  depots: Depot[];
  pharmacies: PharmacyOption[];
}

export function TourTemplateList({ tourTemplates, depots, pharmacies }: TourTemplateListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(tourTemplate: TourTemplateWithStopCount) {
    if (!confirm(`Supprimer la tournée "${tourTemplate.name}" ?`)) return;

    setDeletingId(tourTemplate.id);
    try {
      const res = await fetch(`/api/tour-templates/${tourTemplate.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Tournée supprimée");
      router.refresh();
    } catch {
      toast.error("Impossible de supprimer cette tournée");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Tournées types</CardTitle>
          <CardDescription>
            {tourTemplates.length} tournée{tourTemplates.length > 1 ? "s" : ""} — plans de
            transport récurrents, indépendants des optimisations ponctuelles.
          </CardDescription>
        </div>
        <TourTemplateFormDialog depots={depots} pharmacies={pharmacies} />
      </CardHeader>
      <CardContent>
        {tourTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            <RouteIcon className="h-6 w-6" />
            <p>Aucune tournée type enregistrée pour le moment.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead>Créneau</TableHead>
                <TableHead>Pharmacies</TableHead>
                <TableHead>Charge théorique</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tourTemplates.map((t) => {
                const overCapacity =
                  t.vehicleCapacityBacs != null && t.totalBacs > t.vehicleCapacityBacs;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/tournees/${t.id}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <MapPinned className="h-3.5 w-3.5 text-primary" />
                        {t.name}
                      </Link>
                      {t.vehicleLabel && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {t.vehicleLabel}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.depot.name}</TableCell>
                    <TableCell>
                      {t.period ? (
                        <Badge variant="outline">{DELIVERY_PERIOD_LABELS[t.period]}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Journée complète</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t._count.stops}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={overCapacity ? "warning" : "outline"}>
                        {overCapacity && <AlertTriangle className="h-3 w-3" />}
                        <Boxes className="h-3 w-3" />
                        {t.totalBacs}
                        {t.vehicleCapacityBacs != null ? ` / ${t.vehicleCapacityBacs}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TourTemplateFormDialog
                          tourTemplate={t}
                          depots={depots}
                          pharmacies={pharmacies}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === t.id}
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
