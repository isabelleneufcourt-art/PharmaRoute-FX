import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { depotSchema } from "@/lib/validations";

export async function GET() {
  const depot = await prisma.depot.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ depot });
}

/**
 * Crée ou met à jour le dépôt central.
 * Pour cette V1, PharmaRoute FX gère un dépôt central unique : on met à jour
 * le premier dépôt actif s'il existe, sinon on en crée un nouveau.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = depotSchema.parse(body);

    const existing = await prisma.depot.findFirst({ where: { isActive: true } });

    const depot = existing
      ? await prisma.depot.update({ where: { id: existing.id }, data })
      : await prisma.depot.create({ data });

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
