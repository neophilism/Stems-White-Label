
import assert from "node:assert/strict";

import { getTenantAnalyticsReport } from "../src/lib/analytics-report";
import { db } from "../src/lib/db";

async function main() {
  const suffix = Date.now().toString(36);
  const now = new Date();

  const tenant = await db.tenant.create({
    data: {
      name: "Analytics Validation " + suffix,
      slug: "analytics-validation-" + suffix,
    },
  });

  try {
    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        slug: "analytics-work-" + suffix,
        title: "Analytics Work",
        status: "PUBLISHED",
        publishedAt: now,
      },
    });

    const stem = await db.stemGroup.create({
      data: {
        workId: work.id,
        slug: "horns",
        label: "Horn Section",
      },
    });

    const product = await db.licenseProduct.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        slug: "source-license",
        name: "Source License",
        scope: "ALL_STEMS",
      },
    });

    const version = await db.licenseVersion.create({
      data: {
        licenseProductId: product.id,
        version: 1,
        priceCents: 1000,
        currency: "USD",
        termsText: "Analytics validation terms.",
      },
    });

    const paidOrder = await db.order.create({
      data: {
        tenantId: tenant.id,
        status: "PARTIALLY_REFUNDED",
        currency: "USD",
        subtotalCents: 1000,
        totalCents: 1000,
        termsAcceptedAt: now,
        paidAt: now,
      },
    });

    await db.orderItem.create({
      data: {
        orderId: paidOrder.id,
        licenseProductId: product.id,
        licenseVersionId: version.id,
        workId: work.id,
        licenseNameSnapshot: product.name,
        workTitleSnapshot: work.title,
        licenseVersionNumber: 1,
        scopeSnapshot: "ALL_STEMS",
        unitPriceCents: 1000,
        currency: "USD",
        termsTextSnapshot: version.termsText,
        attributionRequired: false,
        commercialUseAllowed: true,
        derivativesAllowed: true,
        redistributionAllowed: false,
      },
    });

    await db.payment.create({
      data: {
        tenantId: tenant.id,
        orderId: paidOrder.id,
        status: "PARTIALLY_REFUNDED",
        amountCents: 1000,
        refundedCents: 200,
        currency: "USD",
      },
    });

    const openOrder = await db.order.create({
      data: {
        tenantId: tenant.id,
        status: "CHECKOUT_CREATED",
        currency: "USD",
        subtotalCents: 500,
        totalCents: 500,
        termsAcceptedAt: now,
      },
    });

    await db.analyticsEvent.createMany({
      data: [
        {
          tenantId: tenant.id,
          type: "WORK_VIEW",
          workId: work.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "view_a_" + suffix,
        },
        {
          tenantId: tenant.id,
          type: "WORK_VIEW",
          workId: work.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "view_b_" + suffix,
        },
        {
          tenantId: tenant.id,
          type: "WORK_VIEW",
          workId: work.id,
          sessionId: "session_b_" + suffix,
          clientEventId: "view_c_" + suffix,
        },
        {
          tenantId: tenant.id,
          type: "PLAYER_PLAY",
          workId: work.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "play_a_" + suffix,
          positionMs: 0,
        },
        {
          tenantId: tenant.id,
          type: "PLAYER_PLAY",
          workId: work.id,
          sessionId: "session_b_" + suffix,
          clientEventId: "play_b_" + suffix,
          positionMs: 2500,
        },
        {
          tenantId: tenant.id,
          type: "REVEAL_START",
          workId: work.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "reveal_start_" + suffix,
          positionMs: 0,
        },
        {
          tenantId: tenant.id,
          type: "REVEAL_COMPLETE",
          workId: work.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "reveal_complete_" + suffix,
          positionMs: 10000,
        },
        {
          tenantId: tenant.id,
          type: "STEM_MUTE",
          workId: work.id,
          stemGroupId: stem.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "mute_" + suffix,
          positionMs: 3000,
        },
        {
          tenantId: tenant.id,
          type: "STEM_SOLO",
          workId: work.id,
          stemGroupId: stem.id,
          sessionId: "session_b_" + suffix,
          clientEventId: "solo_" + suffix,
          positionMs: 4500,
        },
        {
          tenantId: tenant.id,
          type: "CHECKOUT_STARTED",
          orderId: paidOrder.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "checkout_paid_" + suffix,
        },
        {
          tenantId: tenant.id,
          type: "PURCHASE_COMPLETED",
          orderId: paidOrder.id,
          sessionId: "session_a_" + suffix,
          clientEventId: "purchase_" + suffix,
        },
        {
          tenantId: tenant.id,
          type: "CHECKOUT_STARTED",
          orderId: openOrder.id,
          sessionId: "session_c_" + suffix,
          clientEventId: "checkout_open_" + suffix,
        },
      ],
    });

    const report = await getTenantAnalyticsReport(tenant.id, 30);

    assert.equal(report.totals.views, 3);
    assert.equal(report.totals.uniqueSessions, 3);
    assert.equal(report.totals.plays, 2);
    assert.equal(report.totals.revealStarts, 1);
    assert.equal(report.totals.revealCompletes, 1);
    assert.equal(report.totals.stemInteractions, 2);
    assert.equal(report.totals.checkoutStarts, 2);
    assert.equal(report.totals.convertedCheckouts, 1);
    assert.equal(report.totals.conversionRate, 50);

    assert.equal(report.revenue.length, 1);
    assert.equal(report.revenue[0]?.currency, "USD");
    assert.equal(report.revenue[0]?.grossCents, "1000");
    assert.equal(report.revenue[0]?.refundedCents, "200");
    assert.equal(report.revenue[0]?.netCents, "800");
    assert.equal(report.revenue[0]?.paidOrders, 1);

    assert.equal(report.topWorks[0]?.workId, work.id);
    assert.equal(report.topWorks[0]?.views, 3);
    assert.equal(report.topWorks[0]?.uniqueViewSessions, 2);
    assert.equal(report.topWorks[0]?.plays, 2);
    assert.equal(report.topWorks[0]?.paidUnits, 1);

    assert.equal(report.topSourceGroups[0]?.stemGroupId, stem.id);
    assert.equal(report.topSourceGroups[0]?.interactions, 2);
    assert.equal(report.topSourceGroups[0]?.muteChanges, 1);
    assert.equal(report.topSourceGroups[0]?.soloChanges, 1);

    assert.ok(report.daily.length >= 1);

    console.log("Analytics database integration validation passed.");
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
