import Link from "next/link";
import { ArrowLeft, Route as RouteIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OptimizePage() {
  const [depot, pharmacyCount] = await Promise.all([
    prisma.depot.findFirst({ where: { isActive: true } }),
    prisma.pharmacy.count(),
  ]);

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Lancer une optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Écran 2 — choix du nombre de véhicules et de l&apos;heure de départ du dépôt (VRPTW).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-primary" />
            <CardTitle>Prochaine étape</CardTitle>
          </div>
          <CardDescription>
            Ce formulaire de lancement (véhicules, heure de départ, appel au solver VRPTW) sera
            construit à l&apos;étape suivante, une fois le dépôt et les pharmacies en place.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            Dépôt configuré :{" "}
            <span className="font-medium">{depot ? depot.name : "aucun pour le moment"}</span>
          </p>
          <p>
            Pharmacies importées : <span className="font-medium">{pharmacyCount}</span>
          </p>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Retour au dépôt & pharmacies
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
