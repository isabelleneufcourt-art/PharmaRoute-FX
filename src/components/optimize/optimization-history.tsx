import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time";

interface OptimizationHistoryItem {
  id: string;
  status: string;
  createdAt: Date;
  vehicleCount: number;
  totalDistanceKm: number | null;
  totalDurationMin: number | null;
  violationsCount: number | null;
}

interface OptimizationHistoryProps {
  optimizations: OptimizationHistoryItem[];
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Terminée",
  FAILED: "Échouée",
  RUNNING: "En cours",
  PENDING: "En attente",
};

export function OptimizationHistory({ optimizations }: OptimizationHistoryProps) {
  if (optimizations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique récent</CardTitle>
        <CardDescription>Vos derniers calculs d&apos;optimisation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {optimizations.map((opt) => (
          <Link
            key={opt.id}
            href={`/results/${opt.id}`}
            className="-mx-5 flex flex-col gap-2 px-5 py-3 text-sm transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              {opt.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {opt.status === "FAILED" && <XCircle className="h-4 w-4 text-destructive" />}
              {opt.status !== "COMPLETED" && opt.status !== "FAILED" && (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{new Date(opt.createdAt).toLocaleString("fr-BE")}</span>
              <Badge variant="outline">
                {opt.vehicleCount} véhicule{opt.vehicleCount > 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">{STATUS_LABEL[opt.status] ?? opt.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {opt.totalDistanceKm != null && <span>{opt.totalDistanceKm.toFixed(1)} km</span>}
              {opt.totalDurationMin != null && (
                <span>{formatDurationMinutes(opt.totalDurationMin)}</span>
              )}
              {opt.violationsCount != null && opt.violationsCount > 0 && (
                <Badge variant="warning">{opt.violationsCount} retard(s)</Badge>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
