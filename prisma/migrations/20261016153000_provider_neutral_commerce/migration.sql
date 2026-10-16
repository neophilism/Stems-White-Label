-- Preserve historical identifiers and records; stop legacy commerce at cutover.
BEGIN;
ALTER TYPE "PaymentProvider" RENAME VALUE 'STRIPE' TO 'LEGACY';
ALTER TYPE "PaymentProvider" ADD VALUE 'AUTHORIZE_NET';
ALTER TYPE "PaymentProvider" ADD VALUE 'SANDBOX';
ALTER TYPE "StripeWebhookScope" RENAME TO "CommerceWebhookScope";
ALTER TABLE "StripeWebhookEvent" RENAME TO "CommerceWebhookEvent";
ALTER TABLE "CommerceWebhookEvent" RENAME CONSTRAINT "StripeWebhookEvent_pkey" TO "CommerceWebhookEvent_pkey";
ALTER TABLE "Customer" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
ALTER TABLE "Order" RENAME COLUMN "stripeCheckoutSessionId" TO "providerCheckoutSessionId";
ALTER TABLE "Order" RENAME COLUMN "stripePaymentIntentId" TO "providerTransactionId";
ALTER TABLE "Order" RENAME COLUMN "stripeConnectedAccountId" TO "providerAccountId";
ALTER TABLE "Payment" RENAME COLUMN "stripeConnectedAccountId" TO "providerAccountId";
ALTER TABLE "TenantCommerce" RENAME COLUMN "stripeAccountId" TO "providerAccountId";
ALTER TABLE "TenantSubscription" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
ALTER TABLE "TenantSubscription" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";
ALTER TABLE "TenantSubscription" RENAME COLUMN "stripeCheckoutSessionId" TO "providerCheckoutSessionId";
ALTER TABLE "TenantSubscription" RENAME COLUMN "stripePriceId" TO "providerPriceId";
ALTER TABLE "TenantSubscription" RENAME COLUMN "stripeProductId" TO "providerProductId";
ALTER INDEX "Customer_tenantId_stripeCustomerId_key" RENAME TO "Customer_tenantId_providerCustomerId_key";
ALTER INDEX "Order_stripeCheckoutSessionId_key" RENAME TO "Order_providerCheckoutSessionId_key";
ALTER INDEX "Order_stripePaymentIntentId_key" RENAME TO "Order_providerTransactionId_key";
ALTER INDEX "TenantCommerce_stripeAccountId_key" RENAME TO "TenantCommerce_providerAccountId_key";
ALTER INDEX "TenantSubscription_stripeCustomerId_key" RENAME TO "TenantSubscription_providerCustomerId_key";
ALTER INDEX "TenantSubscription_stripeSubscriptionId_key" RENAME TO "TenantSubscription_providerSubscriptionId_key";
ALTER INDEX "TenantSubscription_stripePriceId_idx" RENAME TO "TenantSubscription_providerPriceId_idx";
ALTER INDEX "StripeWebhookEvent_scope_processedAt_idx" RENAME TO "CommerceWebhookEvent_scope_processedAt_idx";
DROP INDEX "StripeWebhookEvent_scope_providerEventId_key";
DROP INDEX "Order_providerTransactionId_key";
CREATE UNIQUE INDEX "Order_providerAccountId_providerTransactionId_key" ON "Order"("providerAccountId", "providerTransactionId");
DROP INDEX "Payment_provider_providerPaymentId_key";
CREATE UNIQUE INDEX "Payment_provider_providerAccountId_providerPaymentId_key" ON "Payment"("provider", "providerAccountId", "providerPaymentId");
DROP INDEX "Refund_providerRefundId_key";
ALTER TABLE "Refund" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'LEGACY', ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'legacy';
UPDATE "Refund" r SET "provider" = p."provider", "accountId" = COALESCE(p."providerAccountId", 'legacy') FROM "Payment" p WHERE r."paymentId" = p.id;
CREATE UNIQUE INDEX "Refund_provider_accountId_providerRefundId_key" ON "Refund"("provider", "accountId", "providerRefundId");
ALTER TABLE "TenantCommerce" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "TenantSubscription" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "CommerceWebhookEvent" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "TenantSubscription" ADD COLUMN "provisioningState" TEXT NOT NULL DEFAULT 'IDLE', ADD COLUMN "providerAccountId" TEXT;
ALTER TABLE "CommerceWebhookEvent" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'legacy', ADD COLUMN "payloadHash" TEXT;
CREATE UNIQUE INDEX "CommerceWebhookEvent_provider_accountId_scope_providerEvent_key" ON "CommerceWebhookEvent"("provider", "accountId", "scope", "providerEventId");
UPDATE "TenantCommerce" SET "chargesEnabled" = false, "payoutsEnabled" = false, "disabledReason" = 'Merchant migration required';
UPDATE "TenantSubscription" SET "status" = 'PAUSED' WHERE "providerSubscriptionId" IS NOT NULL AND "status" NOT IN ('CANCELED', 'INCOMPLETE_EXPIRED', 'GRANDFATHERED');
CREATE TABLE "HostedCheckout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT,
    "kind" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "accountId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "actionUrl" TEXT NOT NULL,
    "planId" TEXT,
    "providerCustomerId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostedCheckout_pkey" PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX "HostedCheckout_orderId_key" ON "HostedCheckout"("orderId");
CREATE UNIQUE INDEX "HostedCheckout_reference_key" ON "HostedCheckout"("reference");
CREATE INDEX "HostedCheckout_tenantId_kind_expiresAt_idx" ON "HostedCheckout"("tenantId", "kind", "expiresAt");
ALTER TABLE "HostedCheckout" ADD CONSTRAINT "HostedCheckout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostedCheckout" ADD CONSTRAINT "HostedCheckout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
