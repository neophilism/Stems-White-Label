
import { db } from "@/lib/db";

export type BillingPlan = {
  priceId: string;
  productId: string;
  key: string;
  name: string;
  description: string | null;
  currency: string;
  unitAmountCents: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  trialDays: number;
  maxWorks: number | null;
  maxStorageBytes: bigint | null;
  maxCustomDomains: number | null;
  maxMembers: number | null;
  allowCustomDomains: boolean;
  allowWhiteLabel: boolean;
  features: string[];
};

type SubscriptionEntitlements = Pick<
  BillingPlan,
  | "maxWorks"
  | "maxStorageBytes"
  | "maxCustomDomains"
  | "maxMembers"
  | "allowCustomDomains"
  | "allowWhiteLabel"
>;

type SubscriptionLike = {
  status: string;
  pastDueGraceUntil: Date | null;
  trialEnd?: Date | null;
  currentPeriodEnd?: Date | null;
};

function csv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function allowedBillingPriceIds() {
  return [...new Set(csv(process.env.SAAS_BILLING_PRICE_IDS))];
}

// Plans are an operator-owned allowlist, independent of any processor's product API.
export function parseBillingPlan(value: unknown): BillingPlan {
  if (!value || typeof value !== "object") throw new Error("Invalid billing plan.");
  const p = value as Record<string, unknown>;
  for (const key of ["priceId", "productId", "key", "name"]) {
    if (typeof p[key] !== "string" || !p[key]) throw new Error("Billing plan is missing " + key + ".");
  }
  if (!/^[A-Z]{3}$/.test(String(p.currency)) || !["day", "week", "month", "year"].includes(String(p.interval))) throw new Error("Invalid plan currency or interval.");
  for (const key of ["unitAmountCents", "intervalCount", "trialDays"]) {
    if (!Number.isSafeInteger(p[key]) || Number(p[key]) < (key === "trialDays" ? 0 : 1)) throw new Error("Invalid billing plan " + key + ".");
  }
  if (Number(p.trialDays) > 365) throw new Error("Trial must be at most 365 days.");
  for (const key of ["maxWorks", "maxCustomDomains", "maxMembers"]) {
    if (p[key] !== null && (!Number.isSafeInteger(p[key]) || Number(p[key]) < 0)) throw new Error("Invalid plan limit " + key + ".");
  }
  if (![true, false].includes(p.allowCustomDomains as boolean) || ![true, false].includes(p.allowWhiteLabel as boolean) ||
      !Array.isArray(p.features) || p.features.some(f => typeof f !== "string")) throw new Error("Invalid plan entitlements.");
  const storage = p.maxStorageBytes === null ? null : String(p.maxStorageBytes);
  if (storage !== null && !/^\d+$/.test(storage)) throw new Error("Invalid storage limit.");
  return { ...p, description: typeof p.description === "string" ? p.description : null,
    maxStorageBytes: storage === null ? null : BigInt(storage) } as BillingPlan;
}

export async function getBillingPlan(priceId: string) {
  if (!allowedBillingPriceIds().includes(priceId)) throw new Error("That SaaS billing plan is not available.");
  const plans: unknown = JSON.parse(process.env.SAAS_BILLING_PLANS_JSON || "[]");
  if (!Array.isArray(plans)) throw new Error("Invalid billing plan configuration.");
  const plan = plans.map(parseBillingPlan).find(plan => plan.priceId === priceId);
  if (!plan) throw new Error("That SaaS billing plan is not configured.");
  return plan;
}

export async function listBillingPlans() {
  return Promise.all(allowedBillingPriceIds().map(getBillingPlan));
}

export function mapProviderSubscriptionStatus(status: string) {
  const map: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "PAUSED" | "TRIALING"> = {
    active: "ACTIVE", suspended: "PAST_DUE", canceled: "CANCELED", expired: "CANCELED", terminated: "UNPAID",
  };
  const mapped = map[status];
  if (!mapped) throw new Error("Unknown provider subscription status.");
  return mapped;
}

function pastDueGraceDays() {
  const raw = Number(process.env.SAAS_PAST_DUE_GRACE_DAYS ?? 7);
  return Number.isFinite(raw) && raw >= 0 ? Math.min(raw, 30) : 7;
}

function nextGraceDate(now = new Date()) {
  return new Date(
    now.getTime() + pastDueGraceDays() * 24 * 60 * 60 * 1000,
  );
}

