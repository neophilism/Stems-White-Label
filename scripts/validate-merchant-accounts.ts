import assert from "node:assert/strict";

import {
  calculatePlatformFeeCents,
  commerceReadiness,
  getTenantCommerceForCheckout,
  persistTenantCommerceAccount,
} from "../src/lib/commerce";
import { db } from "../src/lib/db";

async function main() {
  const suffix = Date.now().toString(36);
  const [tenant, secondTenant] = await Promise.all([
    db.tenant.create({
      data: {
        name: "Connect Validation " + suffix,
        slug: "connect-validation-" + suffix,
      },
    }),
    db.tenant.create({
      data: {
        name: "Connect Isolation " + suffix,
        slug: "connect-isolation-" + suffix,
      },
    }),
  ]);

  try {
    const baseSnapshot = {
      providerAccountId: "acct_validation_" + suffix,
      country: "US",
      defaultCurrency: "usd",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      disabledReason: null,
      requirementsCurrentlyDue: ["business_type"],
      requirementsEventuallyDue: ["external_account"],
      requirementsPastDue: [],
      requirementsPendingVerification: [],
      accountCreatedAt: new Date(),
    };

    const onboarding = await persistTenantCommerceAccount(
      tenant.id,
      baseSnapshot,
    );
    assert.equal(
      commerceReadiness(onboarding).status,
      "ONBOARDING",
    );

    await persistTenantCommerceAccount(tenant.id, {
      ...baseSnapshot,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirementsCurrentlyDue: [],
      requirementsEventuallyDue: [],
    });

    await db.tenantCommerce.update({
      where: { tenantId: tenant.id },
      data: { platformFeeBps: 750 },
    });

    process.env.COMMERCE_MERCHANTS_JSON = JSON.stringify({ [tenant.id]: { accountId: baseSnapshot.providerAccountId, apiLoginId: "test", transactionKey: "test", signatureKey: "ab".repeat(64), currency: "USD", mode: "sandbox", underwritingApproved: false } });
    await assert.rejects(() => getTenantCommerceForCheckout(tenant.id, 12500), /platform fee splits/);
    await db.tenantCommerce.update({ where: { tenantId: tenant.id }, data: { platformFeeBps: 0 } });
    const settlement = await getTenantCommerceForCheckout(tenant.id, 12500);
    assert.equal(settlement.providerAccountId, baseSnapshot.providerAccountId);
    assert.equal(settlement.platformFeeBps, 0);
    assert.equal(settlement.platformFeeCents, 0);
    assert.equal(calculatePlatformFeeCents(10000, 750), 750);

    await assert.rejects(() =>
      persistTenantCommerceAccount(secondTenant.id, {
        ...baseSnapshot,
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
      }),
    );

    const blocked = commerceReadiness({
      providerAccountId: "acct_blocked",
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
      disabledReason: "requirements.past_due",
    });
    assert.equal(blocked.ready, false);
    assert.equal(blocked.status, "RESTRICTED");

    console.log("merchant payments commerce database integration validation passed.");
  } finally {
    await db.tenant.deleteMany({
      where: { id: { in: [tenant.id, secondTenant.id] } },
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
