import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogSlug,
  collectionNeighborIndexes,
  normalizeCatalogSearch,
  normalizeCollectionDraft,
} from "./catalog-navigation";

test("collection slugs are URL-safe", () => {
  assert.equal(catalogSlug("  Session: Brass & Dust  "), "session-brass-dust");
});

test("catalog search is bounded and whitespace-normalized", () => {
  assert.equal(normalizeCatalogSearch("  horn   section  "), "horn section");
});

test("collection drafts preserve explicit editorial Work ordering", () => {
  const draft = normalizeCollectionDraft({
    title: "Sessions",
    status: "PUBLISHED",
    orderedWorkIds: ["work-b", "work-a", "work-b"],
  });

  assert.deepEqual(draft.orderedWorkIds, ["work-b", "work-a"]);
  assert.equal(draft.slug, "sessions");
  assert.equal(draft.status, "PUBLISHED");
});

test("collection navigation wraps through published rooms", () => {
  assert.deepEqual(collectionNeighborIndexes(3, 0), { previous: 2, next: 1 });
  assert.deepEqual(collectionNeighborIndexes(3, 2), { previous: 1, next: 0 });
  assert.deepEqual(collectionNeighborIndexes(1, 0), {
    previous: null,
    next: null,
  });
});
