"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  Minus,
  Package,
  Phone,
  Plus,
  StickyNote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DELIVERY_PERIOD_LABELS } from "@/lib/weekday";

export interface StopCardData {
  id: string;
  sequence: number;
  etaArrival: string;
  etaDeparture: string;
  withinTimeWindow: boolean;
  deliveryPeriod: "MORNING" | "AFTERNOON" | null;
  scheduledWindowStart: string | null;
  scheduledWindowEnd: string | null;
  completed: boolean;
  emptyBacsRetrieved: number;
  pharmacy: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    bacsCount: number;
    contactName: string | null;
    contactPhone: string | null;
    notes: string | null;
    earlyAccessEnabled: boolean;
    earlyAccessTime: string | null;
  };
}

interface StopCardProps {
  stop: StopCardData;
  color: string;
  onUpdate: (patch: { completed?: boolean; emptyBacsRetrieved?: number }) => void;
}

export function StopCard({ stop, color, onUpdate }: StopCardProps) {
  const [bacsInput, setBacsInput] = React.useState(String(stop.emptyBacsRetrieved));
  const usesEarlyAccess =
    stop.pharmacy.earlyAccessEnabled &&
    stop.pharmacy.earlyAccessTime &&
    stop.scheduledWindowStart === stop.pharmacy.earlyAccessTime;

  React.useEffect(() => {
    setBacsInput(String(stop.emptyBacsRetrieved));
  }, [stop.emptyBacsRetrieved]);

  function commitBacs(nextValue: number) {
    const clamped = Math.max(0, Math.min(999, Number.isFinite(nextValue) ? nextValue : 0));
    setBacsInput(String(clamped));
    if (clamped !== stop.emptyBacsRetrieved) onUpdate({ emptyBacsRetrieved: clamped });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 print:break-inside-avoid",
        stop.completed ? "border-success/40 bg-success/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: color }}
          >
            {stop.sequence}
          </span>
          <div>
            <p className="font-semibold leading-tight">{stop.pharmacy.name}</p>
            <p className="text-sm text-muted-foreground">
              {stop.pharmacy.address}, {stop.pharmacy.postalCode} {stop.pharmacy.city}
            </p>
            {stop.pharmacy.contactName && (
              <p className="text-xs text-muted-foreground">{stop.pharmacy.contactName}</p>
            )}
            {stop.pharmacy.contactPhone && (
              <a
                href={`tel:${stop.pharmacy.contactPhone}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Phone className="h-3 w-3" />
                {stop.pharmacy.contactPhone}
              </a>
            )}
          </div>
        </div>
        {stop.withinTimeWindow ? (
          <Badge variant="success" className="shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0">
            <AlertTriangle className="h-3 w-3" />
            Hors créneau
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3" />
          {stop.scheduledWindowStart}–{stop.scheduledWindowEnd}
          {stop.deliveryPeriod && (
            <span className="font-sans">({DELIVERY_PERIOD_LABELS[stop.deliveryPeriod]})</span>
          )}
        </span>
        {usesEarlyAccess && (
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <KeyRound className="h-3 w-3" />
            Accès sas/clé — livraison possible avant l&apos;ouverture officielle
          </span>
        )}
        <span>ETA {stop.etaArrival}</span>
        <span className="inline-flex items-center gap-1">
          <Package className="h-3 w-3" />
          {stop.pharmacy.bacsCount} bac{stop.pharmacy.bacsCount > 1 ? "s" : ""} à livrer
        </span>
      </div>

      {stop.pharmacy.notes && (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
          {stop.pharmacy.notes}
        </p>
      )}

      {/* Contrôles interactifs (masqués à l'impression) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={stop.completed}
            onChange={(e) => onUpdate({ completed: e.target.checked })}
            className="h-5 w-5 rounded border-input accent-primary"
          />
          Livraison effectuée
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Bacs vides récupérés</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => commitBacs(Number(bacsInput || "0") - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <input
              type="number"
              min={0}
              value={bacsInput}
              onChange={(e) => setBacsInput(e.target.value)}
              onBlur={() => commitBacs(Number(bacsInput))}
              className="h-7 w-12 rounded-md border border-input bg-background text-center text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => commitBacs(Number(bacsInput || "0") + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Version papier : case à cocher et ligne à compléter à la main */}
      <div className="hidden items-center justify-between border-t border-border pt-3 text-sm print:flex">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center border border-foreground text-[10px] leading-none">
            {stop.completed ? "✓" : ""}
          </span>
          Livraison effectuée
        </span>
        <span>Bacs vides récupérés : {stop.emptyBacsRetrieved > 0 ? stop.emptyBacsRetrieved : "______"}</span>
      </div>
    </div>
  );
}
