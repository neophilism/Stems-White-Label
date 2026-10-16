import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { AuthorizeNetGateway, type MerchantConfig } from "../src/lib/payment-gateway";
import { processMerchantNotification, type ProviderNotification } from "../src/lib/commerce-webhooks";
import { markOrderPaid, markOrderPaymentFailed, recordRefund } from "../src/lib/payments";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({ data: { name: "Payment Integrity", slug: "payment-integrity-" + suffix } });
  const other = await db.tenant.create({ data: { name: "Other Merchant", slug: "other-merchant-" + suffix } });
  const account = "merchant-" + suffix;
  const config: MerchantConfig = { accountId: account, apiLoginId: "test", transactionKey: "test", signatureKey: "ab".repeat(64), currency: "USD", mode: "sandbox", underwritingApproved: false };
  let amount = "100.00";
  const gateway = new AuthorizeNetGateway(config, async () => new Response(JSON.stringify({ messages: { resultCode: "Ok" }, transaction: {
    transId: "123456", transactionType: "authCaptureTransaction", transactionStatus: "capturedPendingSettlement", authAmount: amount,
    submitTimeUTC: "2026-10-16T12:00:00Z", order: { invoiceNumber: "ref" + suffix }, customer: { email: "buyer@example.test" },
  } })));
  try {
    const order = await db.order.create({ data: { tenantId: tenant.id, status: "CHECKOUT_CREATED", currency: "USD", subtotalCents: 10000, totalCents: 10000,
      buyerEmail: "buyer@example.test", termsAcceptedAt: new Date(), providerAccountId: account,
      payments: { create: { tenantId: tenant.id, provider: "AUTHORIZE_NET", providerAccountId: account, amountCents: 10000, currency: "USD" } },
    } });
    await db.hostedCheckout.create({ data: { id: "session-" + suffix, tenantId: tenant.id, orderId: order.id, kind: "PAYMENT", provider: "AUTHORIZE_NET", accountId: account,
      reference: "ref" + suffix, token: "test-only", actionUrl: "https://test.authorize.net/payment/payment", expiresAt: new Date(Date.now() + 60000) } });
    const notification: ProviderNotification = { notificationId: "event-" + suffix, eventType: "net.authorize.payment.authcapture.created", payload: { id: "123456" } };
    const input = { tenantId: tenant.id, gateway, notification, raw: JSON.stringify(notification) };
    amount = "99.99";
    await assert.rejects(() => processMerchantNotification(input), /amount or currency/);
    assert.equal(await db.commerceWebhookEvent.count({ where: { accountId: account } }), 0);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "CHECKOUT_CREATED");
    amount = "100.00";
    await assert.rejects(() => processMerchantNotification({ ...input, tenantId: other.id }));
    const captures = await Promise.all([processMerchantNotification(input), processMerchantNotification(input)]);
    assert.equal(captures.filter(x => "duplicate" in x && x.duplicate).length, 1);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
    await assert.rejects(() => processMerchantNotification({ ...input, raw: input.raw + " " }), /different payload/);
    await assert.rejects(() => markOrderPaid({ orderId: order.id, email: "attacker@example.test", amountCents: 10000, currency: "USD", providerTransactionId: "123456" }), /email/);
    await assert.rejects(() => markOrderPaid({ orderId: order.id, email: "buyer@example.test", amountCents: 10000, currency: "USD", providerTransactionId: "different" }), /transaction/);
    const refunds = await Promise.allSettled([
      recordRefund({ orderId: order.id, providerRefundId: "refund-a-" + suffix, amountCents: 6000 }),
      recordRefund({ orderId: order.id, providerRefundId: "refund-b-" + suffix, amountCents: 6000 }),
    ]);
    assert.equal(refunds.filter(x => x.status === "fulfilled").length, 1);
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id } });
    assert.equal(payment.refundedCents, 6000);
    await markOrderPaymentFailed({ orderId: order.id, failureMessage: "Late failed callback" });
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PARTIALLY_REFUNDED");
    await recordRefund({ orderId: order.id, providerRefundId: "refund-final-" + suffix, amountCents: 4000 });
    const newNotification = { ...notification, notificationId: "late-capture-" + suffix };
    await processMerchantNotification({ ...input, notification: newNotification, raw: JSON.stringify(newNotification) });
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "REFUNDED");
    // Independent merchants can legitimately receive the same numeric provider transaction ID.
    const otherOrder = await db.order.create({ data: { tenantId: other.id, currency: "USD", subtotalCents: 10000, totalCents: 10000, termsAcceptedAt: new Date(),
      providerAccountId: "other-" + account, providerTransactionId: "123456", payments: { create: {
        tenantId: other.id, provider: "AUTHORIZE_NET", providerAccountId: "other-" + account, providerPaymentId: "123456", amountCents: 10000, currency: "USD",
      } } } });
    assert.ok(otherOrder.id);
    console.log("Commerce callback, tenant isolation, atomic replay and concurrent refund validation passed.");
  } finally {
    await db.commerceWebhookEvent.deleteMany({ where: { accountId: account } });
    await db.tenant.deleteMany({ where: { id: { in: [tenant.id, other.id] } } });
    await db.$disconnect();
  }
}
main().catch(async error => { console.error(error); await db.$disconnect(); process.exitCode = 1; });
