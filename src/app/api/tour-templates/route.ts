import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { tourTemplateSchema } from "@/lib/validations";

export async function GET() {
  const tourTemplates = await prisma.tourTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ code: "asc" }],
    include: {
      depot: true,
      _count: { select: { stops: true } },
      stops: { orderBy: { sequence: "asc" }, include: { pharmacy: true } },
    },
  });

  // Charge théorique = somme des bacs (estimés) des pharmacies incluses. Les arrêts
  // complets (avec pharmacie) sont conservés dans la réponse pour pré-remplir le
  // formulaire d'édition sans requête supplémentaire.
  const withTotals = tourTemplates.map((t) => ({
    ...t,
    totalBacs: t.stops.reduce((sum, s) => sum + s.pharmacy.bacsCount, 0),
  }));

  return NextResponse.json({ tourTemplates: withTotals });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stops, ...data } = tourTemplateSchema.parse(body);

    const existing = await prisma.tourTemplate.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json(
        { error: `Une tournée avec le code ${data.code} existe déjà` },
        { status: 409 }
      );
    }

    const tourTemplate = await prisma.tourTemplate.create({
      data: {
        ...data,
        vehicleLabel: data.vehicleLabel || null,
        notes: data.notes || null,
        stops: { create: stops },
      },
      include: { depot: true, stops: { include: { pharmacy: true } } },
    });
    return NextResponse.json({ tourTemplate }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données de la tournée invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/tour-templates]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
