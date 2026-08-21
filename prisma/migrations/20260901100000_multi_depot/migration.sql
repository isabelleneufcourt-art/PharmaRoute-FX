-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_depots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "openingTime" TEXT NOT NULL DEFAULT '06:30',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_depots" ("address", "city", "createdAt", "id", "isActive", "latitude", "longitude", "name", "openingTime", "postalCode", "updatedAt") SELECT "address", "city", "createdAt", "id", "isActive", "latitude", "longitude", "name", "openingTime", "postalCode", "updatedAt" FROM "depots";
DROP TABLE "depots";
ALTER TABLE "new_depots" RENAME TO "depots";
CREATE UNIQUE INDEX "depots_code_key" ON "depots"("code");
CREATE TABLE "new_pharmacies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apbCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "bacsCount" INTEGER NOT NULL DEFAULT 1,
    "serviceTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "earlyAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "earlyAccessTime" TEXT,
    "depotId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pharmacies_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pharmacies" ("address", "apbCode", "bacsCount", "city", "contactName", "contactPhone", "createdAt", "earlyAccessEnabled", "earlyAccessTime", "id", "isActive", "latitude", "longitude", "name", "notes", "postalCode", "serviceTimeMinutes", "updatedAt") SELECT "address", "apbCode", "bacsCount", "city", "contactName", "contactPhone", "createdAt", "earlyAccessEnabled", "earlyAccessTime", "id", "isActive", "latitude", "longitude", "name", "notes", "postalCode", "serviceTimeMinutes", "updatedAt" FROM "pharmacies";
DROP TABLE "pharmacies";
ALTER TABLE "new_pharmacies" RENAME TO "pharmacies";
CREATE UNIQUE INDEX "pharmacies_apbCode_key" ON "pharmacies"("apbCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Marque le dépôt actif existant comme dépôt principal (gestion multi-dépôts) :
-- avant cette migration, l'application ne gérait qu'un seul dépôt actif à la fois.
UPDATE "depots"
SET "isDefault" = true
WHERE "id" = (SELECT "id" FROM "depots" WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1);

