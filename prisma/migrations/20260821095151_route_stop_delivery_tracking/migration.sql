-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_route_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "etaArrival" TEXT NOT NULL,
    "etaDeparture" TEXT NOT NULL,
    "withinTimeWindow" BOOLEAN NOT NULL DEFAULT true,
    "distanceFromPrevKm" REAL,
    "durationFromPrevMin" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "emptyBacsRetrieved" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "route_stops_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_route_stops" ("distanceFromPrevKm", "durationFromPrevMin", "etaArrival", "etaDeparture", "id", "pharmacyId", "routeId", "sequence", "withinTimeWindow") SELECT "distanceFromPrevKm", "durationFromPrevMin", "etaArrival", "etaDeparture", "id", "pharmacyId", "routeId", "sequence", "withinTimeWindow" FROM "route_stops";
DROP TABLE "route_stops";
ALTER TABLE "new_route_stops" RENAME TO "route_stops";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
