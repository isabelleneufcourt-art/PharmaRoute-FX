import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { weeklyWindowsToRows } from "@/lib/pharmacy-windows";
import { prisma } from "@/lib/prisma";
import { pharmacyImportRowSchema } from "@/lib/validations";

const importBodySchema = z.object({
  // Revalidation serveur avec le schéma « import » (tolérant : une grille sans
  // aucun créneau reste acceptée) — doit rester cohérent avec la validation faite
  // côté client lors du parsing du fichier (src/lib/import/parse-pharmacies.ts).
  pharmacies: z.array(pharmacyImportRowSchema).min(1, "Aucune pharmacie valide à importer"),
});

/**
 * Nombre de pharmacies traitées par transaction. Un import volumineux (plusieurs
 * milliers de lignes, ex: import régional complet) dépasserait le délai par défaut
 * d'une transaction Prisma (5 s) s'il était traité en un seul bloc — on découpe donc
 * en lots, chacun validé/inséré dans sa propre transaction courte.
 */
const BATCH_SIZE = 200;
/** Marge de sécurité par lot (bien au-delà du temps réel attendu pour 200 lignes). */
const BATCH_TRANSACTION_TIMEOUT_MS = 20_000;

/**
 * Import en masse (CSV/Excel déjà parsé côté client).
 * Fait un upsert par code APB : un ré-import met à jour les pharmacies existantes
 * (et remplace intégralement leur grille horaire) au lieu de créer des doublons.
 * Traité par lots pour rester robuste sur de gros fichiers (plusieurs milliers de
 * lignes) — l'opération est idempotente (upsert), un nouvel essai après un échec
 * partiel ne duplique donc jamais les pharmacies déjà importées.
 */
export async function POST(request: NextRequest) {
  let created = 0;
  let updated = 0;
  let processed = 0;
  let total = 0;

  try {
    const body = await request.json();
    const { pharmacies } = importBodySchema.parse(body);
    total = pharmacies.length;

    for (let i = 0; i < pharmacies.length; i += BATCH_SIZE) {
      const batch = pharmacies.slice(i, i + BATCH_SIZE);
      const apbCodes = batch.map((p) => p.apbCode);

      await prisma.$transaction(
        async (tx) => {
          // Un seul aller-retour pour connaître les codes APB déjà présents dans ce
          // lot, plutôt qu'un findUnique par ligne (2x moins de requêtes au total).
          const existing = await tx.pharmacy.findMany({
            where: { apbCode: { in: apbCodes } },
            select: { apbCode: true },
          });
          const existingCodes = new Set(existing.map((p) => p.apbCode));

          for (const { timeWindows, ...data } of batch) {
            const rows = weeklyWindowsToRows(timeWindows);
            await tx.pharmacy.upsert({
              where: { apbCode: data.apbCode },
              create: { ...data, timeWindows: { create: rows } },
              update: { ...data, timeWindows: { deleteMany: {}, create: rows } },
            });
            if (existingCodes.has(data.apbCode)) updated += 1;
            else created += 1;
          }
        },
        { timeout: BATCH_TRANSACTION_TIMEOUT_MS }
      );

      processed += batch.length;
    }

    return NextResponse.json({ success: true, created, updated, total });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Fichier d'import invalide", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/pharmacies/import]", error);

    // Échec en cours de route sur un gros fichier : on indique ce qui a déjà été
    // importé (les lots précédents sont acquis, l'upsert rend un nouvel essai sûr)
    // plutôt que de laisser croire que rien n'a été fait.
    const partialNote =
      processed > 0 ? ` ${processed}/${total} pharmacie(s) avaient déjà été importées avant l'échec.` : "";
    return NextResponse.json(
      { error: `Erreur serveur lors de l'import.${partialNote}`, created, updated, total },
      { status: 500 }
    );
  }
}
