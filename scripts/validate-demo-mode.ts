import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import { seedDemoExperience } from "../src/lib/demo-seed";

const prisma = new PrismaClient();

async function main() {
  process.env.DEMO_TENANT_SLUG = "demo-validation-" + Date.now();
  const tenant = await seedDemoExperience(prisma);

  const loaded = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: {
      theme: true,
      subscription: true,
      collections: {
        include: {
          works: {
            include: {
              work: {
                include: {
                  stemGroups: true,
                  sections: true,
                  revealSequences: { include: { steps: true } },
                  licenseProducts: { include: { versions: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  assert.ok(loaded);
  assert.equal(loaded.theme?.preset, "ATELIER");
  assert.equal(loaded.subscription?.allowWhiteLabel, true);
  assert.equal(loaded.collections.length, 1);
  assert.equal(loaded.collections[0]?.works.length, 3);

  for (const entry of loaded.collections[0]!.works) {
    assert.equal(entry.work.status, "PUBLISHED");
    assert.equal(entry.work.stemGroups.length >= 4, true);
    assert.equal(entry.work.sections.length, 2);
    assert.equal(entry.work.revealSequences.length, 1);
    assert.equal(entry.work.revealSequences[0]!.steps.length, 3);
    assert.equal(entry.work.licenseProducts.length, 1);
    assert.equal(entry.work.licenseProducts[0]!.versions.length, 1);
  }

  console.log("Presentation/demo validation passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
