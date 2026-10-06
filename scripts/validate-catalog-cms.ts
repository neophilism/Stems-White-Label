import assert from "node:assert/strict";

import { db } from "../src/lib/db";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: {
      name: "CMS Validation " + suffix,
      slug: "cms-validation-" + suffix,
    },
  });

  try {
    const artist = await db.artist.create({
      data: {
        tenantId: tenant.id,
        slug: "artist-" + suffix,
        name: "Validation Artist",
      },
    });

    const collection = await db.collection.create({
      data: {
        tenantId: tenant.id,
        slug: "collection-" + suffix,
        title: "Validation Collection",
      },
    });

    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        primaryArtistId: artist.id,
        slug: "work-" + suffix,
        title: "Validation Work",
        credits: {
          create: {
            role: "Producer",
            displayName: "Validation Artist",
            position: 0,
          },
        },
        sections: {
          create: {
            kind: "Construction",
            title: "How it was built",
            body: "Database-backed editorial content.",
            position: 0,
          },
        },
        collections: {
          create: {
            collectionId: collection.id,
            position: 0,
          },
        },
        artwork: {
          create: {
            tenantId: tenant.id,
            fileName: "cover.webp",
            mimeType: "image/webp",
            sizeBytes: BigInt(4096),
          },
        },
      },
    });

    const stem = await db.stemGroup.create({
      data: {
        workId: work.id,
        slug: "horn-section-1",
        label: "Horn Section 1",
        position: 0,
      },
    });

    const sequence = await db.revealSequence.create({
      data: {
        workId: work.id,
        name: "Validation Reveal",
        isPublished: true,
        steps: {
          create: [
            {
              atMs: 0,
              action: "SILENCE",
              caption: "Begin.",
            },
            {
              atMs: 5000,
              action: "ADD_SOURCE",
              stemGroupId: stem.id,
              caption: "Horns enter.",
            },
          ],
        },
      },
    });

    const loaded = await db.work.findUniqueOrThrow({
      where: { id: work.id },
      include: {
        artwork: true,
        credits: true,
        sections: true,
        collections: true,
        stemGroups: true,
        revealSequences: { include: { steps: true } },
      },
    });

    assert.equal(loaded.artwork?.fileName, "cover.webp");
    assert.equal(loaded.credits[0]?.role, "Producer");
    assert.equal(loaded.sections[0]?.kind, "Construction");
    assert.equal(loaded.collections[0]?.collectionId, collection.id);
    assert.equal(loaded.stemGroups[0]?.label, "Horn Section 1");
    assert.equal(loaded.revealSequences[0]?.id, sequence.id);
    assert.equal(loaded.revealSequences[0]?.steps.length, 2);

    await db.stemGroup.delete({ where: { id: stem.id } });
    const revealAfterStemDelete = await db.revealSequence.findUniqueOrThrow({
      where: { id: sequence.id },
      include: { steps: { orderBy: { atMs: "asc" } } },
    });
    assert.equal(revealAfterStemDelete.steps[1]?.stemGroupId, null);

    console.log("Catalog CMS database integration validation passed.");
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
