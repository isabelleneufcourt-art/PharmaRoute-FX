import { PrismaClient } from "@/generated/prisma/client";

// Évite de recréer une nouvelle instance de PrismaClient à chaque hot-reload
// en développement (Next.js App Router).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
