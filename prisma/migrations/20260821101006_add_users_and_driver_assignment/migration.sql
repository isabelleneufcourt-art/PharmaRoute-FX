-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DRIVER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optimizationId" TEXT NOT NULL,
    "vehicleLabel" TEXT NOT NULL,
    "vehicleIndex" INTEGER NOT NULL,
    "totalDistanceKm" REAL,
    "totalDurationMin" INTEGER,
    "geometry" TEXT,
    "colorHex" TEXT NOT NULL DEFAULT '#2563eb',
    "driverId" TEXT,
    CONSTRAINT "routes_optimizationId_fkey" FOREIGN KEY ("optimizationId") REFERENCES "optimizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "routes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_routes" ("colorHex", "geometry", "id", "optimizationId", "totalDistanceKm", "totalDurationMin", "vehicleIndex", "vehicleLabel") SELECT "colorHex", "geometry", "id", "optimizationId", "totalDistanceKm", "totalDurationMin", "vehicleIndex", "vehicleLabel" FROM "routes";
DROP TABLE "routes";
ALTER TABLE "new_routes" RENAME TO "routes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
