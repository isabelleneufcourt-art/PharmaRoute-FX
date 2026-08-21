"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import type { DepotWithPharmacyCount } from "@/types";
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
import { DepotFormDialog } from "@/components/depots/depot-form-dialog";

interface DepotListProps {
  depots: DepotWithPharmacyCount[];
}

export function DepotList({ depots }: DepotListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleSetDefault(depot: DepotWithPharmacyCount) {
    setBusyId(depot.id);
    try {
      const res = await fetch(`/api/depots/${depot.id}/default`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`"${depot.name}" est maintenant le dépôt principal`);
      router.refresh();
    } catch {
      toast.error("Impossible de définir ce dépôt comme principal");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(depot: DepotWithPharmacyCount) {
    if (!confirm(`Supprimer le dépôt "${depot.name}" ?`)) return;

    setBusyId(depot.id);
    try {
      const res = await fetch(`/api/depots/${depot.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Impossible de supprimer ce dépôt");
        return;
      }
      toast.success("Dépôt supprimé");
      router.refresh();
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Dépôts</CardTitle>
          <CardDescription>
            {depots.length} dépôt{depots.length > 1 ? "s" : ""} — chaque pharmacie peut être
            affectée à l&apos;un d&apos;eux (colonne &laquo;&nbsp;Dépôt&nbsp;&raquo; sur
            l&apos;écran Pharmacies).
          </CardDescription>
        </div>
        <DepotFormDialog />
      </CardHeader>
      <CardContent>
        {depots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            <Building2 className="h-6 w-6" />
            <p>Aucun dépôt enregistré pour le moment.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dépôt</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Pharmacies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depots.map((depot) => (
                <TableRow key={depot.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {depot.name}
                      {depot.isDefault && (
                        <Badge variant="success" className="text-[10px]">
                          <Star className="h-3 w-3" />
                          Principal
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {depot.code ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {depot.address}, {depot.postalCode} {depot.city}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{depot.openingTime}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Users className="h-3 w-3" />
                      {depot._count.pharmacies}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!depot.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === depot.id}
                          onClick={() => handleSetDefault(depot)}
                        >
                          <Star className="h-3.5 w-3.5" />
                          Définir principal
                        </Button>
                      )}
                      <DepotFormDialog depot={depot} />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busyId === depot.id || depot.isDefault}
                        title={depot.isDefault ? "Le dépôt principal ne peut pas être supprimé" : undefined}
                        onClick={() => handleDelete(depot)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
