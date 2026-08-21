import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { OptimizationHistory } from "@/components/optimize/optimization-history";
import { OptimizeForm } from "@/components/optimize/optimize-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSolverAvailability } from "@/lib/solver";

export const dynamic = "force-dynamic";

export default async function OptimizePage() {
  const [depot, pharmacies, recentOptimizations] = await Promise.all([
    prisma.depot.findFirst({ where: { isActive: true } }),
    prisma.pharmacy.findMany({
      where: { isActive: true },
      select: { id: true, apbCode: true, name: true, postalCode: true, city: true },
      orderBy: [{ postalCode: "asc" }, { name: "asc" }],
    }),
    prisma.optimization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const pharmacyCount = pharmacies.length;
  const canOptimize = Boolean(depot) && pharmacyCount > 0;
  const suggestedVehicleCount = Math.max(1, Math.min(8, Math.ceil(pharmacyCount / 4) || 1));
  const solverAvailability = getSolverAvailability();

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Lancer une optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Calcul des tournées (VRPTW) à partir du dépôt central et des pharmacies importées.
        </p>
      </div>

      {!canOptimize && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col items-start gap-3 py-4 text-sm sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <div className="flex-1">
              {!depot && <p>Configurez d&apos;abord le dépôt central.</p>}
              {depot && pharmacyCount === 0 && (
                <p>Importez au moins une pharmacie avant de lancer une optimisation.</p>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Aller au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <OptimizeForm
        defaultDepartureTime={depot?.openingTime ?? "06:30"}
        pharmacies={pharmacies}
        suggestedVehicleCount={suggestedVehicleCount}
        disabled={!canOptimize}
        solverAvailability={solverAvailability}
      />

      <OptimizationHistory optimizations={recentOptimizations} />
    </div>
  );
}
