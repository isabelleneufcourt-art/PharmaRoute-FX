import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { pharmacySchema } from "@/lib/validations";

export async function GET() {
  const pharmacies = await prisma.pharmacy.findMany({
    orderBy: [{ postalCode: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ pharmacies });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = pharmacySchema.parse(body);

    const existing = await prisma.pharmacy.findUnique({ where: { apbCode: data.apbCode } });
    if (existing) {
      return NextResponse.json(
        { error: `Une pharmacie avec le code APB ${data.apbCode} existe déjà` },
        { status: 409 }
      );
    }

    const pharmacy = await prisma.pharmacy.create({ data });
    return NextResponse.json({ pharmacy }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Données de la pharmacie invalides", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/pharmacies]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
