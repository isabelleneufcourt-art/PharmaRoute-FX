import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { pharmacySchema } from "@/lib/validations";

const importBodySchema = z.object({
  pharmacies: z.array(pharmacySchema).min(1, "Aucune pharmacie valide à importer"),
});

/**
 * Import en masse (CSV/Excel déjà parsé côté client).
 * Fait un upsert par code APB : un ré-import met à jour les pharmacies existantes
 * au lieu de créer des doublons.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pharmacies } = importBodySchema.parse(body);

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const data of pharmacies) {
        const existing = await tx.pharmacy.findUnique({ where: { apbCode: data.apbCode } });
        await tx.pharmacy.upsert({
          where: { apbCode: data.apbCode },
          create: data,
          update: data,
        });
        if (existing) updated += 1;
        else created += 1;
      }
    });

    return NextResponse.json({ success: true, created, updated, total: pharmacies.length });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Fichier d'import invalide", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/pharmacies/import]", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'import" }, { status: 500 });
  }
}
