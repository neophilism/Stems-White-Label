CREATE TABLE "TenantCommerce" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "stripeAccountId" TEXT,
  "country" TEXT,
  "defaultCurrency" TEXT,
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "requirementsCurrentlyDue" JSONB,
  "requirementsEventuallyDue" JSONB,
  "requirementsPastDue" JSONB,
  "requirementsPendingVerification" JSONB,
  "disabledReason" TEXT,
  "platformFeeBps" INTEGER NOT NULL DEFAULT 0,
  "accountCreatedAt" TIMESTAMP(3),
  "onboardingStartedAt" TIMESTAMP(3),
  "onboardingCompletedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantCommerce_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
  ADD COLUMN "stripeConnectedAccountId" TEXT,
  ADD COLUMN "platformFeeCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment"
  ADD COLUMN "stripeConnectedAccountId" TEXT,
  ADD COLUMN "platformFeeCents" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "TenantCommerce_tenantId_key"
  ON "TenantCommerce"("tenantId");
CREATE UNIQUE INDEX "TenantCommerce_stripeAccountId_key"
  ON "TenantCommerce"("stripeAccountId");
CREATE INDEX "TenantCommerce_chargesEnabled_payoutsEnabled_idx"
  ON "TenantCommerce"("chargesEnabled","payoutsEnabled");

ALTER TABLE "TenantCommerce"
  ADD CONSTRAINT "TenantCommerce_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantCommerce"
  ADD CONSTRAINT "TenantCommerce_platformFeeBps_check"
  CHECK ("platformFeeBps" >= 0 AND "platformFeeBps" <= 10000);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_platformFeeCents_check"
  CHECK ("platformFeeCents" >= 0 AND "platformFeeCents" <= "totalCents");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_platformFeeCents_check"
  CHECK ("platformFeeCents" >= 0 AND "platformFeeCents" <= "amountCents");
