import { db } from "@/lib/db";
import { isCaptured, withNotification, type ProviderNotification } from "@/lib/commerce-webhooks";
import { mapProviderSubscriptionStatus } from "@/lib/billing";
import { assertPaidAmountMatchesOrder } from "@/lib/payment-integrity";
import type { AuthorizeNetGateway } from "@/lib/payment-gateway";

export function billingPeriodEnd(start: Date, interval: string, count: number) {
  if (!Number.isFinite(start.getTime()) || !Number.isSafeInteger(count) || count <= 0) throw new Error("Invalid billing period.");
  const end = new Date(start);
  if (interval === "day" || interval === "week") end.setUTCDate(end.getUTCDate() + count * (interval === "week" ? 7 : 1));
  else if (interval === "month" || interval === "year") {
    const day = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + count * (interval === "year" ? 12 : 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, last));
  } else throw new Error("Unsupported billing interval.");
  return end;
}

export async function processBillingNotification(input: { gateway: AuthorizeNetGateway; raw: string; notification: ProviderNotification }) {
  const { gateway, raw, notification } = input;
  if (notification.eventType.startsWith("net.authorize.payment.")) {
    const capture = await gateway.transaction(notification.payload.id);
    if (!capture.subscriptionId || !isCaptured(capture)) return { ignored: true };
    return withNotification(raw, notification, gateway.accountId, "BILLING", async tx => {
      const billing = await tx.tenantSubscription.findFirstOrThrow({ where: {
        provider: gateway.provider, providerAccountId: gateway.accountId, providerSubscriptionId: capture.subscriptionId,
      } });
      await tx.$queryRaw`SELECT id FROM "TenantSubscription" WHERE id = ${billing.id} FOR UPDATE`;
      const current = await tx.tenantSubscription.findUniqueOrThrow({ where: { id: billing.id } });
      if (current.status === "CANCELED" || current.status === "UNPAID") return;
      assertPaidAmountMatchesOrder({ amountCents: current.unitAmountCents ?? 0, currency: current.currency ?? "" }, capture);
      if (current.currentPeriodStart && current.currentPeriodStart >= capture.capturedAt) return;
      const end = billingPeriodEnd(capture.capturedAt, current.billingInterval ?? "", current.billingIntervalCount ?? 0);
      await tx.tenantSubscription.update({ where: { id: current.id }, data: {
        status: "ACTIVE", currentPeriodStart: capture.capturedAt, currentPeriodEnd: end, pastDueGraceUntil: null, lastSyncedAt: new Date(),
      } });
    });
  }
  if (!notification.eventType.startsWith("net.authorize.customer.subscription.")) return { ignored: true };
  const status = mapProviderSubscriptionStatus(await gateway.subscription(notification.payload.id));
  return withNotification(raw, notification, gateway.accountId, "BILLING", async tx => {
    const billing = await tx.tenantSubscription.findFirstOrThrow({ where: {
      provider: gateway.provider, providerAccountId: gateway.accountId, providerSubscriptionId: notification.payload.id,
    } });
    await tx.$queryRaw`SELECT id FROM "TenantSubscription" WHERE id = ${billing.id} FOR UPDATE`;
    const current = await tx.tenantSubscription.findUniqueOrThrow({ where: { id: billing.id } });
    if (status === "ACTIVE" || current.status === "CANCELED") return;
    const graceDays = Math.min(30, Math.max(0, Number(process.env.SAAS_PAST_DUE_GRACE_DAYS || "7")));
    await tx.tenantSubscription.update({ where: { id: billing.id }, data: {
      status, lastSyncedAt: new Date(),
      ...(status === "PAST_DUE" ? { pastDueGraceUntil: current.pastDueGraceUntil ?? new Date(Date.now() + (Number.isFinite(graceDays) ? graceDays : 7) * 86400000) } : {}),
      ...(status === "CANCELED" ? { canceledAt: new Date(), endedAt: new Date() } : {}),
    } });
  });
}
