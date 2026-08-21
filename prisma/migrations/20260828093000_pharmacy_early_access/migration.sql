-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_pharmacies" ("address", "apbCode", "bacsCount", "city", "contactName", "contactPhone", "createdAt", "id", "isActive", "latitude", "longitude", "name", "notes", "postalCode", "serviceTimeMinutes", "updatedAt") SELECT "address", "apbCode", "bacsCount", "city", "contactName", "contactPhone", "createdAt", "id", "isActive", "latitude", "longitude", "name", "notes", "postalCode", "serviceTimeMinutes", "updatedAt" FROM "pharmacies";
DROP TABLE "pharmacies";
ALTER TABLE "new_pharmacies" RENAME TO "pharmacies";
CREATE UNIQUE INDEX "pharmacies_apbCode_key" ON "pharmacies"("apbCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

