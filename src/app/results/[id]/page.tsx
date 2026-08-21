import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock, Gauge, MapPinned, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteListPanel } from "@/components/results/route-list-panel";
import { RouteMapLoader } from "@/components/results/route-map-loader";
import { formatDurationMinutes } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResultsDetailPage({ params }: { params: { id: string } }) {
  const optimization = await prisma.optimization.findUnique({
    where: { id: params.id },
    include: {
      depot: true,
      routes: {
        orderBy: { vehicleIndex: "asc" },
        include: {
          stops: {
            orderBy: { sequence: "asc" },
            include: { pharmacy: true },
          },
        },
      },
    },
  });

  if (!optimization) notFound();

  if (optimization.status === "FAILED") {
    return (
      <div className="container flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Cette optimisation a échoué{optimization.errorMessage ? ` : ${optimization.errorMessage}` : "."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/optimize">
            <ArrowLeft className="h-4 w-4" />
            Relancer une optimisation
          </Link>
        </Button>
      </div>
    );
  }

  const totalStops = optimization.routes.reduce((sum, r) => sum + r.stops.length, 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/results">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold">{optimization.depot.name}</p>
            <p className="text-xs text-muted-foreground">
              Départ {optimization.departureTime} —{" "}
              {new Date(optimization.createdAt).toLocaleString("fr-BE")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Truck className="h-3 w-3" />
            {optimization.routes.length} véhicule{optimization.routes.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            <MapPinned className="h-3 w-3" />
            {totalStops} arrêt{totalStops > 1 ? "s" : ""}
          </Badge>
          {optimization.totalDistanceKm != null && (
            <Badge variant="outline">
              <Gauge className="h-3 w-3" />
              {optimization.totalDistanceKm.toFixed(1)} km
            </Badge>
          )}
          {optimization.totalDurationMin != null && (
            <Badge variant="outline">
              <Clock className="h-3 w-3" />
              {formatDurationMinutes(optimization.totalDurationMin)}
            </Badge>
          )}
          {optimization.violationsCount != null && optimization.violationsCount > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {optimization.violationsCount} hors créneau
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="no-print w-full overflow-y-auto border-b border-border lg:w-[440px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <RouteListPanel routes={optimization.routes} />
        </div>
        <div className="relative min-h-[400px] flex-1">
          <RouteMapLoader depot={optimization.depot} routes={optimization.routes} />
        </div>
      </div>
    </div>
  );
}
