import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { pharmacySchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = pharmacySchema.parse(body);

    const conflict = await prisma.pharmacy.findFirst({
      where: { apbCode: data.apbCode, NOT: { id: params.id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Une autre pharmacie utilise déjà le code APB ${data.apbCode}` },
        { status: 409 }
      );
    }

    const pharmacy = await prisma.pharmacy.update({ where: { id: params.id }, data });
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
