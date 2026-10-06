CREATE TYPE "DownloadPackageStatus" AS ENUM ('QUEUED','PROCESSING','READY','FAILED');

ALTER TABLE "Customer" ADD COLUMN "userId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "includedAssetIdsSnapshot" JSONB;
ALTER TABLE "PurchaseLicense" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseLicense" ADD COLUMN "revocationReason" TEXT;

CREATE TABLE "DownloadEntitlement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseLicenseId" TEXT NOT NULL,
  "audioAssetId" TEXT NOT NULL,
  "fileNameSnapshot" TEXT NOT NULL,
  "downloadsCount" INTEGER NOT NULL DEFAULT 0,
  "lastDownloadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DownloadEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadPackage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseLicenseId" TEXT NOT NULL,
  "status" "DownloadPackageStatus" NOT NULL DEFAULT 'QUEUED',
  "storageKey" TEXT,
  "fileName" TEXT NOT NULL,
  "sizeBytes" BIGINT,
  "checksumSha256" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DownloadPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_tenantId_userId_key" ON "Customer"("tenantId","userId");
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");
CREATE UNIQUE INDEX "DownloadEntitlement_purchaseLicenseId_audioAssetId_key"
  ON "DownloadEntitlement"("purchaseLicenseId","audioAssetId");
CREATE INDEX "DownloadEntitlement_tenantId_createdAt_idx"
  ON "DownloadEntitlement"("tenantId","createdAt");
CREATE INDEX "DownloadEntitlement_audioAssetId_idx"
  ON "DownloadEntitlement"("audioAssetId");
CREATE UNIQUE INDEX "DownloadPackage_purchaseLicenseId_key"
  ON "DownloadPackage"("purchaseLicenseId");
CREATE UNIQUE INDEX "DownloadPackage_storageKey_key"
  ON "DownloadPackage"("storageKey");
CREATE INDEX "DownloadPackage_status_runAfter_createdAt_idx"
  ON "DownloadPackage"("status","runAfter","createdAt");
CREATE INDEX "DownloadPackage_tenantId_status_idx"
  ON "DownloadPackage"("tenantId","status");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_purchaseLicenseId_fkey"
  FOREIGN KEY ("purchaseLicenseId") REFERENCES "PurchaseLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_audioAssetId_fkey"
  FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DownloadPackage" ADD CONSTRAINT "DownloadPackage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadPackage" ADD CONSTRAINT "DownloadPackage_purchaseLicenseId_fkey"
  FOREIGN KEY ("purchaseLicenseId") REFERENCES "PurchaseLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
