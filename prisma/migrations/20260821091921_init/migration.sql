-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "openingTime" TEXT NOT NULL DEFAULT '06:30',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apbCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "timeWindowStart" TEXT NOT NULL DEFAULT '08:00',
    "timeWindowEnd" TEXT NOT NULL DEFAULT '18:00',
    "bacsCount" INTEGER NOT NULL DEFAULT 1,
    "serviceTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "optimizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depotId" TEXT NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "departureTime" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optimizationId" TEXT NOT NULL,
    "vehicleLabel" TEXT NOT NULL,
    "vehicleIndex" INTEGER NOT NULL,
    "totalDistanceKm" REAL,
    "totalDurationMin" INTEGER,
    "geometry" TEXT,
    "colorHex" TEXT NOT NULL DEFAULT '#2563eb',
    CONSTRAINT "routes_optimizationId_fkey" FOREIGN KEY ("optimizationId") REFERENCES "optimizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "etaArrival" TEXT NOT NULL,
    "etaDeparture" TEXT NOT NULL,
    "withinTimeWindow" BOOLEAN NOT NULL DEFAULT true,
    "distanceFromPrevKm" REAL,
    "durationFromPrevMin" INTEGER,
    CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "route_stops_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_apbCode_key" ON "pharmacies"("apbCode");
