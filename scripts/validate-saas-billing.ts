import assert from "node:assert/strict";

import {
  assertTenantCanCreateWork,
  assertTenantCanRegisterCustomDomain,
  assertTenantCanUseWhiteLabel,
  assertTenantStorageCapacity,
  ensureTenantSubscription,
  getTenantUsage,
  subscriptionAccessState,
} from "../src/lib/billing";
import { db } from "../src/lib/db";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: {
      name: "Billing Validation " + suffix,
      slug: "billing-validation-" + suffix,
    },
  });

  try {
    const initial = await ensureTenantSubscription(tenant.id);
    assert.equal(initial.status, "UNSUBSCRIBED");
    assert.equal(subscriptionAccessState(initial).allowed, false);
    await assert.rejects(() => assertTenantCanCreateWork(tenant.id));

    await db.tenantSubscription.update({
      where: { tenantId: tenant.id },
      data: {
        status: "ACTIVE",
        planKey: "validation",
        planName: "Validation Plan",
        maxWorks: 1,
        maxStorageBytes: 2000n,
        maxCustomDomains: 1,
        maxMembers: 3,
        allowCustomDomains: true,
        allowWhiteLabel: true,
      },
    });

    await assertTenantCanCreateWork(tenant.id);
    await assertTenantCanUseWhiteLabel(tenant.id);
    await assertTenantCanRegisterCustomDomain(tenant.id);

    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        slug: "billing-work-" + suffix,
        title: "Billing Work",
      },
    });

    await assert.rejects(() => assertTenantCanCreateWork(tenant.id));

    await db.audioAsset.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        kind: "MASTER",
        status: "READY",
        fileName: "master.wav",
        storageKey: "billing/" + suffix + "/master.wav",
        sizeBytes: 1000n,
      },
    });

    await db.artworkAsset.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        status: "READY",
        fileName: "cover.png",
        storageKey: "billing/" + suffix + "/cover.png",
        mimeType: "image/png",
        sizeBytes: 500n,
      },
    });

    const usage = await getTenantUsage(tenant.id);
    assert.equal(usage.works, 1);
    assert.equal(usage.storageBytes, 1500n);

    await assertTenantStorageCapacity(tenant.id, 500n);
    await assert.rejects(() =>
      assertTenantStorageCapacity(tenant.id, 501n),
    );

    await db.tenantDomain.create({
      data: {
        tenantId: tenant.id,
        hostname: "billing-" + suffix + ".example.test",
        verificationToken: "billing-" + suffix,
      },
    });

    await assert.rejects(() =>
      assertTenantCanRegisterCustomDomain(tenant.id),
    );

    await db.tenantSubscription.update({
      where: { tenantId: tenant.id },
      data: {
        status: "PAST_DUE",
        pastDueGraceUntil: new Date(Date.now() + 60_000),
      },
    });
    assert.equal(
      subscriptionAccessState(
        await db.tenantSubscription.findUniqueOrThrow({
          where: { tenantId: tenant.id },
        }),
      ).allowed,
      true,
    );

    await db.tenantSubscription.update({
      where: { tenantId: tenant.id },
      data: {
        pastDueGraceUntil: new Date(Date.now() - 60_000),
      },
    });
    await assert.rejects(() =>
      assertTenantStorageCapacity(tenant.id, 1n),
    );

    await db.tenantSubscription.update({
      where: { tenantId: tenant.id },
      data: {
        status: "ACTIVE",
        pastDueGraceUntil: null,
        allowWhiteLabel: false,
        allowCustomDomains: false,
      },
    });
    await assert.rejects(() => assertTenantCanUseWhiteLabel(tenant.id));
    await assert.rejects(() =>
      assertTenantCanRegisterCustomDomain(tenant.id),
    );

    console.log("SaaS billing entitlement integration validation passed.");
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
