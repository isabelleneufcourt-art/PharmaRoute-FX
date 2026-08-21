import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { depotSchema } from "@/lib/validations";

export async function GET() {
  const depots = await prisma.depot.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { pharmacies: true } } },
  });
  return NextResponse.json({ depots });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, ...data } = depotSchema.parse(body);

    if (code) {
      const existing = await prisma.depot.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { error: `Un dépôt avec le code ${code} existe déjà`, issues: [{ path: ["code"], message: "Code déjà utilisé" }] },
          { status: 409 }
        );
      }
    }

    // Le tout premier dépôt créé devient automatiquement le dépôt principal.
    const depotCount = await prisma.depot.count();

    const depot = await prisma.depot.create({
      data: { ...data, code: code || null, isDefault: depotCount === 0 },
    });
    return NextResponse.json({ depot }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données du dépôt invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/depots]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
