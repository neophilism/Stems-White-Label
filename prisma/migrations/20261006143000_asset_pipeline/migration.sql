CREATE TYPE "ProcessingJobType" AS ENUM ('PROCESS_AUDIO');
CREATE TYPE "ProcessingJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "AudioAsset"
  ADD COLUMN "sourceAssetId" TEXT,
  ADD COLUMN "waveformStorageKey" TEXT;

CREATE TABLE "ProcessingJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "audioAssetId" TEXT NOT NULL,
  "type" "ProcessingJobType" NOT NULL DEFAULT 'PROCESS_AUDIO',
  "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
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
  CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AudioAsset_sourceAssetId_kind_key"
  ON "AudioAsset"("sourceAssetId", "kind");

CREATE INDEX "AudioAsset_sourceAssetId_idx"
  ON "AudioAsset"("sourceAssetId");

CREATE UNIQUE INDEX "ProcessingJob_audioAssetId_type_key"
  ON "ProcessingJob"("audioAssetId", "type");

CREATE INDEX "ProcessingJob_status_runAfter_createdAt_idx"
  ON "ProcessingJob"("status", "runAfter", "createdAt");

CREATE INDEX "ProcessingJob_tenantId_status_idx"
  ON "ProcessingJob"("tenantId", "status");

ALTER TABLE "AudioAsset"
  ADD CONSTRAINT "AudioAsset_sourceAssetId_fkey"
  FOREIGN KEY ("sourceAssetId") REFERENCES "AudioAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcessingJob"
  ADD CONSTRAINT "ProcessingJob_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcessingJob"
  ADD CONSTRAINT "ProcessingJob_audioAssetId_fkey"
  FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
