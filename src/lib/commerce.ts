
import { db } from "@/lib/db";
import { getPaymentGateway } from "@/lib/payment-gateway";

export type CommerceAccountSnapshot = {
  providerAccountId: string;
  provider?: "AUTHORIZE_NET" | "SANDBOX";
  country: string | null;
  defaultCurrency: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  requirementsPastDue: string[];
  requirementsPendingVerification: string[];
  accountCreatedAt: Date | null;
};

export function normalizeConnectCountry(value: unknown) {
  const country =
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : (process.env.COMMERCE_DEFAULT_COUNTRY ?? "US").trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error("Merchant country must be a two-letter ISO country code.");
  }
  return country;
}

export function normalizePlatformFeeBps(value: unknown) {
  const fee = Number(value);
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > 10000) {
    throw new Error("Platform fee must be an integer from 0 to 10000 basis points.");
  }
  return fee;
}

export function platformFeeBpsFromEnv() {
  return normalizePlatformFeeBps(process.env.COMMERCE_PLATFORM_FEE_BPS ?? 0);
}

export function calculatePlatformFeeCents(amountCents: number, feeBps: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error("Settlement amount must be a non-negative integer.");
  }
  const normalizedBps = normalizePlatformFeeBps(feeBps);
  return Math.min(
    amountCents,
    Math.round((amountCents * normalizedBps) / 10000),
  );
}

export function commerceReadiness(input: {
  providerAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
}) {
  const ready =
    Boolean(input.providerAccountId) &&
    input.chargesEnabled &&
    input.payoutsEnabled &&
    input.detailsSubmitted &&
    !input.disabledReason;

  let status: "NOT_CONNECTED" | "ONBOARDING" | "RESTRICTED" | "READY";
  if (!input.providerAccountId) status = "NOT_CONNECTED";
  else if (ready) status = "READY";
  else if (input.detailsSubmitted || input.disabledReason) status = "RESTRICTED";
  else status = "ONBOARDING";

  return { ready, status };
}

export async function ensureTenantCommerce(tenantId: string) {
  return db.tenantCommerce.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      platformFeeBps: platformFeeBpsFromEnv(),
    },
  });
}

export async function persistTenantCommerceAccount(
  tenantId: string,
  snapshot: CommerceAccountSnapshot,
) {
  const existing = await db.tenantCommerce.findUnique({
    where: { tenantId },
  });

  if (
    existing?.provider !== "LEGACY" && existing?.providerAccountId &&
    existing.providerAccountId !== snapshot.providerAccountId
  ) {
    throw new Error("Tenant is already linked to a different merchant account.");
  }

  const now = new Date();
  return db.tenantCommerce.upsert({
    where: { tenantId },
    create: {
      tenantId,
      providerAccountId: snapshot.providerAccountId,
      provider: snapshot.provider ?? "AUTHORIZE_NET",
      country: snapshot.country,
      defaultCurrency: snapshot.defaultCurrency,
      chargesEnabled: snapshot.chargesEnabled,
      payoutsEnabled: snapshot.payoutsEnabled,
      detailsSubmitted: snapshot.detailsSubmitted,
      disabledReason: snapshot.disabledReason,
      requirementsCurrentlyDue: snapshot.requirementsCurrentlyDue,
      requirementsEventuallyDue: snapshot.requirementsEventuallyDue,
      requirementsPastDue: snapshot.requirementsPastDue,
      requirementsPendingVerification: snapshot.requirementsPendingVerification,
      platformFeeBps: platformFeeBpsFromEnv(),
      accountCreatedAt: snapshot.accountCreatedAt,
      onboardingCompletedAt: snapshot.detailsSubmitted ? now : null,
      lastSyncedAt: now,
    },
    update: {
      providerAccountId: snapshot.providerAccountId,
      provider: snapshot.provider ?? "AUTHORIZE_NET",
      country: snapshot.country,
      defaultCurrency: snapshot.defaultCurrency,
      chargesEnabled: snapshot.chargesEnabled,
      payoutsEnabled: snapshot.payoutsEnabled,
      detailsSubmitted: snapshot.detailsSubmitted,
      disabledReason: snapshot.disabledReason,
      requirementsCurrentlyDue: snapshot.requirementsCurrentlyDue,
      requirementsEventuallyDue: snapshot.requirementsEventuallyDue,
      requirementsPastDue: snapshot.requirementsPastDue,
      requirementsPendingVerification: snapshot.requirementsPendingVerification,
      accountCreatedAt: snapshot.accountCreatedAt,
      onboardingCompletedAt: snapshot.detailsSubmitted
        ? existing?.onboardingCompletedAt ?? now
        : null,
      lastSyncedAt: now,
    },
  });
}

export async function getTenantCommerceState(tenantId: string) {
  const commerce = await ensureTenantCommerce(tenantId);
  let readiness = commerceReadiness(commerce);
  try {
    const gateway = getPaymentGateway(tenantId);
    if (commerce.provider !== gateway.provider || commerce.providerAccountId !== gateway.accountId || (!gateway.supportsSplitSettlement && commerce.platformFeeBps !== 0)) readiness = { ready: false, status: "RESTRICTED" };
  } catch { readiness = { ready: false, status: commerce.providerAccountId ? "RESTRICTED" : "NOT_CONNECTED" }; }
  return { ...commerce, ...readiness };
}

export async function getTenantCommerceForCheckout(
  tenantId: string,
  totalCents: number,
) {
  const commerce = await db.tenantCommerce.findUnique({
    where: { tenantId },
  });

  if (!commerce) {
    throw new Error("This storefront has not connected a merchant account yet.");
  }

  const readiness = commerceReadiness(commerce);
  if (!readiness.ready || !commerce.providerAccountId) {
    throw new Error(
      "This storefront is not currently ready to accept payments. Please try again later.",
    );
  }

  if (commerce.provider === "LEGACY") throw new Error("Merchant account must be migrated before checkout.");

  {
    const gateway = getPaymentGateway(tenantId);
    if (commerce.provider !== gateway.provider || commerce.providerAccountId !== gateway.accountId) throw new Error("Merchant configuration does not match the storefront.");
    if (!gateway.supportsSplitSettlement && commerce.platformFeeBps !== 0) throw new Error("Merchant does not support platform fee splits.");
  }
  return {
    provider: commerce.provider,
    providerAccountId: commerce.providerAccountId,
    platformFeeBps: commerce.platformFeeBps,
    platformFeeCents: calculatePlatformFeeCents(
      totalCents,
      commerce.platformFeeBps,
    ),
  };
}
