CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantInvitation_tokenHash_key" ON "TenantInvitation"("tokenHash");
CREATE INDEX "TenantInvitation_tenantId_normalizedEmail_idx" ON "TenantInvitation"("tenantId", "normalizedEmail");
CREATE INDEX "TenantInvitation_tenantId_expiresAt_idx" ON "TenantInvitation"("tenantId", "expiresAt");
CREATE INDEX "TenantInvitation_invitedByUserId_idx" ON "TenantInvitation"("invitedByUserId");
CREATE INDEX "TenantInvitation_acceptedByUserId_idx" ON "TenantInvitation"("acceptedByUserId");
CREATE INDEX "TenantAuditLog_tenantId_createdAt_idx" ON "TenantAuditLog"("tenantId", "createdAt");
CREATE INDEX "TenantAuditLog_actorUserId_createdAt_idx" ON "TenantAuditLog"("actorUserId", "createdAt");

ALTER TABLE "TenantInvitation"
ADD CONSTRAINT "TenantInvitation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantInvitation"
ADD CONSTRAINT "TenantInvitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantInvitation"
ADD CONSTRAINT "TenantInvitation_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantAuditLog"
ADD CONSTRAINT "TenantAuditLog_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantAuditLog"
ADD CONSTRAINT "TenantAuditLog_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_tenant_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TenantAuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TenantAuditLog_prevent_update"
BEFORE UPDATE ON "TenantAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_tenant_audit_mutation();

CREATE TRIGGER "TenantAuditLog_prevent_delete"
BEFORE DELETE ON "TenantAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_tenant_audit_mutation();
