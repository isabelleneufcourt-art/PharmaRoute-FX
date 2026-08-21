import { prisma } from "@/lib/prisma";
import { DepotCard } from "@/components/dashboard/depot-card";
import { PharmacyImport } from "@/components/dashboard/pharmacy-import";
import { PharmacyList } from "@/components/dashboard/pharmacy-list";

// Toujours lire l'état courant de la base (dépôt / pharmacies modifiés via l'UI).
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [depot, pharmacies] = await Promise.all([
    prisma.depot.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.pharmacy.findMany({ orderBy: [{ postalCode: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Configurez votre dépôt central puis importez la liste de vos pharmacies clientes pour
          préparer une optimisation de tournée.
        </p>
      </div>

      <DepotCard depot={depot} />
      <PharmacyImport />
      <PharmacyList pharmacies={pharmacies} />
    </div>
  );
}
