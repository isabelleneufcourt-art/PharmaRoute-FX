import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ClipboardList, MapPin, Truck } from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyRoutesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const routes = await prisma.route.findMany({
    where: { driverId: session.user.id },
    orderBy: { optimization: { deliveryDate: "desc" } },
    include: { optimization: { include: { depot: true } }, stops: true },
    take: 20,
  });

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Mes tournées</h1>
        <p className="text-sm text-muted-foreground">
          Bonjour {session.user.name} — voici les tournées qui vous ont été assignées.
        </p>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
            <p>Aucune tournée ne vous a encore été assignée.</p>
            <p>Votre dispatcher doit vous assigner une tournée depuis l&apos;écran Résultats.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => {
            const deliveredCount = route.stops.filter((s) => s.completed).length;
            return (
              <Link key={route.id} href={`/driver-sheet/${route.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: route.colorHex }}
                        aria-hidden
                      />
                      <CardTitle className="text-sm font-medium">{route.vehicleLabel}</CardTitle>
                      <Truck className="ml-auto h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {route.optimization.depot.name} —{" "}
                      {new Date(route.optimization.deliveryDate).toLocaleDateString("fr-BE", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        timeZone: "UTC",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">
                      {route.stops.length} arrêt{route.stops.length > 1 ? "s" : ""}
                    </Badge>
                    <Badge variant={deliveredCount === route.stops.length ? "success" : "outline"}>
                      <CheckCircle2 className="h-3 w-3" />
                      {deliveredCount}/{route.stops.length} livrées
                    </Badge>
                    <Badge variant="outline">Départ {route.optimization.departureTime}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
