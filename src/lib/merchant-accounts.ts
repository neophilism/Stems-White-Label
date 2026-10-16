import { ensureTenantCommerce, persistTenantCommerceAccount } from "@/lib/commerce";
import { AuthorizeNetGateway, merchantConfig } from "@/lib/payment-gateway";

/** Merchant accounts are underwritten by the acquirer and provisioned by the operator. */
export async function syncConnectedAccount(tenantId: string) {
  const config = merchantConfig(tenantId);
  await new AuthorizeNetGateway(config).request("authenticateTestRequest", {});
  const existing = await ensureTenantCommerce(tenantId);
  if (existing.provider !== "LEGACY" && existing.providerAccountId && existing.providerAccountId !== config.accountId) {
    throw new Error("Tenant is already linked to another merchant account.");
  }
  return persistTenantCommerceAccount(tenantId, {
    provider: "AUTHORIZE_NET", providerAccountId: config.accountId, country: existing.country ?? "US",
    defaultCurrency: config.currency, chargesEnabled: true, payoutsEnabled: true,
    detailsSubmitted: true, disabledReason: null, requirementsCurrentlyDue: [], requirementsEventuallyDue: [],
    requirementsPastDue: [], requirementsPendingVerification: [], accountCreatedAt: existing.accountCreatedAt ?? new Date(),
  });
}

function approvedLink(value: string | undefined) {
  if (!value) throw new Error("The operator has not configured a merchant portal URL.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid merchant portal URL.");
  return url.href;
}

export async function createConnectedAccountOnboardingLink(input: { tenantId: string; email?: string | null; country?: unknown; origin: string }) {
  return approvedLink(merchantConfig(input.tenantId).onboardingUrl);
}

export async function createConnectedAccountDashboardLink(tenantId: string) {
  return approvedLink(merchantConfig(tenantId).dashboardUrl);
}
