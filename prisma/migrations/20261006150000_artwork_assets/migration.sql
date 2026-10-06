CREATE TYPE "ArtworkAssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TABLE "ArtworkAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "status" "ArtworkAssetStatus" NOT NULL DEFAULT 'PENDING',
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtworkAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtworkAsset_workId_key" ON "ArtworkAsset"("workId");
CREATE UNIQUE INDEX "ArtworkAsset_storageKey_key" ON "ArtworkAsset"("storageKey");
CREATE INDEX "ArtworkAsset_tenantId_status_idx" ON "ArtworkAsset"("tenantId", "status");

ALTER TABLE "ArtworkAsset"
  ADD CONSTRAINT "ArtworkAsset_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtworkAsset"
  ADD CONSTRAINT "ArtworkAsset_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
