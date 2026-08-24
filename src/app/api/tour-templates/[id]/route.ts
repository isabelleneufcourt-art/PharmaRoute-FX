import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { tourTemplateSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const tourTemplate = await prisma.tourTemplate.findUnique({
    where: { id: params.id },
    include: {
      depot: true,
      stops: { orderBy: { sequence: "asc" }, include: { pharmacy: true } },
    },
  });
  if (!tourTemplate) {
    return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  }
  return NextResponse.json({ tourTemplate });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { stops, ...data } = tourTemplateSchema.parse(body);

    const conflict = await prisma.tourTemplate.findFirst({
      where: { code: data.code, NOT: { id: params.id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Une autre tournée utilise déjà le code ${data.code}` },
        { status: 409 }
      );
    }

    // La liste des arrêts est toujours resoumise en entier par le formulaire : on
    // remplace simplement toutes les lignes existantes (même schéma que la grille
    // horaire des pharmacies).
    const tourTemplate = await prisma.$transaction(async (tx) => {
      await tx.tourTemplateStop.deleteMany({ where: { tourTemplateId: params.id } });
      return tx.tourTemplate.update({
        where: { id: params.id },
        data: {
          ...data,
          vehicleLabel: data.vehicleLabel || null,
          notes: data.notes || null,
          stops: { create: stops },
        },
        include: { depot: true, stops: { include: { pharmacy: true } } },
      });
    });

    return NextResponse.json({ tourTemplate });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données de la tournée invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/tour-templates/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.tourTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tour-templates/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
