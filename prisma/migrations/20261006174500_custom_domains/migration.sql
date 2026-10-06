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

CREATE UNIQUE INDEX "TenantDomain_verificationToken_key"
  ON "TenantDomain"("verificationToken");

CREATE INDEX "TenantDomain_tenantId_ownershipStatus_routingStatus_tlsStatus_idx"
  ON "TenantDomain"("tenantId","ownershipStatus","routingStatus","tlsStatus");

CREATE INDEX "TenantDomain_claimExpiresAt_idx"
  ON "TenantDomain"("claimExpiresAt");

CREATE UNIQUE INDEX "TenantDomain_one_primary_per_tenant"
  ON "TenantDomain"("tenantId")
  WHERE "isPrimary" = true;
