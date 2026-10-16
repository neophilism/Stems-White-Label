import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertPaidAmountMatchesOrder } from "@/lib/payment-integrity";
import { AuthorizeNetGateway, type VerifiedTransaction } from "@/lib/payment-gateway";
import { markOrderPaid, recordRefund } from "@/lib/payments";

export type ProviderNotification = { notificationId: string; eventType: string; payload: { id: string } };

export function parseNotification(raw: string): ProviderNotification {
  const value = JSON.parse(raw) as ProviderNotification;
  if (!value || typeof value.notificationId !== "string" || !/^[A-Za-z0-9-]{1,100}$/.test(value.notificationId) ||
      typeof value.eventType !== "string" || !/^net\.authorize\.[a-zA-Z.]{1,100}$/.test(value.eventType) ||
      typeof value.payload?.id !== "string" || !/^\d{1,30}$/.test(value.payload.id)) throw new Error("Invalid provider notification.");
  return value;
}

export async function readWebhookBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing webhook body.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw new Error("Webhook body exceeds limit."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

export function isCaptured(t: VerifiedTransaction) {
  return ["authCaptureTransaction", "priorAuthCaptureTransaction"].includes(t.type) &&
    ["capturedPendingSettlement", "settledSuccessfully"].includes(t.status);
}

/** Atomic event receipt and ledger effects; retries cannot partially commit a purchase. */
export async function processMerchantNotification(input: {
  tenantId: string; gateway: AuthorizeNetGateway; raw: string; notification: ProviderNotification;
}) {
  const { gateway, notification, tenantId } = input;
  if (!notification.eventType.startsWith("net.authorize.payment.")) return { ignored: true };
  const transaction = await gateway.transaction(notification.payload.id);
  return withNotification(input.raw, notification, gateway.accountId, "PAYMENTS", async tx => {
    const payment = transaction.originalTransactionId
      ? await tx.payment.findFirst({ where: { tenantId, provider: gateway.provider, providerAccountId: gateway.accountId, providerPaymentId: transaction.originalTransactionId } })
      : null;
    if (payment && transaction.type === "refundTransaction" && ["refundPendingSettlement", "refundSettledSuccessfully"].includes(transaction.status)) {
      await recordRefund({ orderId: payment.orderId, providerRefundId: transaction.id, amountCents: transaction.amountCents }, tx);
      return;
    }
    const session = await tx.hostedCheckout.findFirst({ where: {
      tenantId, provider: gateway.provider, accountId: gateway.accountId, reference: transaction.reference, kind: "PAYMENT",
    } });
    if (!session?.orderId) throw new Error("Transaction is not associated with a checkout for this merchant.");
    const order = await tx.order.findFirstOrThrow({ where: { id: session.orderId, tenantId, providerAccountId: gateway.accountId } });
    if (transaction.status === "voided" && order.providerTransactionId === transaction.id && order.status === "PAID") {
      await recordRefund({ orderId: order.id, providerRefundId: "void:" + transaction.id, amountCents: order.totalCents, reason: "Provider void" }, tx);
    } else if (isCaptured(transaction)) {
      assertPaidAmountMatchesOrder({ amountCents: order.totalCents, currency: order.currency }, transaction);
      if (["PARTIALLY_REFUNDED", "REFUNDED"].includes(order.status)) {
        if (order.providerTransactionId !== transaction.id) throw new Error("Refunded order received an unrelated capture.");
        return;
      }
      if (!order.buyerEmail) throw new Error("Order buyer is missing.");
      await markOrderPaid({ orderId: order.id, amountCents: transaction.amountCents, currency: transaction.currency,
        email: order.buyerEmail, providerTransactionId: transaction.id, providerCustomerId: transaction.customerId }, tx);
      await tx.hostedCheckout.update({ where: { id: session.id }, data: { completedAt: new Date(), token: "" } });
    }
  });
}

export async function withNotification(
  raw: string, notification: ProviderNotification, accountId: string, scope: "PAYMENTS" | "BILLING",
  apply: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  return db.$transaction(async tx => {
    const key = "AUTHORIZE_NET:" + accountId + ":" + scope + ":" + notification.notificationId;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    const where = { provider_accountId_scope_providerEventId: {
      provider: "AUTHORIZE_NET" as const, accountId, scope, providerEventId: notification.notificationId,
    } };
    const duplicate = await tx.commerceWebhookEvent.findUnique({ where });
    if (duplicate) {
      if (duplicate.payloadHash !== payloadHash) throw new Error("A provider event ID was reused with a different payload.");
      return { duplicate: true };
    }
    await apply(tx);
    await tx.commerceWebhookEvent.create({ data: {
      provider: "AUTHORIZE_NET", accountId, scope, providerEventId: notification.notificationId,
      eventType: notification.eventType, payloadHash,
    } });
    return { duplicate: false };
  });
}
