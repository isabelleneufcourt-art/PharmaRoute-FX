import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResultsPage() {
  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Résultats de l&apos;optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Écran 3 — vue « split-screen » : tournées calculées à gauche, carte Leaflet à droite.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <CardTitle>Prochaine étape</CardTitle>
          </div>
          <CardDescription>
            Cette vue affichera, une fois le solver branché : la liste des tournées par véhicule
            avec ETA et respect des fenêtres horaires, ainsi que la carte interactive des
            itinéraires.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
