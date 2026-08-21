import { notFound } from "next/navigation";

import { DriverSheetView } from "@/components/driver-sheet/driver-sheet-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DriverSheetPage({ params }: { params: { routeId: string } }) {
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

  return <DriverSheetView route={route} />;
}
