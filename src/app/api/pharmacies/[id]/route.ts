import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { weeklyWindowsToRows } from "@/lib/pharmacy-windows";
import { prisma } from "@/lib/prisma";
import { pharmacySchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { timeWindows, ...data } = pharmacySchema.parse(body);

    const conflict = await prisma.pharmacy.findFirst({
      where: { apbCode: data.apbCode, NOT: { id: params.id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Une autre pharmacie utilise déjà le code APB ${data.apbCode}` },
        { status: 409 }
      );
    }

    // La grille horaire complète est toujours resoumise par le formulaire :
    // on remplace simplement toutes les lignes existantes.
    const pharmacy = await prisma.$transaction(async (tx) => {
      await tx.pharmacyTimeWindow.deleteMany({ where: { pharmacyId: params.id } });
      return tx.pharmacy.update({
        where: { id: params.id },
        data: { ...data, timeWindows: { create: weeklyWindowsToRows(timeWindows) } },
        include: { timeWindows: true },
      });
    });

    return NextResponse.json({ pharmacy });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données de la pharmacie invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/pharmacies/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.pharmacy.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/pharmacies/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
