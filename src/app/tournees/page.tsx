import { TourTemplateList } from "@/components/tournees/tour-template-list";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TourneesPage() {
  const [tourTemplatesRaw, depots, pharmacies] = await Promise.all([
    prisma.tourTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      include: {
        depot: true,
        _count: { select: { stops: true } },
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

  const tourTemplates = tourTemplatesRaw.map((t) => ({
    ...t,
    totalBacs: t.stops.reduce((sum, s) => sum + s.pharmacy.bacsCount, 0),
  }));

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Tournées types</h1>
        <p className="text-sm text-muted-foreground">
          Modélisez vos plans de transport généraux récurrents (circuits théoriques),
          indépendamment des optimisations ponctuelles par date. Chaque tournée regroupe un
          ensemble fixe de pharmacies dans un ordre de passage théorique, avec une charge
          moyenne estimée (bacs) pour équilibrer la capacité des véhicules.
        </p>
      </div>

      <TourTemplateList tourTemplates={tourTemplates} depots={depots} pharmacies={pharmacies} />
    </div>
  );
}
