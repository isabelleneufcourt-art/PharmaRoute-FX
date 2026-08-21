import Link from "next/link";
import { AlertCircle, CheckCircle2, ClipboardList, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Terminée",
  FAILED: "Échouée",
  RUNNING: "En cours",
  PENDING: "En attente",
};

export default async function ResultsIndexPage() {
  const optimizations = await prisma.optimization.findMany({
    orderBy: { createdAt: "desc" },
    include: { depot: true, routes: { select: { id: true } } },
    take: 30,
  });

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Résultats des optimisations</h1>
        <p className="text-sm text-muted-foreground">
          Retrouvez les tournées calculées lors de vos précédentes optimisations.
        </p>
      </div>

      {optimizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
            <p>Aucune optimisation n&apos;a encore été calculée.</p>
            <Button asChild size="sm">
              <Link href="/optimize">Lancer une optimisation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {optimizations.map((opt) => (
            <Link key={opt.id} href={`/results/${opt.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Livraison du{" "}
                      {new Date(opt.deliveryDate).toLocaleDateString("fr-BE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </CardTitle>
                    {opt.status === "COMPLETED" && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {opt.status === "FAILED" && <XCircle className="h-4 w-4 text-destructive" />}
                    {opt.status !== "COMPLETED" && opt.status !== "FAILED" && (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription>
                    {opt.depot.name} — calculé à{" "}
                    {new Date(opt.createdAt).toLocaleTimeString("fr-BE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">
                    {opt.routes.length} véhicule{opt.routes.length > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary">{STATUS_LABEL[opt.status] ?? opt.status}</Badge>
                  {opt.totalDistanceKm != null && (
                    <Badge variant="outline">{opt.totalDistanceKm.toFixed(1)} km</Badge>
                  )}
                  {opt.totalDurationMin != null && (
                    <Badge variant="outline">{formatDurationMinutes(opt.totalDurationMin)}</Badge>
                  )}
                  {opt.violationsCount != null && opt.violationsCount > 0 && (
                    <Badge variant="warning">
                      <AlertCircle className="h-3 w-3" />
                      {opt.violationsCount}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
