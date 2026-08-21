import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { depotSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { code, ...data } = depotSchema.parse(body);

    if (code) {
      const conflict = await prisma.depot.findFirst({ where: { code, NOT: { id: params.id } } });
      if (conflict) {
        return NextResponse.json(
          { error: `Un autre dépôt utilise déjà le code ${code}`, issues: [{ path: ["code"], message: "Code déjà utilisé" }] },
          { status: 409 }
        );
      }
    }

    const depot = await prisma.depot.update({
      where: { id: params.id },
      data: { ...data, code: code || null },
    });
    return NextResponse.json({ depot });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données du dépôt invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/depots/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const depot = await prisma.depot.findUnique({ where: { id: params.id } });
    if (!depot) {
      return NextResponse.json({ error: "Dépôt introuvable" }, { status: 404 });
    }
    if (depot.isDefault) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer le dépôt principal : définissez d'abord un autre dépôt comme principal",
        },
        { status: 409 }
      );
    }
    const usedByOptimizations = await prisma.optimization.count({ where: { depotId: params.id } });
    if (usedByOptimizations > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un dépôt utilisé par des optimisations existantes" },
        { status: 409 }
      );
    }

    // Les pharmacies affectées à ce dépôt retombent sur le dépôt principal (depotId = null).
    await prisma.depot.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/depots/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
