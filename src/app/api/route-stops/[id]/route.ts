import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { routeStopUpdateSchema } from "@/lib/validations";

/**
 * Mise à jour terrain d'un arrêt par le chauffeur : livraison effectuée
 * (case à cocher) et/ou nombre de bacs vides récupérés au passage.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = routeStopUpdateSchema.parse(body);

    const routeStop = await prisma.routeStop.update({
      where: { id: params.id },
      data: {
        ...(data.completed !== undefined && {
          completed: data.completed,
          completedAt: data.completed ? new Date() : null,
        }),
        ...(data.emptyBacsRetrieved !== undefined && {
          emptyBacsRetrieved: data.emptyBacsRetrieved,
        }),
      },
    });

    return NextResponse.json({ routeStop });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/route-stops/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
