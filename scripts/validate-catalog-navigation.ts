import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import {
  getPublishedCollection,
  searchPublishedCatalog,
} from "../src/lib/storefront";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: {
      name: "Catalog Navigation " + suffix,
      slug: "catalog-navigation-" + suffix,
    },
  });

  try {
    const [first, second, draft] = await Promise.all([
      db.work.create({
        data: {
          tenantId: tenant.id,
          slug: "first-" + suffix,
          title: "First Published Work",
          status: "PUBLISHED",
          publishedAt: new Date(),
          credits: {
            create: [{ role: "Arranger", displayName: "Ada Brass", position: 0 }],
          },
          stemGroups: {
            create: [{ slug: "horn-section-one", label: "Horn Section 1", position: 0 }],
          },
        },
      }),
      db.work.create({
        data: {
          tenantId: tenant.id,
          slug: "second-" + suffix,
          title: "Second Published Work",
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      }),
      db.work.create({
        data: {
          tenantId: tenant.id,
          slug: "draft-" + suffix,
          title: "Private Draft",
          status: "DRAFT",
          stemGroups: {
            create: [{ slug: "secret-choir", label: "Secret Choir", position: 0 }],
          },
        },
      }),
    ]);

    const collection = await db.collection.create({
      data: {
        tenantId: tenant.id,
        slug: "brass-room-" + suffix,
        title: "Brass Room",
        description: "Curated brass source material.",
        status: "PUBLISHED",
        publishedAt: new Date(),
        works: {
          create: [
            { workId: second.id, position: 0 },
            { workId: first.id, position: 1 },
            { workId: draft.id, position: 2 },
          ],
        },
      },
    });

    const room = await getPublishedCollection(tenant.id, collection.slug);
    assert.ok(room);
    assert.deepEqual(
      room.works.map((entry) => entry.work.id),
      [second.id, first.id],
    );

    const byStem = await searchPublishedCatalog(tenant.id, {
      q: "Horn Section 1",
    });
    assert.deepEqual(byStem.works.map((work) => work.id), [first.id]);

    const byCredit = await searchPublishedCatalog(tenant.id, {
      q: "Ada Brass",
    });
    assert.deepEqual(byCredit.works.map((work) => work.id), [first.id]);

    const byCollection = await searchPublishedCatalog(tenant.id, {
      collectionSlug: collection.slug,
    });
    assert.deepEqual(
      new Set(byCollection.works.map((work) => work.id)),
      new Set([first.id, second.id]),
    );

    const unpublishedSearch = await searchPublishedCatalog(tenant.id, {
      q: "Secret Choir",
    });
    assert.equal(unpublishedSearch.works.length, 0);

    console.log("Catalog navigation database integration validation passed.");
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
