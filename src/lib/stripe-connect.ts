import { db } from "@/lib/db";
import {
  ensureTenantCommerce,
  normalizeConnectCountry,
  persistTenantCommerceAccount,
  stripeAccountSnapshot,
} from "@/lib/commerce";
import { getStripe } from "@/lib/stripe";

export async function createOrRetrieveConnectedAccount(input: {
  tenantId: string;
  email?: string | null;
  country?: unknown;
}) {
  const stripe = getStripe();
  const commerce = await ensureTenantCommerce(input.tenantId);

  if (commerce.stripeAccountId) {
    const account = await stripe.accounts.retrieve(commerce.stripeAccountId);
    if (account.deleted) {
      throw new Error("The connected Stripe account has been deleted.");
    }
    await persistTenantCommerceAccount(
      input.tenantId,
      stripeAccountSnapshot(account),
    );
    return account;
  }

  const country = normalizeConnectCountry(input.country);
  const account = await stripe.accounts.create({
    country,
    email: input.email ?? undefined,
    capabilities: {
      transfers: { requested: true },
    },
    controller: {
      fees: { payer: "application" },
      losses: { payments: "application" },
      stripe_dashboard: { type: "express" },
    },
    metadata: {
      tenantId: input.tenantId,
    },
  });

  await persistTenantCommerceAccount(
    input.tenantId,
    stripeAccountSnapshot(account),
  );

  return account;
}

export async function createConnectedAccountOnboardingLink(input: {
  tenantId: string;
  email?: string | null;
  country?: unknown;
  origin: string;
}) {
  const stripe = getStripe();
  const account = await createOrRetrieveConnectedAccount(input);

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url:
      input.origin + "/api/admin/commerce/onboarding/refresh",
    return_url:
      input.origin + "/admin/commerce?onboarding=returned",
    type: "account_onboarding",
  });

  await db.tenantCommerce.update({
    where: { tenantId: input.tenantId },
    data: { onboardingStartedAt: new Date() },
  });

  return link.url;
}

export async function syncConnectedAccount(tenantId: string) {
  const stripe = getStripe();
  const commerce = await db.tenantCommerce.findUnique({
    where: { tenantId },
  });
  if (!commerce?.stripeAccountId) {
    return ensureTenantCommerce(tenantId);
  }

  const account = await stripe.accounts.retrieve(commerce.stripeAccountId);
  if (account.deleted) {
    throw new Error("The connected Stripe account has been deleted.");
  }

  return persistTenantCommerceAccount(
    tenantId,
    stripeAccountSnapshot(account),
  );
}

export async function createConnectedAccountDashboardLink(tenantId: string) {
  const stripe = getStripe();
  const commerce = await db.tenantCommerce.findUnique({
    where: { tenantId },
  });
  if (!commerce?.stripeAccountId) {
    throw new Error("Stripe Connect onboarding has not started.");
  }

  const link = await stripe.accounts.createLoginLink(
    commerce.stripeAccountId,
  );
  return link.url;
}
