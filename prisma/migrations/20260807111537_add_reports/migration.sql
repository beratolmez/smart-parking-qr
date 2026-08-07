-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNo" INTEGER NOT NULL,
    "assetId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT NOT NULL,
    "reporterType" TEXT NOT NULL DEFAULT 'VATANDAS',
    "reporterPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'YENI',
    "duplicateCount" INTEGER NOT NULL DEFAULT 1,
    "resolutionNote" TEXT,
    "resolvedPhoto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Report_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "lastValue" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_ticketNo_key" ON "Report"("ticketNo");

-- CreateIndex
CREATE INDEX "Report_assetId_status_idx" ON "Report"("assetId", "status");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
