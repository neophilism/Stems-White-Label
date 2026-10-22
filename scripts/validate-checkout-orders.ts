import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { createPendingOrder, quoteLicenseProducts } from "../src/lib/checkout";
import { markOrderPaid, recordRefund } from "../src/lib/payments";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: { name: "Checkout Validation " + suffix, slug: "checkout-validation-" + suffix },
  });

  try {
    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        slug: "checkout-work-" + suffix,
        title: "Checkout Work",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    const stem = await db.stemGroup.create({
      data: { workId: work.id, slug: "horns", label: "Horn Section" },
    });
    const sourceAsset = await db.audioAsset.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        stemGroupId: stem.id,
        kind: "STEM",
        status: "READY",
        fileName: "horn-section.wav",
        storageKey: "validation/" + suffix + "/horn-section.wav",
        mimeType: "audio/wav",
        sizeBytes: BigInt(1024),
      },
    });

    const product = await db.licenseProduct.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        slug: "commercial",
        name: "Commercial",
        scope: "SELECTED_STEMS",
        selectedStems: { create: [{ stemGroupId: stem.id }] },
        versions: {
          create: {
            version: 1,
            priceCents: 12500,
            currency: "USD",
            termsText: "Immutable checkout terms.",
          },
        },
      },
    });

    const quote = await quoteLicenseProducts(tenant.id, [product.id]);
    assert.equal(quote.subtotalCents, 12500);
    assert.deepEqual(quote.items[0]?.selectedStemLabels, ["Horn Section"]);
    assert.deepEqual(
      quote.items[0]?.deliverableAssets.map((asset) => asset.id),
      [sourceAsset.id],
    );

    const order = await createPendingOrder(
      tenant.id,
      quote,
      true,
      "buyer@example.com",
      {
        stripeConnectedAccountId: "acct_checkout_validation",
        platformFeeCents: 625,
      },
    );
    assert.equal(order.status, "PENDING");
    assert.equal(order.items[0]?.termsTextSnapshot, "Immutable checkout terms.");
    assert.equal(order.stripeConnectedAccountId, "acct_checkout_validation");
    assert.equal(order.platformFeeCents, 625);
    assert.equal(order.payments[0]?.status, "PENDING");
    assert.equal(order.payments[0]?.stripeConnectedAccountId, "acct_checkout_validation");
    assert.equal(order.payments[0]?.platformFeeCents, 625);

    await db.licenseVersion.update({
      where: { id: quote.items[0]!.licenseVersionId },
      data: { retiredAt: new Date() },
    });
    await db.licenseVersion.create({
      data: {
        licenseProductId: product.id,
        version: 2,
        priceCents: 15000,
        currency: "USD",
        termsText: "New terms.",
      },
    });

    const stored = await db.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
      include: { deliverableAssets: true },
    });
    assert.equal(stored.unitPriceCents, 12500);
    assert.equal(stored.deliverableAssets[0]?.audioAssetId, sourceAsset.id);
    assert.equal(stored.termsTextSnapshot, "Immutable checkout terms.");

    const paid = await markOrderPaid({
      orderId: order.id,
      email: "Buyer@Example.com",
      stripeCustomerId: "cus_validation",
      stripePaymentIntentId: "pi_validation",
    });
    assert.equal(paid.status, "PAID");
    assert.equal(paid.customer?.normalizedEmail, "buyer@example.com");
    assert.equal(paid.items[0]?.purchaseLicense?.licenseVersionId, stored.licenseVersionId);

    const paidAgain = await markOrderPaid({
      orderId: order.id,
      email: "Buyer@Example.com",
      stripeCustomerId: "cus_validation",
      stripePaymentIntentId: "pi_validation",
    });
    const grants = await db.purchaseLicense.count({ where: { orderId: order.id } });
    const entitlements = await db.downloadEntitlement.findMany({
      where: { purchaseLicense: { orderId: order.id } },
    });
    assert.equal(paidAgain.status, "PAID");
    assert.equal(grants, 1);
    assert.equal(entitlements.length, 1);
    assert.equal(entitlements[0]?.audioAssetId, sourceAsset.id);

    const partial = await recordRefund({
      orderId: order.id,
      providerRefundId: "re_partial_validation",
      amountCents: 2500,
    });
    assert.equal(partial.status, "PARTIALLY_REFUNDED");

    const fullyRefunded = await recordRefund({
      orderId: order.id,
      providerRefundId: "re_final_validation",
      amountCents: 10000,
    });
    assert.equal(fullyRefunded.status, "REFUNDED");
    assert.equal(fullyRefunded.payments[0]?.refundedCents, 12500);
    const revoked = await db.purchaseLicense.findFirstOrThrow({
      where: { orderId: order.id },
    });
    assert.ok(revoked.revokedAt);
    assert.equal(revoked.revocationReason, "Order fully refunded.");

    // A duplicate payment webhook must never restore download rights after refund.
    await assert.rejects(
      () => markOrderPaid({
        orderId: order.id,
        email: "Buyer@Example.com",
        stripeCustomerId: "cus_validation",
        stripePaymentIntentId: "pi_validation",
      }),
      /refunded order/,
    );
    await assert.rejects(
      () => recordRefund({
        orderId: order.id,
        providerRefundId: "re_partial_validation",
        amountCents: 2501,
      }),
      /provider refund ID/,
    );
    await assert.rejects(
      () => recordRefund({
        orderId: order.id,
        providerRefundId: "re_over_validation",
        amountCents: 1,
      }),
      /Refund exceeds/,
    );
    const untouchedRefund = await db.refund.findUniqueOrThrow({
      where: { providerRefundId: "re_partial_validation" },
    });
    assert.equal(untouchedRefund.amountCents, 2500);
    const stillRevoked = await db.purchaseLicense.findFirstOrThrow({
      where: { orderId: order.id },
    });
    assert.ok(stillRevoked.revokedAt);

    console.log("Checkout/order database integration validation passed.");
  } finally {
    await db.order.deleteMany({ where: { tenantId: tenant.id } });
    await db.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