export function subscriptionAccessState(
  subscription: SubscriptionLike | null | undefined,
  now = new Date(),
) {
  if (!subscription) {
    return { allowed: false, reason: "A SaaS subscription is required." };
  }

  if ((subscription.status === "TRIALING" && subscription.trialEnd && subscription.trialEnd <= now) ||
      (subscription.status === "ACTIVE" && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now)) {
    return { allowed: false, reason: "Subscription period has ended; payment confirmation is pending." };
  }
  if (
    subscription.status === "GRANDFATHERED" ||
    subscription.status === "ACTIVE" ||
    subscription.status === "TRIALING"
  ) {
    return { allowed: true, reason: null };
  }

  if (
    subscription.status === "PAST_DUE" &&
    subscription.pastDueGraceUntil &&
    subscription.pastDueGraceUntil > now
  ) {
    return {
      allowed: true,
      reason: "Subscription payment is past due and currently within its grace period.",
    };
  }

  return {
    allowed: false,
    reason:
      subscription.status === "PAST_DUE"
        ? "Subscription payment is past due and its grace period has ended."
        : "SaaS subscription is not active.",
  };
}

export async function ensureTenantSubscription(tenantId: string) {
  return db.tenantSubscription.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, status: "UNSUBSCRIBED" },
  });
}

export async function persistSubscriptionSnapshot(input: {
  tenantId: string;
  provider?: "AUTHORIZE_NET" | "SANDBOX";
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: ReturnType<typeof mapProviderSubscriptionStatus>;
  plan: BillingPlan;
  cancelAtPeriodEnd: boolean;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
}) {
  const existing = await db.tenantSubscription.findUnique({
    where: { tenantId: input.tenantId },
  });

  if (
    existing?.providerSubscriptionId &&
    existing.providerSubscriptionId !== input.providerSubscriptionId &&
    !["CANCELED", "INCOMPLETE_EXPIRED"].includes(existing.status)
  ) {
    throw new Error("Tenant already has a different active provider subscription.");
  }

  const now = new Date();
  const grace =
    input.status === "PAST_DUE"
      ? existing?.status === "PAST_DUE" && existing.pastDueGraceUntil
        ? existing.pastDueGraceUntil
        : nextGraceDate(now)
      : null;

  return db.tenantSubscription.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      status: input.status,
      provider: input.provider ?? "AUTHORIZE_NET",
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      providerPriceId: input.plan.priceId,
      providerProductId: input.plan.productId,
      planKey: input.plan.key,
      planName: input.plan.name,
      currency: input.plan.currency,
      unitAmountCents: input.plan.unitAmountCents,
      billingInterval: input.plan.interval,
      billingIntervalCount: input.plan.intervalCount,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      trialStart: input.trialStart,
      trialEnd: input.trialEnd,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      canceledAt: input.canceledAt,
      endedAt: input.endedAt,
      pastDueGraceUntil: grace,
      maxWorks: input.plan.maxWorks,
      maxStorageBytes: input.plan.maxStorageBytes,
      maxCustomDomains: input.plan.maxCustomDomains,
      maxMembers: input.plan.maxMembers,
      allowCustomDomains: input.plan.allowCustomDomains,
      allowWhiteLabel: input.plan.allowWhiteLabel,
      entitlements: { features: input.plan.features },
      lastSyncedAt: now,
    },
    update: {
      status: input.status,
      provider: input.provider ?? "AUTHORIZE_NET",
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      providerPriceId: input.plan.priceId,
      providerProductId: input.plan.productId,
      planKey: input.plan.key,
      planName: input.plan.name,
      currency: input.plan.currency,
      unitAmountCents: input.plan.unitAmountCents,
      billingInterval: input.plan.interval,
      billingIntervalCount: input.plan.intervalCount,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      trialStart: input.trialStart,
      trialEnd: input.trialEnd,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      canceledAt: input.canceledAt,
      endedAt: input.endedAt,
      pastDueGraceUntil: grace,
      maxWorks: input.plan.maxWorks,
      maxStorageBytes: input.plan.maxStorageBytes,
      maxCustomDomains: input.plan.maxCustomDomains,
      maxMembers: input.plan.maxMembers,
      allowCustomDomains: input.plan.allowCustomDomains,
      allowWhiteLabel: input.plan.allowWhiteLabel,
      entitlements: { features: input.plan.features },
      lastSyncedAt: now,
    },
  });
}

