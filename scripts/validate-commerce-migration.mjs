import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  const base = new URL('../prisma/migrations/', import.meta.url);
  for (const name of (await readdir(base)).filter(name => /^\d/.test(name)).sort()) {
    if (name === '20261016153000_provider_neutral_commerce') {
      // Fixture data models an existing installation at the point of upgrade.
      await db.exec(`
        INSERT INTO "Tenant" (id, name, slug, "updatedAt") VALUES ('legacy-tenant', 'Legacy tenant', 'legacy-tenant', now());
        INSERT INTO "TenantCommerce" (id, "tenantId", "stripeAccountId", "chargesEnabled", "payoutsEnabled", "updatedAt") VALUES ('legacy-commerce', 'legacy-tenant', 'legacy-account', true, true, now());
        INSERT INTO "TenantSubscription" (id, "tenantId", status, "stripeCustomerId", "stripeSubscriptionId", "updatedAt") VALUES ('legacy-billing', 'legacy-tenant', 'ACTIVE', 'legacy-customer', 'legacy-subscription', now());
        INSERT INTO "Order" (id, "tenantId", currency, "subtotalCents", "totalCents", "termsAcceptedAt", "stripePaymentIntentId", "stripeConnectedAccountId", "updatedAt") VALUES ('legacy-order', 'legacy-tenant', 'USD', 1000, 1000, now(), 'legacy-capture', 'legacy-account', now());
        INSERT INTO "Payment" (id, "tenantId", "orderId", "providerPaymentId", "stripeConnectedAccountId", "amountCents", currency, "updatedAt") VALUES ('legacy-payment', 'legacy-tenant', 'legacy-order', 'legacy-capture', 'legacy-account', 1000, 'USD', now());
        INSERT INTO "Refund" (id, "paymentId", "providerRefundId", "amountCents", status, "updatedAt") VALUES ('legacy-refund', 'legacy-payment', 'legacy-refund-id', 250, 'REFUNDED', now());
        INSERT INTO "StripeWebhookEvent" (id, scope, "providerEventId", "eventType") VALUES ('legacy-event', 'PAYMENTS', 'legacy-event-id', 'legacy-captured');
      `);
    }
    await db.exec(await readFile(new URL(name + '/migration.sql', base), 'utf8'));
  }
  const commerce = (await db.query('SELECT * FROM "TenantCommerce" WHERE id = $1', ['legacy-commerce'])).rows[0];
  assert.equal(commerce.providerAccountId, 'legacy-account');
  assert.equal(commerce.provider, 'LEGACY');
  assert.equal(commerce.chargesEnabled, false);
  const order = (await db.query('SELECT * FROM "Order" WHERE id = $1', ['legacy-order'])).rows[0];
  assert.equal(order.providerTransactionId, 'legacy-capture');
  const refund = (await db.query('SELECT * FROM "Refund" WHERE id = $1', ['legacy-refund'])).rows[0];
  assert.equal(refund.amountCents, 250);
  assert.equal(refund.accountId, 'legacy-account');
  assert.equal(refund.provider, 'LEGACY');
  assert.equal((await db.query('SELECT status FROM "TenantSubscription" WHERE id = $1', ['legacy-billing'])).rows[0].status, 'PAUSED');
  assert.equal((await db.query('SELECT "providerEventId" FROM "CommerceWebhookEvent" WHERE id = $1', ['legacy-event'])).rows[0].providerEventId, 'legacy-event-id');
  const activeFields = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%stripe%'");
  assert.equal(activeFields.rows.length, 0);
  console.log('Complete migration history and existing payment/refund/customer/event preservation passed.');
} finally { await db.close(); }
