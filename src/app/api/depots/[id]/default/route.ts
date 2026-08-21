import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** Définit ce dépôt comme dépôt principal (un seul à la fois) — utilisé par
 *  défaut pour les pharmacies sans affectation explicite et pré-sélectionné
 *  à l'écran Optimisation. */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const depot = await prisma.depot.findUnique({ where: { id: params.id } });
    if (!depot || !depot.isActive) {
      return NextResponse.json({ error: "Dépôt introuvable" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.depot.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      prisma.depot.update({ where: { id: params.id }, data: { isDefault: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/depots/:id/default]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
