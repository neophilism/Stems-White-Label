import { db } from "@/lib/db";
import { ensureTenantSubscription, getBillingPlan, mapProviderSubscriptionStatus, persistSubscriptionSnapshot } from "@/lib/billing";
import { AuthorizeNetGateway, billingMerchantConfig } from "@/lib/payment-gateway";
import { checkoutIdentifiers, saveHostedCheckout } from "@/lib/hosted-checkout";

export async function createSaasCheckoutSession(input: {
  tenantId: string; tenantName: string; email?: string | null; priceId: string; origin: string;
}) {
  const billing = await ensureTenantSubscription(input.tenantId);
  if (billing.providerSubscriptionId && !["CANCELED", "INCOMPLETE_EXPIRED"].includes(billing.status)) {
    throw new Error("This tenant already has a subscription. Manage or cancel it before choosing another plan.");
  }
  if (billing.provisioningState !== "IDLE") throw new Error("A previous billing request requires reconciliation before retrying.");
  const plan = await getBillingPlan(input.priceId);
  const gateway = new AuthorizeNetGateway(billingMerchantConfig());
  if (plan.currency !== gateway.config.currency) throw new Error("Plan currency does not match the billing merchant.");
  billingInterval(plan.interval, plan.intervalCount);
  if (!input.email) throw new Error("A billing email is required.");
  let customerId = billing.provider === "AUTHORIZE_NET" ? billing.providerCustomerId : null;
  if (!customerId) {
    const claimed = await db.tenantSubscription.updateMany({ where: { tenantId: input.tenantId, provisioningState: "IDLE" }, data: { provisioningState: "CREATING_CUSTOMER" } });
    if (claimed.count !== 1) throw new Error("Another billing request is in progress.");
    // If the provider accepts a request but the connection fails, leave the claim in place.
    // Retrying money-related provisioning without reconciliation can create duplicates.
    customerId = await gateway.createCustomer(input.tenantId, input.email);
    await db.tenantSubscription.update({ where: { tenantId: input.tenantId }, data: { provider: "AUTHORIZE_NET", providerAccountId: gateway.accountId, providerCustomerId: customerId, provisioningState: "IDLE" } });
  }
  if (billing.providerSubscriptionId) {
    await db.tenantSubscription.update({ where: { tenantId: input.tenantId }, data: {
      providerSubscriptionId: null, status: "UNSUBSCRIBED", trialStart: null, trialEnd: null,
      currentPeriodStart: null, currentPeriodEnd: null, canceledAt: null, endedAt: null,
    } });
  }
  const ids = checkoutIdentifiers();
  const form = await gateway.hostedCustomerProfile(customerId, input.origin + "/admin/billing?checkout=success");
  await saveHostedCheckout({ ...ids, tenantId: input.tenantId, kind: "BILLING", accountId: gateway.accountId, form, planId: plan.priceId, providerCustomerId: customerId });
  await db.tenantSubscription.update({ where: { tenantId: input.tenantId }, data: { providerCheckoutSessionId: ids.id } });
  return input.origin + "/checkout/pay/" + ids.id;
}

export function billingInterval(interval: string, count: number) {
  const unit = interval === "day" || interval === "week" ? "days" : "months";
  const length = count * (interval === "week" ? 7 : interval === "year" ? 12 : 1);
  if (!Number.isSafeInteger(length) || length < (unit === "days" ? 7 : 1) || length > (unit === "days" ? 365 : 12)) {
    throw new Error("This billing interval is unsupported by the provider.");
  }
  return { unit: unit as "days" | "months", length };
}

