import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Clock,
  KeyRound,
  Mail,
  MapPinned,
  Phone,
  Route as RouteIcon,
  StickyNote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PharmacyFormDialog } from "@/components/dashboard/pharmacy-form-dialog";
import { prisma } from "@/lib/prisma";
import { DELIVERY_PERIOD_LABELS, WEEKDAY_LABELS, WEEKDAYS } from "@/lib/weekday";

export const dynamic = "force-dynamic";

export default async function PharmacyDetailPage({ params }: { params: { id: string } }) {
  const [pharmacy, depots] = await Promise.all([
    prisma.pharmacy.findUnique({
      where: { id: params.id },
      include: {
        depot: true,
        timeWindows: true,
        tourStops: {
          orderBy: { sequence: "asc" },
          include: { tourTemplate: true },
        },
      },
    }),
    prisma.depot.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!pharmacy) notFound();

  const byDay = new Map(WEEKDAYS.map((day) => [day, pharmacy.timeWindows.filter((w) => w.weekday === day)]));

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{pharmacy.name}</h1>
          <p className="text-sm text-muted-foreground">
            {pharmacy.apbCode} — {pharmacy.address}, {pharmacy.postalCode} {pharmacy.city}
          </p>
        </div>
        <PharmacyFormDialog pharmacy={pharmacy} depots={depots} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <InfoBlock
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="Dépôt d'affectation"
                value={pharmacy.depot?.name ?? "Principal"}
              />
              <InfoBlock
                icon={<Boxes className="h-3.5 w-3.5" />}
                label="Bacs moyens (estimation)"
                value={`${pharmacy.bacsCount} bac${pharmacy.bacsCount > 1 ? "s" : ""}`}
              />
              <InfoBlock
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Temps de déchargement"
                value={`${pharmacy.serviceTimeMinutes} min`}
              />
              {pharmacy.contactName && (
                <InfoBlock
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Contact"
                  value={pharmacy.contactName}
                />
              )}
              {pharmacy.contactPhone && (
                <InfoBlock
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Téléphone"
                  value={pharmacy.contactPhone}
                />
              )}
              {pharmacy.earlyAccessEnabled && pharmacy.earlyAccessTime && (
                <InfoBlock
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  label="Accès anticipé (sas/clé)"
                  value={`Dès ${pharmacy.earlyAccessTime}`}
                />
              )}
              {pharmacy.notes && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                    {pharmacy.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grille horaire hebdomadaire</CardTitle>
              <CardDescription>Créneaux de livraison réels de l&apos;officine.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WEEKDAYS.map((day) => {
                  const windows = byDay.get(day) ?? [];
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{WEEKDAY_LABELS[day]}</span>
                      {windows.length === 0 ? (
                        <span className="text-xs text-muted-foreground line-through">Fermé</span>
                      ) : (
                        <span className="flex flex-col items-end text-xs text-muted-foreground">
                          {windows.map((w) => (
                            <span key={w.id}>
                              {DELIVERY_PERIOD_LABELS[w.period]} {w.startTime}–{w.endTime}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-primary" />
              <CardTitle>Tournées types</CardTitle>
            </div>
            <CardDescription>
              Plans de transport récurrents dans lesquels cette pharmacie est inscrite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pharmacy.tourStops.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <MapPinned className="h-5 w-5" />
                <p>Cette pharmacie n&apos;est inscrite dans aucune tournée type.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/tournees">Gérer les tournées types</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {pharmacy.tourStops.map((membership) => (
                  <li key={membership.tourTemplateId}>
                    <Link
                      href={`/tournees/${membership.tourTemplate.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent/50"
                    >
                      <span>
                        <span className="font-medium">{membership.tourTemplate.name}</span>
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                          {membership.tourTemplate.code}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Arrêt n°{membership.sequence}
                        </span>
                      </span>
                      {membership.tourTemplate.period && (
                        <Badge variant="outline" className="shrink-0">
                          {DELIVERY_PERIOD_LABELS[membership.tourTemplate.period]}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
