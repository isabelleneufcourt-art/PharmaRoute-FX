import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Boxes, MapPinned, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TourTemplateFormDialog } from "@/components/tournees/tour-template-form-dialog";
import { TourTemplateMapLoader } from "@/components/tournees/tour-template-map-loader";
import { getRouteColor } from "@/lib/solver/colors";
import { DELIVERY_PERIOD_LABELS } from "@/lib/weekday";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TourTemplateDetailPage({ params }: { params: { id: string } }) {
  const [tourTemplate, depots, pharmacies] = await Promise.all([
    prisma.tourTemplate.findUnique({
      where: { id: params.id },
      include: {
        depot: true,
        stops: { orderBy: { sequence: "asc" }, include: { pharmacy: true } },
      },
    }),
    prisma.depot.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.pharmacy.findMany({
      where: { isActive: true },
      select: { id: true, apbCode: true, name: true, postalCode: true, city: true, bacsCount: true },
      orderBy: [{ postalCode: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!tourTemplate) notFound();

  const totalBacs = tourTemplate.stops.reduce((sum, s) => sum + s.pharmacy.bacsCount, 0);
  const overCapacity =
    tourTemplate.vehicleCapacityBacs != null && totalBacs > tourTemplate.vehicleCapacityBacs;
  const colorHex = getRouteColor(0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/tournees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold">
              {tourTemplate.name} <span className="text-muted-foreground">({tourTemplate.code})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {tourTemplate.depot.name}
              {tourTemplate.vehicleLabel ? ` — ${tourTemplate.vehicleLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tourTemplate.period && (
            <Badge variant="outline">{DELIVERY_PERIOD_LABELS[tourTemplate.period]}</Badge>
          )}
          <Badge variant="outline">
            <MapPinned className="h-3 w-3" />
            {tourTemplate.stops.length} arrêt{tourTemplate.stops.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant={overCapacity ? "warning" : "outline"}>
            {overCapacity && <AlertTriangle className="h-3 w-3" />}
            <Boxes className="h-3 w-3" />
            Charge théorique : {totalBacs}
            {tourTemplate.vehicleCapacityBacs != null ? ` / ${tourTemplate.vehicleCapacityBacs}` : ""}
          </Badge>
          <TourTemplateFormDialog
            tourTemplate={tourTemplate}
            depots={depots}
            pharmacies={pharmacies}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            }
          />
        </div>
      </div>

      {overCapacity && (
        <div className="no-print px-4 pt-3">
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-2.5 py-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                La charge théorique de cette tournée ({totalBacs} bacs) dépasse la capacité
                indiquée du véhicule ({tourTemplate.vehicleCapacityBacs} bacs). Envisagez de
                répartir certaines pharmacies vers une autre tournée.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="no-print w-full overflow-y-auto border-b border-border lg:w-[420px] lg:shrink-0 lg:border-b-0 lg:border-r">
          {tourTemplate.stops.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune pharmacie dans cette tournée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tourTemplate.stops.map((stop) => (
                <li key={stop.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: colorHex }}
                  >
                    {stop.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/pharmacies/${stop.pharmacy.id}`} className="font-medium hover:underline">
                      {stop.pharmacy.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {stop.pharmacy.address}, {stop.pharmacy.postalCode} {stop.pharmacy.city}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <Boxes className="h-3 w-3" />
                    {stop.pharmacy.bacsCount}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative min-h-[400px] flex-1">
          <TourTemplateMapLoader depot={tourTemplate.depot} stops={tourTemplate.stops} colorHex={colorHex} />
        </div>
      </div>
    </div>
  );
}