export async function refreshTenantSubscription(tenantId: string) {
  const billing = await ensureTenantSubscription(tenantId);
  const gateway = new AuthorizeNetGateway(billingMerchantConfig());
  if (billing.provider !== "AUTHORIZE_NET" || billing.providerAccountId !== gateway.accountId) throw new Error("This subscription must be migrated before it can be refreshed.");
  if (billing.providerSubscriptionId) {
    const providerStatus = mapProviderSubscriptionStatus(await gateway.subscription(billing.providerSubscriptionId));
    // ARB 'active' means a schedule exists, not that any funds were collected.
    // Only a verified capture event can activate a paid subscription.
    const status = providerStatus === "ACTIVE" ? billing.status : providerStatus;
    return db.tenantSubscription.update({ where: { tenantId }, data: {
      status, lastSyncedAt: new Date(),
      ...(status === "PAST_DUE" && !billing.pastDueGraceUntil ? { pastDueGraceUntil: new Date(Date.now() + 7 * 86400000) } : {}),
    } });
  }
  if (!billing.providerCustomerId || !billing.providerCheckoutSessionId) throw new Error("Start a subscription checkout first.");
  const session = await db.hostedCheckout.findFirst({ where: { id: billing.providerCheckoutSessionId, tenantId, kind: "BILLING", completedAt: null, expiresAt: { gt: new Date() } } });
  if (!session?.planId || session.accountId !== gateway.accountId) throw new Error("Subscription checkout expired. Start again.");
  const plan = await getBillingPlan(session.planId);
  const paymentProfileId = await gateway.customerPaymentProfile(billing.providerCustomerId);
  const interval = billingInterval(plan.interval, plan.intervalCount);
  const claimed = await db.tenantSubscription.updateMany({ where: { tenantId, provisioningState: "IDLE", providerSubscriptionId: null }, data: { provisioningState: "CREATING_SUBSCRIPTION" } });
  if (claimed.count !== 1) throw new Error("Subscription provisioning is in progress or requires reconciliation.");
  const now = new Date();
  const trialEnd = plan.trialDays ? new Date(now.getTime() + plan.trialDays * 86400000) : null;
  const subscriptionId = await gateway.createSubscription({ name: "STEMS " + plan.name, customerId: billing.providerCustomerId,
    paymentProfileId, amountCents: plan.unitAmountCents, interval: interval.unit, intervalCount: interval.length,
    startDate: (trialEnd ?? now).toISOString().slice(0, 10) });
  const snapshot = await persistSubscriptionSnapshot({ tenantId, provider: "AUTHORIZE_NET", providerCustomerId: billing.providerCustomerId,
    providerSubscriptionId: subscriptionId, status: trialEnd ? "TRIALING" : "INCOMPLETE", plan,
    cancelAtPeriodEnd: false, trialStart: trialEnd ? now : null, trialEnd,
    currentPeriodStart: null, currentPeriodEnd: null, canceledAt: null, endedAt: null });
  await db.$transaction([
    db.tenantSubscription.update({ where: { tenantId }, data: { provisioningState: "IDLE" } }),
    db.hostedCheckout.update({ where: { id: session.id }, data: { completedAt: new Date(), token: "" } }),
  ]);
  return snapshot;
}

export async function createSaasPortalSession(input: { tenantId: string; origin: string }) {
  const billing = await ensureTenantSubscription(input.tenantId);
  if (billing.provider !== "AUTHORIZE_NET" || billing.providerAccountId !== billingMerchantConfig().accountId || !billing.providerCustomerId) throw new Error("No hosted billing profile is available.");
  const gateway = new AuthorizeNetGateway(billingMerchantConfig());
  const ids = checkoutIdentifiers();
  const form = await gateway.hostedCustomerProfile(billing.providerCustomerId, input.origin + "/admin/billing");
  await saveHostedCheckout({ ...ids, tenantId: input.tenantId, kind: "PORTAL", accountId: gateway.accountId, form });
  return input.origin + "/checkout/pay/" + ids.id;
}

export async function cancelTenantSubscription(tenantId: string) {
  const billing = await ensureTenantSubscription(tenantId);
  if (billing.provider !== "AUTHORIZE_NET" || billing.providerAccountId !== billingMerchantConfig().accountId || !billing.providerSubscriptionId) throw new Error("No provider subscription is available.");
  await new AuthorizeNetGateway(billingMerchantConfig()).cancelSubscription(billing.providerSubscriptionId);
  return db.tenantSubscription.update({ where: { tenantId }, data: { status: "CANCELED", canceledAt: new Date(), endedAt: new Date(), lastSyncedAt: new Date() } });
}
