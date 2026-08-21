import path from "node:path";

import { PrismaClient } from "@/generated/prisma/client";

// Évite de recréer une nouvelle instance de PrismaClient à chaque hot-reload
// en développement (Next.js App Router).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Le générateur de client Prisma "prisma-client" (TS) résout les chemins
 * SQLite relatifs ("file:./dev.db") par rapport à l'emplacement du bundle
 * webpack au moment de l'exécution — qui varie selon la route Next.js
 * (ex: .next/server/app/login/dev.db) au lieu de la racine du projet. On
 * convertit donc systématiquement en chemin absolu, stable quel que soit
 * le bundling.
 */
function resolveDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  if (raw.startsWith("file:") && !raw.startsWith("file:/")) {
    const relativePath = raw.slice("file:".length);
    return `file:${path.resolve(process.cwd(), "prisma", relativePath)}`;
  }
  return raw;
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resolveDatasourceUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
