import { DepotList } from "@/components/depots/depot-list";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DepotsPage() {
  const depots = await prisma.depot.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { pharmacies: true } } },
  });

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Gestion des dépôts</h1>
        <p className="text-sm text-muted-foreground">
          Créez et gérez plusieurs dépôts/secteurs. Le dépôt principal est utilisé par défaut pour
          les pharmacies sans affectation explicite et pré-sélectionné à l&apos;écran
          Optimisation.
        </p>
      </div>

      <DepotList depots={depots} />
    </div>
  );
}
