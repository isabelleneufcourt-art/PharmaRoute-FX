import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { DriverSheetView } from "@/components/driver-sheet/driver-sheet-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DriverSheetPage({ params }: { params: { routeId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const route = await prisma.route.findUnique({
    where: { id: params.routeId },
    include: {
      optimization: { include: { depot: true } },
      stops: {
        orderBy: { sequence: "asc" },
        include: { pharmacy: true },
      },
    },
  });

  if (!route) notFound();

  // Un chauffeur ne peut consulter que les feuilles de route qui lui sont assignées.
  // Un dispatcher peut consulter/imprimer n'importe quelle tournée.
  if (session.user.role === "DRIVER" && route.driverId !== session.user.id) {
    redirect("/my-routes");
  }

  return <DriverSheetView route={route} />;
}
