import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { createPendingOrder, quoteLicenseProducts } from "../src/lib/checkout";

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

    const order = await createPendingOrder(tenant.id, quote, true, "buyer@example.com");
    assert.equal(order.status, "PENDING");
    assert.equal(order.items[0]?.termsTextSnapshot, "Immutable checkout terms.");
    assert.equal(order.payments[0]?.status, "PENDING");

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

    const stored = await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    assert.equal(stored.unitPriceCents, 12500);
    assert.equal(stored.termsTextSnapshot, "Immutable checkout terms.");

    console.log("Checkout/order database integration validation passed.");
  } finally {
    await db.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
