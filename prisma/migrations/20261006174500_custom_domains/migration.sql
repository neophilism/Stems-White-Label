CREATE TYPE "DomainOwnershipStatus" AS ENUM ('PENDING','VERIFIED','FAILED');
CREATE TYPE "DomainRoutingStatus" AS ENUM ('PENDING','READY','FAILED');
CREATE TYPE "DomainTlsStatus" AS ENUM ('PENDING','READY','FAILED');

ALTER TABLE "TenantDomain"
  ADD COLUMN "verificationToken" TEXT,
  ADD COLUMN "ownershipStatus" "DomainOwnershipStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "routingStatus" "DomainRoutingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "tlsStatus" "DomainTlsStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "routingVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "tlsVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "claimExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

-- Rows created before PR 14 were already trusted routing assignments.
-- Preserve that behavior across deployment; only newly registered domains begin pending.
UPDATE "TenantDomain"
SET
  "ownershipStatus" = 'VERIFIED',
  "routingStatus" = 'READY',
  "tlsStatus" = 'READY',
  "verifiedAt" = COALESCE("verifiedAt", CURRENT_TIMESTAMP),
  "routingVerifiedAt" = CURRENT_TIMESTAMP,
  "tlsVerifiedAt" = CURRENT_TIMESTAMP,
  "claimExpiresAt" = NULL,
  "lastError" = NULL;

-- Defensively normalize any legacy duplicate-primary data before enforcing the invariant.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "TenantDomain"
  WHERE "isPrimary" = true
)
UPDATE "TenantDomain"
SET "isPrimary" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "TenantDomain_verificationToken_key"
  ON "TenantDomain"("verificationToken");

CREATE INDEX "TenantDomain_tenantId_ownershipStatus_routingStatus_tlsStatus_idx"
  ON "TenantDomain"("tenantId","ownershipStatus","routingStatus","tlsStatus");

CREATE INDEX "TenantDomain_claimExpiresAt_idx"
  ON "TenantDomain"("claimExpiresAt");

CREATE UNIQUE INDEX "TenantDomain_one_primary_per_tenant"
  ON "TenantDomain"("tenantId")
  WHERE "isPrimary" = true;
