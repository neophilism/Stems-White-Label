import assert from "node:assert/strict";

import { db } from "../src/lib/db";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: { name: "License Validation " + suffix, slug: "license-validation-" + suffix },
  });

  try {
    const work = await db.work.create({
      data: { tenantId: tenant.id, slug: "work-" + suffix, title: "Licensing Work" },
    });
    const stem = await db.stemGroup.create({
      data: { workId: work.id, slug: "horn-section-1", label: "Horn Section 1" },
    });

    const product = await db.licenseProduct.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        slug: "professional-commercial",
        name: "Professional Commercial",
        scope: "SELECTED_STEMS",
        selectedStems: { create: [{ stemGroupId: stem.id }] },
        versions: {
          create: {
            version: 1,
            priceCents: 25000,
            currency: "USD",
            termsText: "Version one terms.",
          },
        },
      },
      include: { versions: true, selectedStems: true },
    });

    assert.equal(product.versions[0]?.termsText, "Version one terms.");
    assert.equal(product.selectedStems[0]?.stemGroupId, stem.id);

    await db.licenseVersion.create({
      data: {
        licenseProductId: product.id,
        version: 2,
        priceCents: 30000,
        currency: "USD",
        termsText: "Version two terms.",
      },
    });

    const history = await db.licenseVersion.findMany({
      where: { licenseProductId: product.id },
      orderBy: { version: "asc" },
    });
    assert.equal(history.length, 2);
    assert.equal(history[0]?.termsText, "Version one terms.");
    assert.equal(history[1]?.termsText, "Version two terms.");

    console.log("Licensing database integration validation passed.");
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
