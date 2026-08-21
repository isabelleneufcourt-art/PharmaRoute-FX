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
  const [depots, pharmacies, recentOptimizations] = await Promise.all([
    prisma.depot.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.pharmacy.findMany({
      where: { isActive: true },
      select: { id: true, apbCode: true, name: true, postalCode: true, city: true, depotId: true },
      orderBy: [{ postalCode: "asc" }, { name: "asc" }],
    }),
    prisma.optimization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const defaultDepot = depots.find((d) => d.isDefault) ?? depots[0] ?? null;
  const pharmacyCount = pharmacies.length;
  const canOptimize = depots.length > 0 && pharmacyCount > 0;
  const suggestedVehicleCount = Math.max(1, Math.min(8, Math.ceil(pharmacyCount / 4) || 1));
  const solverAvailability = getSolverAvailability();

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Lancer une optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Calcul des tournées (VRPTW) à partir du dépôt sélectionné et des pharmacies importées.
        </p>
      </div>

      {!canOptimize && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col items-start gap-3 py-4 text-sm sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <div className="flex-1">
              {depots.length === 0 && <p>Configurez d&apos;abord au moins un dépôt.</p>}
              {depots.length > 0 && pharmacyCount === 0 && (
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
        depots={depots}
        defaultDepotId={defaultDepot?.id ?? ""}
        defaultDepartureTime={defaultDepot?.openingTime ?? "06:30"}
        pharmacies={pharmacies}
        suggestedVehicleCount={suggestedVehicleCount}
        disabled={!canOptimize}
        solverAvailability={solverAvailability}
      />

      <OptimizationHistory optimizations={recentOptimizations} />
    </div>
  );
}
