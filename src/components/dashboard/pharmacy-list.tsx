"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, KeyRound, MapPin, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { PharmacyWithTimeWindows } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PharmacyFormDialog } from "@/components/dashboard/pharmacy-form-dialog";
import { cn } from "@/lib/utils";
import { DELIVERY_PERIOD_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT_LABELS, WEEKDAYS } from "@/lib/weekday";

interface PharmacyListProps {
  pharmacies: PharmacyWithTimeWindows[];
}

/** Résumé compact de la grille hebdomadaire : un badge par jour, plein si un créneau est ouvert. */
function WeeklyWindowsSummary({ pharmacy }: { pharmacy: PharmacyWithTimeWindows }) {
  const byDay = React.useMemo(() => {
    const map = new Map<string, typeof pharmacy.timeWindows>();
    for (const day of WEEKDAYS) map.set(day, []);
    for (const window of pharmacy.timeWindows) {
      map.get(window.weekday)?.push(window);
    }
    return map;
  }, [pharmacy]);

  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((day) => {
        const windows = byDay.get(day) ?? [];
        const isOpen = windows.length > 0;
        const title = isOpen
          ? `${WEEKDAY_LABELS[day]} : ${windows
              .map((w) => `${DELIVERY_PERIOD_LABELS[w.period]} ${w.startTime}-${w.endTime}`)
              .join(" · ")}`
          : `${WEEKDAY_LABELS[day]} : fermé`;
        return (
          <span
            key={day}
            title={title}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium",
              isOpen
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground/50 line-through"
            )}
          >
            {WEEKDAY_SHORT_LABELS[day][0]}
          </span>
        );
      })}
    </div>
  );
}

export function PharmacyList({ pharmacies }: PharmacyListProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pharmacies;
    return pharmacies.filter((p) =>
      [p.apbCode, p.name, p.address, p.postalCode, p.city].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [pharmacies, query]);

  async function handleDelete(pharmacy: PharmacyWithTimeWindows) {
    if (!confirm(`Supprimer la pharmacie "${pharmacy.name}" (${pharmacy.apbCode}) ?`)) return;

    setDeletingId(pharmacy.id);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacy.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Pharmacie supprimée");
      router.refresh();
    } catch {
      toast.error("Impossible de supprimer cette pharmacie");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pharmacies clientes</CardTitle>
          <CardDescription>
            {pharmacies.length} pharmacie{pharmacies.length > 1 ? "s" : ""} enregistrée
            {pharmacies.length > 1 ? "s" : ""}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (nom, code APB, ville…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          <PharmacyFormDialog />
        </div>
      </CardHeader>
      <CardContent>
        {pharmacies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            <MapPin className="h-6 w-6" />
            <p>Aucune pharmacie enregistrée pour le moment.</p>
            <p>Importez un fichier CSV/Excel ci-dessus ou ajoutez une pharmacie manuellement.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code APB</TableHead>
                <TableHead>Pharmacie</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Grille (Lun→Sam)</TableHead>
                <TableHead>Bacs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pharmacy) => (
                <TableRow key={pharmacy.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {pharmacy.apbCode}
                  </TableCell>
                  <TableCell className="font-medium">{pharmacy.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pharmacy.address}, {pharmacy.postalCode} {pharmacy.city}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <WeeklyWindowsSummary pharmacy={pharmacy} />
                      {pharmacy.earlyAccessEnabled && pharmacy.earlyAccessTime && (
                        <Badge
                          variant="secondary"
                          title={`Livraison hors-horaires : accès chauffeur dès ${pharmacy.earlyAccessTime} (sas/clé)`}
                          className="text-[10px]"
                        >
                          <KeyRound className="h-3 w-3" />
                          Sas {pharmacy.earlyAccessTime}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Boxes className="h-3 w-3" />
                      {pharmacy.bacsCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <PharmacyFormDialog pharmacy={pharmacy} />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === pharmacy.id}
                        onClick={() => handleDelete(pharmacy)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucun résultat pour « {query} »
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
