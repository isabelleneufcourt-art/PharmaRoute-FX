import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { depotSchema } from "@/lib/validations";

export async function GET() {
  const depot = await prisma.depot.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ depot });
}

/**
 * Crée ou met à jour le dépôt principal (raccourci du tableau de bord).
 * PharmaRoute FX gère désormais plusieurs dépôts (voir `/depots` et
 * `/api/depots`) : cette route reste un raccourci pour éditer rapidement le
 * dépôt principal — celui utilisé par défaut pour les pharmacies sans
 * affectation explicite et pré-sélectionné à l'écran Optimisation.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, ...data } = depotSchema.parse(body);

    const existing = await prisma.depot.findFirst({ where: { isDefault: true } });

    const depot = existing
      ? await prisma.depot.update({ where: { id: existing.id }, data: { ...data, code: code || null } })
      : await prisma.depot.create({ data: { ...data, code: code || null, isDefault: true } });

    return NextResponse.json({ depot });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données du dépôt invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/depot]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
