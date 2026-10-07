CREATE TYPE "PlatformRole" AS ENUM ('USER','SUPER_ADMIN');

ALTER TABLE "User"
  ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "DownloadPackage"
  ADD COLUMN "downloadsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDownloadedAt" TIMESTAMP(3);

CREATE TABLE "TenantFeatureFlag" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformAuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "tenantId" TEXT,
  "action" VARCHAR(96) NOT NULL,
  "targetType" VARCHAR(64) NOT NULL,
  "targetId" VARCHAR(191) NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantFeatureFlag_tenantId_key_key"
  ON "TenantFeatureFlag"("tenantId","key");
CREATE INDEX "TenantFeatureFlag_tenantId_enabled_idx"
  ON "TenantFeatureFlag"("tenantId","enabled");

CREATE INDEX "PlatformAuditLog_createdAt_idx"
  ON "PlatformAuditLog"("createdAt");
CREATE INDEX "PlatformAuditLog_actorUserId_createdAt_idx"
  ON "PlatformAuditLog"("actorUserId","createdAt");
CREATE INDEX "PlatformAuditLog_tenantId_createdAt_idx"
  ON "PlatformAuditLog"("tenantId","createdAt");
CREATE INDEX "PlatformAuditLog_targetType_targetId_createdAt_idx"
  ON "PlatformAuditLog"("targetType","targetId","createdAt");

ALTER TABLE "TenantFeatureFlag"
  ADD CONSTRAINT "TenantFeatureFlag_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog"
  ADD CONSTRAINT "PlatformAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog"
  ADD CONSTRAINT "PlatformAuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantFeatureFlag"
  ADD CONSTRAINT "TenantFeatureFlag_key_check"
  CHECK ("key" ~ '^[a-z0-9][a-z0-9._-]{1,63}$');

ALTER TABLE "DownloadPackage"
  ADD CONSTRAINT "DownloadPackage_downloadsCount_check"
  CHECK ("downloadsCount" >= 0);

CREATE OR REPLACE FUNCTION prevent_platform_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PlatformAuditLog is append-only';
END;
$$;

CREATE TRIGGER "PlatformAuditLog_prevent_update"
BEFORE UPDATE ON "PlatformAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_platform_audit_mutation();

CREATE TRIGGER "PlatformAuditLog_prevent_delete"
BEFORE DELETE ON "PlatformAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_platform_audit_mutation();
