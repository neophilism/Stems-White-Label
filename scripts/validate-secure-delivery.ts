import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { createPendingOrder, quoteLicenseProducts } from "../src/lib/checkout";
import {
  claimNextDownloadPackage,
  markDownloadPackageFailed,
  requestDownloadPackage,
} from "../src/lib/download-packages";
import { markOrderPaid } from "../src/lib/payments";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: { name: "Delivery Validation " + suffix, slug: "delivery-validation-" + suffix },
  });

  try {
    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        slug: "delivery-work-" + suffix,
        title: "Delivery Work",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    const stem = await db.stemGroup.create({
      data: { workId: work.id, slug: "section", label: "Section" },
    });
    const asset = await db.audioAsset.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        stemGroupId: stem.id,
        kind: "STEM",
        status: "READY",
        fileName: "section.wav",
        storageKey: "validation/" + suffix + "/section.wav",
        mimeType: "audio/wav",
        sizeBytes: BigInt(2048),
      },
    });
    const product = await db.licenseProduct.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        slug: "all-source",
        name: "All Source",
        scope: "ALL_STEMS",
        versions: {
          create: {
            version: 1,
            priceCents: 9900,
            currency: "USD",
            termsText: "Delivery validation terms.",
          },
        },
      },
    });

    const quote = await quoteLicenseProducts(tenant.id, [product.id]);
    const order = await createPendingOrder(
      tenant.id,
      quote,
      true,
      "delivery@example.com",
    );
    const paid = await markOrderPaid({
      orderId: order.id,
      email: "delivery@example.com",
      stripePaymentIntentId: "pi_delivery_" + suffix,
    });
    const customer = paid.customer!;
    const purchase = await db.purchaseLicense.findFirstOrThrow({
      where: { orderId: order.id },
      include: { downloadEntitlements: true },
    });

    assert.equal(purchase.downloadEntitlements.length, 1);
    assert.equal(purchase.downloadEntitlements[0]?.audioAssetId, asset.id);

    const queued = await requestDownloadPackage({
      tenantId: tenant.id,
      customerId: customer.id,
      purchaseLicenseId: purchase.id,
    });
    assert.equal(queued.status, "QUEUED");

    const claimedId = await claimNextDownloadPackage("delivery-validation-worker");
    assert.equal(claimedId, queued.id);

    const claimed = await db.downloadPackage.findUniqueOrThrow({
      where: { id: queued.id },
    });
    assert.equal(claimed.status, "PROCESSING");
    assert.equal(claimed.attempts, 1);

    const retry = await markDownloadPackageFailed({
      packageId: claimed.id,
      attempts: claimed.attempts,
      maxAttempts: claimed.maxAttempts,
      error: new Error("synthetic package failure"),
    });
    assert.equal(retry.exhausted, false);

    const requeued = await db.downloadPackage.findUniqueOrThrow({
      where: { id: queued.id },
    });
    assert.equal(requeued.status, "QUEUED");
    assert.match(requeued.lastError ?? "", /synthetic package failure/);

    console.log("Secure delivery database integration validation passed.");
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
