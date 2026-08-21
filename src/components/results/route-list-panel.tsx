"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Package, Printer, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/time";
import type { DriverOption, RouteWithStops } from "@/types";

interface RouteListPanelProps {
  routes: RouteWithStops[];
  drivers: DriverOption[];
}

export function RouteListPanel({ routes, drivers }: RouteListPanelProps) {
  if (routes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aucune tournée générée pour cette optimisation.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {routes.map((route) => (
        <RouteCard key={route.id} route={route} drivers={drivers} />
      ))}
    </div>
  );
}

function RouteCard({ route, drivers }: { route: RouteWithStops; drivers: DriverOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [assigning, setAssigning] = React.useState(false);
  const violations = route.stops.filter((s) => !s.withinTimeWindow).length;
  const totalBacs = route.stops.reduce((sum, s) => sum + s.pharmacy.bacsCount, 0);

  async function handleAssignDriver(value: string) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: value === "none" ? null : value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Chauffeur mis à jour");
      router.refresh();
    } catch {
      toast.error("Impossible d'assigner le chauffeur");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-wrap items-center gap-2 text-left"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: route.colorHex }}
            aria-hidden
          />
          <span className="font-semibold">{route.vehicleLabel}</span>
          <Badge variant="outline">
            {route.stops.length} arrêt{route.stops.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            <Package className="h-3 w-3" />
            {totalBacs}
          </Badge>
          {violations > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {violations} retard{violations > 1 ? "s" : ""}
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {route.totalDistanceKm != null && <span>{route.totalDistanceKm.toFixed(1)} km</span>}
            {route.totalDurationMin != null && (
              <span>{formatDurationMinutes(route.totalDurationMin)}</span>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/driver-sheet/${route.id}`}>
              <Printer className="h-3 w-3" />
              Feuille de route
            </Link>
          </Button>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Afficher/masquer">
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Chauffeur</span>
        <Select
          value={route.driverId ?? "none"}
          onValueChange={handleAssignDriver}
          disabled={assigning}
        >
          <SelectTrigger className="h-7 w-56 text-xs">
            <SelectValue placeholder="Non assigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non assigné</SelectItem>
            {drivers.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {open &&
        (route.stops.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Aucun arrêt assigné.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Pharmacie</TableHead>
                <TableHead>Créneau</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {route.stops.map((stop) => (
                <TableRow key={stop.id}>
                  <TableCell>
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: route.colorHex }}
                    >
                      {stop.sequence}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{stop.pharmacy.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {stop.pharmacy.address}, {stop.pharmacy.postalCode} {stop.pharmacy.city}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Clock className="mb-0.5 mr-1 inline h-3 w-3" />
                    {stop.pharmacy.timeWindowStart}–{stop.pharmacy.timeWindowEnd}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{stop.etaArrival}</TableCell>
                  <TableCell>
                    {stop.withinTimeWindow ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" />
                        Hors créneau
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </Card>
  );
}
