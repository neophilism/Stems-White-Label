CREATE TYPE "SaasSubscriptionStatus" AS ENUM (
  'UNSUBSCRIBED',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'PAUSED',
  'GRANDFATHERED'
);

CREATE TABLE "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" "SaasSubscriptionStatus" NOT NULL DEFAULT 'UNSUBSCRIBED',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripePriceId" TEXT,
  "stripeProductId" TEXT,
  "planKey" TEXT,
  "planName" TEXT,
  "currency" TEXT,
  "unitAmountCents" INTEGER,
  "billingInterval" TEXT,
  "billingIntervalCount" INTEGER,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "trialStart" TIMESTAMP(3),
  "trialEnd" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "pastDueGraceUntil" TIMESTAMP(3),
  "maxWorks" INTEGER,
  "maxStorageBytes" BIGINT,
  "maxCustomDomains" INTEGER,
  "maxMembers" INTEGER,
  "allowCustomDomains" BOOLEAN NOT NULL DEFAULT false,
  "allowWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
  "entitlements" JSONB,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantSubscription_tenantId_key"
  ON "TenantSubscription"("tenantId");
CREATE UNIQUE INDEX "TenantSubscription_stripeCustomerId_key"
  ON "TenantSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "TenantSubscription_stripeSubscriptionId_key"
  ON "TenantSubscription"("stripeSubscriptionId");
CREATE INDEX "TenantSubscription_status_currentPeriodEnd_idx"
  ON "TenantSubscription"("status","currentPeriodEnd");
CREATE INDEX "TenantSubscription_stripePriceId_idx"
  ON "TenantSubscription"("stripePriceId");

ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_maxWorks_check"
  CHECK ("maxWorks" IS NULL OR "maxWorks" >= 0);
ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_maxStorageBytes_check"
  CHECK ("maxStorageBytes" IS NULL OR "maxStorageBytes" >= 0);
ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_maxCustomDomains_check"
  CHECK ("maxCustomDomains" IS NULL OR "maxCustomDomains" >= 0);
ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_maxMembers_check"
  CHECK ("maxMembers" IS NULL OR "maxMembers" >= 0);

-- Existing tenants predate SaaS billing. Preserve their current service without
-- forcing an artificial Stripe subscription during deployment. New tenants do
-- not receive this row automatically and must subscribe through the billing flow.
INSERT INTO "TenantSubscription" (
  "id",
  "tenantId",
  "status",
  "planKey",
  "planName",
  "allowCustomDomains",
  "allowWhiteLabel",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_' || md5("id"),
  "id",
  'GRANDFATHERED'::"SaasSubscriptionStatus",
  'legacy',
  'Legacy / Grandfathered',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant"
ON CONFLICT ("tenantId") DO NOTHING;


CREATE TYPE "StripeWebhookScope" AS ENUM ('PAYMENTS','CONNECT','BILLING');

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "scope" "StripeWebhookScope" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_scope_providerEventId_key"
  ON "StripeWebhookEvent"("scope","providerEventId");
CREATE INDEX "StripeWebhookEvent_scope_processedAt_idx"
  ON "StripeWebhookEvent"("scope","processedAt");
