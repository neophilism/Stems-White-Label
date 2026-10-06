import assert from "node:assert/strict";

import {
  makeTenantDomainPrimary,
  registerTenantDomain,
} from "../src/lib/domain-service";
import { db } from "../src/lib/db";
import { resolveTenantByHostnameDirect } from "../src/lib/tenant";

async function main() {
  const suffix = Date.now().toString(36);

  const [tenantA, tenantB] = await Promise.all([
    db.tenant.create({
      data: {
        name: "Domain Tenant A " + suffix,
        slug: "domain-tenant-a-" + suffix,
      },
    }),
    db.tenant.create({
      data: {
        name: "Domain Tenant B " + suffix,
        slug: "domain-tenant-b-" + suffix,
      },
    }),
  ]);

  try {
    await db.tenantSubscription.createMany({
      data: [
        {
          tenantId: tenantA.id,
          status: "ACTIVE",
          planKey: "domain-test",
          planName: "Domain Test",
          maxCustomDomains: null,
          allowCustomDomains: true,
          allowWhiteLabel: true,
        },
        {
          tenantId: tenantB.id,
          status: "ACTIVE",
          planKey: "domain-test",
          planName: "Domain Test",
          maxCustomDomains: null,
          allowCustomDomains: true,
          allowWhiteLabel: true,
        },
      ],
    });

    const primary = await db.tenantDomain.create({
      data: {
        tenantId: tenantA.id,
        hostname: "ready-" + suffix + ".example.test",
        isPrimary: true,
        ownershipStatus: "VERIFIED",
        routingStatus: "READY",
        tlsStatus: "READY",
        verifiedAt: new Date(),
        routingVerifiedAt: new Date(),
        tlsVerifiedAt: new Date(),
      },
    });

    await db.tenantDomain.create({
      data: {
        tenantId: tenantB.id,
        hostname: "pending-" + suffix + ".example.test",
        ownershipStatus: "PENDING",
        routingStatus: "PENDING",
        tlsStatus: "PENDING",
        verificationToken: "pending-" + suffix,
        claimExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    const resolved = await resolveTenantByHostnameDirect(primary.hostname);
    assert.equal(resolved?.id, tenantA.id);

    const blocked = await resolveTenantByHostnameDirect(
      "pending-" + suffix + ".example.test",
    );
    assert.equal(blocked, null);

    const secondReady = await db.tenantDomain.create({
      data: {
        tenantId: tenantA.id,
        hostname: "second-" + suffix + ".example.test",
        ownershipStatus: "VERIFIED",
        routingStatus: "READY",
        tlsStatus: "READY",
        verifiedAt: new Date(),
        routingVerifiedAt: new Date(),
        tlsVerifiedAt: new Date(),
      },
    });

    await makeTenantDomainPrimary(tenantA.id, secondReady.id);

    const [oldPrimary, newPrimary] = await Promise.all([
      db.tenantDomain.findUniqueOrThrow({ where: { id: primary.id } }),
      db.tenantDomain.findUniqueOrThrow({ where: { id: secondReady.id } }),
    ]);
    assert.equal(oldPrimary.isPrimary, false);
    assert.equal(newPrimary.isPrimary, true);

    const expiredHostname = "expired-" + suffix + ".example.test";
    await db.tenantDomain.create({
      data: {
        tenantId: tenantA.id,
        hostname: expiredHostname,
        verificationToken: "expired-token-" + suffix,
        ownershipStatus: "PENDING",
        routingStatus: "PENDING",
        tlsStatus: "PENDING",
        claimExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    const reclaimed = await registerTenantDomain(tenantB.id, expiredHostname);
    assert.equal(reclaimed.tenantId, tenantB.id);
    assert.equal(reclaimed.hostname, expiredHostname);
    assert.equal(reclaimed.ownershipStatus, "PENDING");
    assert.ok(reclaimed.verificationToken);
    assert.ok(reclaimed.claimExpiresAt);

    await assert.rejects(
      () =>
        db.tenantDomain.create({
          data: {
            tenantId: tenantA.id,
            hostname: "duplicate-primary-" + suffix + ".example.test",
            isPrimary: true,
            ownershipStatus: "VERIFIED",
            routingStatus: "READY",
            tlsStatus: "READY",
          },
        }),
    );

    console.log("Custom domain database integration validation passed.");
  } finally {
    await db.tenant.deleteMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
