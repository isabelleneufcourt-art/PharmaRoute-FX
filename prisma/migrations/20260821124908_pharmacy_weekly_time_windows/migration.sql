-- AlterTable
ALTER TABLE "route_stops" ADD COLUMN "deliveryPeriod" TEXT;
ALTER TABLE "route_stops" ADD COLUMN "scheduledWindowEnd" TEXT;
ALTER TABLE "route_stops" ADD COLUMN "scheduledWindowStart" TEXT;

-- CreateTable
CREATE TABLE "pharmacy_time_windows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "pharmacy_time_windows_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_optimizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depotId" TEXT NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "departureTime" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "solverProvider" TEXT NOT NULL DEFAULT 'INTERNAL',
    "totalDistanceKm" REAL,
    "totalDurationMin" INTEGER,
    "violationsCount" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "optimizations_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_optimizations" ("completedAt", "createdAt", "departureTime", "depotId", "errorMessage", "id", "solverProvider", "status", "totalDistanceKm", "totalDurationMin", "vehicleCount", "violationsCount") SELECT "completedAt", "createdAt", "departureTime", "depotId", "errorMessage", "id", "solverProvider", "status", "totalDistanceKm", "totalDurationMin", "vehicleCount", "violationsCount" FROM "optimizations";
DROP TABLE "optimizations";
ALTER TABLE "new_optimizations" RENAME TO "optimizations";
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

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_time_windows_pharmacyId_weekday_period_key" ON "pharmacy_time_windows"("pharmacyId", "weekday", "period");

