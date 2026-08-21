import { PharmacyMapView } from "@/components/pharmacies/pharmacy-map-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PharmacyMapPage() {
  const [pharmacies, depots] = await Promise.all([
    prisma.pharmacy.findMany({
      where: { isActive: true },
      select: {
        id: true,
        apbCode: true,
        name: true,
        address: true,
        postalCode: true,
        city: true,
        latitude: true,
        longitude: true,
        bacsCount: true,
        depotId: true,
      },
      orderBy: [{ postalCode: "asc" }, { name: "asc" }],
    }),
    prisma.depot.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const defaultDepotId = depots.find((d) => d.isDefault)?.id ?? depots[0]?.id ?? "";

  return <PharmacyMapView pharmacies={pharmacies} depots={depots} defaultDepotId={defaultDepotId} />;
}
