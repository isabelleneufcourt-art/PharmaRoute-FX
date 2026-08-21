import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const assignDriverSchema = z
  .object({
    driverId: z.string().min(1).nullable(),
  })
  .strict();

/** Assigne (ou retire) le chauffeur d'une tournée. Réservé aux dispatchers. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { driverId } = assignDriverSchema.parse(body);

    if (driverId) {
      const driver = await prisma.user.findUnique({ where: { id: driverId } });
      if (!driver || driver.role !== "DRIVER") {
        return NextResponse.json({ error: "Chauffeur introuvable" }, { status: 400 });
      }
    }

    const route = await prisma.route.update({
      where: { id: params.id },
      data: { driverId },
    });

    return NextResponse.json({ route });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/routes/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
