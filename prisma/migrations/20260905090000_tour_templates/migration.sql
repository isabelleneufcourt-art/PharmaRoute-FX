-- CreateTable
CREATE TABLE "tour_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "period" TEXT,
    "vehicleLabel" TEXT,
    "vehicleCapacityBacs" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tour_templates_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tour_template_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourTemplateId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    CONSTRAINT "tour_template_stops_tourTemplateId_fkey" FOREIGN KEY ("tourTemplateId") REFERENCES "tour_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tour_template_stops_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_templates_code_key" ON "tour_templates"("code");

-- CreateIndex
CREATE INDEX "tour_template_stops_pharmacyId_idx" ON "tour_template_stops"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "tour_template_stops_tourTemplateId_pharmacyId_key" ON "tour_template_stops"("tourTemplateId", "pharmacyId");