export async function getTenantUsage(tenantId: string) {
  const [
    works,
    audio,
    artwork,
    themeAssets,
    packages,
    customDomains,
    members,
  ] = await Promise.all([
    db.work.count({
      where: { tenantId, status: { not: "ARCHIVED" } },
    }),
    db.audioAsset.aggregate({
      where: {
        tenantId,
        status: { not: "ARCHIVED" },
        sizeBytes: { not: null },
      },
      _sum: { sizeBytes: true },
    }),
    db.artworkAsset.aggregate({
      where: { tenantId },
      _sum: { sizeBytes: true },
    }),
    db.themeAsset.aggregate({
      where: { tenantId },
      _sum: { sizeBytes: true },
    }),
    db.downloadPackage.aggregate({
      where: { tenantId, sizeBytes: { not: null } },
      _sum: { sizeBytes: true },
    }),
    db.tenantDomain.count({
      where: { tenantId, verificationToken: { not: null } },
    }),
    db.tenantMembership.count({ where: { tenantId } }),
  ]);

  const storageBytes =
    (audio._sum.sizeBytes ?? 0n) +
    (artwork._sum.sizeBytes ?? 0n) +
    (themeAssets._sum.sizeBytes ?? 0n) +
    (packages._sum.sizeBytes ?? 0n);

  return {
    works,
    storageBytes,
    customDomains,
    members,
  };
}

export async function getTenantBillingState(tenantId: string) {
  const subscription = await ensureTenantSubscription(tenantId);
  const usage = await getTenantUsage(tenantId);
  return {
    subscription,
    usage,
    access: subscriptionAccessState(subscription),
  };
}

function enforceLimit(
  label: string,
  used: number | bigint,
  additional: number | bigint,
  limit: number | bigint | null,
) {
  if (limit == null) return;
  if (
    typeof used === "bigint" ||
    typeof additional === "bigint" ||
    typeof limit === "bigint"
  ) {
    if (BigInt(used) + BigInt(additional) > BigInt(limit)) {
      throw new Error(label + " limit reached for the current SaaS plan.");
    }
    return;
  }

  if (used + additional > limit) {
    throw new Error(label + " limit reached for the current SaaS plan.");
  }
}

async function activeSubscription(tenantId: string) {
  const subscription = await ensureTenantSubscription(tenantId);
  const access = subscriptionAccessState(subscription);
  if (!access.allowed) throw new Error(access.reason ?? "SaaS subscription is inactive.");
  return subscription;
}

export async function assertTenantCanCreateWork(tenantId: string) {
  const [subscription, works] = await Promise.all([
    activeSubscription(tenantId),
    db.work.count({
      where: { tenantId, status: { not: "ARCHIVED" } },
    }),
  ]);
  enforceLimit("Work", works, 1, subscription.maxWorks);
}

export async function assertTenantStorageCapacity(
  tenantId: string,
  additionalBytes: number | bigint,
) {
  if (BigInt(additionalBytes) < 0n) {
    throw new Error("Additional storage must be non-negative.");
  }

  const [subscription, usage] = await Promise.all([
    activeSubscription(tenantId),
    getTenantUsage(tenantId),
  ]);
  enforceLimit(
    "Storage",
    usage.storageBytes,
    BigInt(additionalBytes),
    subscription.maxStorageBytes,
  );
}

export async function assertTenantCanRegisterCustomDomain(tenantId: string) {
  const [subscription, domains] = await Promise.all([
    activeSubscription(tenantId),
    db.tenantDomain.count({
      where: { tenantId, verificationToken: { not: null } },
    }),
  ]);

  if (!subscription.allowCustomDomains) {
    throw new Error("Custom domains are not included in the current SaaS plan.");
  }
  enforceLimit(
    "Custom domain",
    domains,
    1,
    subscription.maxCustomDomains,
  );
}

export async function assertTenantCanUseWhiteLabel(tenantId: string) {
  const subscription = await activeSubscription(tenantId);
  if (!subscription.allowWhiteLabel) {
    throw new Error("White-label theming is not included in the current SaaS plan.");
  }
}

export async function assertTenantCanAddMember(tenantId: string) {
  const [subscription, members] = await Promise.all([
    activeSubscription(tenantId),
    db.tenantMembership.count({ where: { tenantId } }),
  ]);
  enforceLimit("Team member", members, 1, subscription.maxMembers);
}
