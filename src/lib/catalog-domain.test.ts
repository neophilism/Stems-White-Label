import assert from "node:assert/strict";
import test from "node:test";

import {
  assertWorkStatusTransition,
  canTransitionWorkStatus,
  validateStemGroupDefinition,
} from "./catalog-domain";

test("published work can be unpublished back to ready", () => {
  assert.equal(canTransitionWorkStatus("PUBLISHED", "READY"), true);
});

test("draft work cannot publish without reaching ready", () => {
  assert.equal(canTransitionWorkStatus("DRAFT", "PUBLISHED"), false);
  assert.throws(() => assertWorkStatusTransition("DRAFT", "PUBLISHED"));
});

test("stem groups are arbitrary creator-defined musical sections", () => {
  const stem = validateStemGroupDefinition({
    slug: "horn-section-1",
    label: "Horn Section 1",
    position: 2,
  });

  assert.deepEqual(stem, {
    slug: "horn-section-1",
    label: "Horn Section 1",
    position: 2,
  });
});

test("stem group validation does not impose an instrument taxonomy", () => {
  const stem = validateStemGroupDefinition({
    slug: "strange-room-resonance",
    label: "Strange Room Resonance",
  });

  assert.equal(stem.label, "Strange Room Resonance");
});
