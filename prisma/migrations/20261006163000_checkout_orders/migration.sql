CREATE TYPE "OrderStatus" AS ENUM ('PENDING','CHECKOUT_CREATED','PAID','PAYMENT_FAILED','CANCELED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','SUCCEEDED','FAILED','REFUNDED','PARTIALLY_REFUNDED');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "name" TEXT,
  "stripeCustomerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "currency" TEXT NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "buyerEmail" TEXT,
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "licenseProductId" TEXT NOT NULL,
  "licenseVersionId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "licenseNameSnapshot" TEXT NOT NULL,
  "workTitleSnapshot" TEXT NOT NULL,
  "licenseVersionNumber" INTEGER NOT NULL,
  "scopeSnapshot" "LicenseScope" NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "termsTextSnapshot" TEXT NOT NULL,
  "attributionRequired" BOOLEAN NOT NULL,
  "commercialUseAllowed" BOOLEAN NOT NULL,
  "derivativesAllowed" BOOLEAN NOT NULL,
  "redistributionAllowed" BOOLEAN NOT NULL,
  "seatLimit" INTEGER,
  "projectLimit" INTEGER,
  "selectedStemLabelsSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerPaymentId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "refundedCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "providerRefundId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseLicense" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "licenseVersionId" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "termsTextSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseLicense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_tenantId_normalizedEmail_key" ON "Customer"("tenantId","normalizedEmail");
CREATE UNIQUE INDEX "Customer_tenantId_stripeCustomerId_key" ON "Customer"("tenantId","stripeCustomerId");
CREATE INDEX "Customer_tenantId_createdAt_idx" ON "Customer"("tenantId","createdAt");
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId","status","createdAt");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId","createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_licenseVersionId_idx" ON "OrderItem"("licenseVersionId");
CREATE INDEX "OrderItem_workId_idx" ON "OrderItem"("workId");
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider","providerPaymentId");
CREATE INDEX "Payment_tenantId_status_createdAt_idx" ON "Payment"("tenantId","status","createdAt");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");
CREATE INDEX "Refund_paymentId_createdAt_idx" ON "Refund"("paymentId","createdAt");
CREATE UNIQUE INDEX "PurchaseLicense_orderItemId_key" ON "PurchaseLicense"("orderItemId");
CREATE INDEX "PurchaseLicense_tenantId_customerId_createdAt_idx" ON "PurchaseLicense"("tenantId","customerId","createdAt");
CREATE INDEX "PurchaseLicense_orderId_idx" ON "PurchaseLicense"("orderId");
CREATE INDEX "PurchaseLicense_licenseVersionId_idx" ON "PurchaseLicense"("licenseVersionId");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider","providerEventId");
CREATE INDEX "PaymentWebhookEvent_processedAt_idx" ON "PaymentWebhookEvent"("processedAt");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_licenseProductId_fkey" FOREIGN KEY ("licenseProductId") REFERENCES "LicenseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_licenseVersionId_fkey" FOREIGN KEY ("licenseVersionId") REFERENCES "LicenseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLicense" ADD CONSTRAINT "PurchaseLicense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLicense" ADD CONSTRAINT "PurchaseLicense_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLicense" ADD CONSTRAINT "PurchaseLicense_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLicense" ADD CONSTRAINT "PurchaseLicense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLicense" ADD CONSTRAINT "PurchaseLicense_licenseVersionId_fkey" FOREIGN KEY ("licenseVersionId") REFERENCES "LicenseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
