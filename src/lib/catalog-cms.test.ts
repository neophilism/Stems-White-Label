import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCredits,
  normalizeReveal,
  normalizeStemInputs,
  normalizeWorkInput,
  slugifyCatalogValue,
  validatePublishReadiness,
} from "./catalog-cms";

test("catalog slugs are deterministic and URL safe", () => {
  assert.equal(slugifyCatalogValue(" Horn Section / Suite No. 1 "), "horn-section-suite-no-1");
});

test("work editor rejects invalid numeric metadata", () => {
  assert.throws(() => normalizeWorkInput({ title: "Work", bpm: -1 }));
  assert.throws(() => normalizeWorkInput({ title: "Work", durationMs: 1.5 }));
});

test("stem editor preserves arbitrary creator-defined group names", () => {
  const stems = normalizeStemInputs([
    { label: "Horn Section 1", slug: "horn-section-1" },
    { label: "Distorted Room Return", slug: "distorted-room-return" },
  ]);

  assert.equal(stems[0].label, "Horn Section 1");
  assert.equal(stems[1].label, "Distorted Room Return");
});

test("stem slugs must be unique", () => {
  assert.throws(() =>
    normalizeStemInputs([
      { label: "Horns", slug: "horns" },
      { label: "Other Horns", slug: "horns" },
    ]),
  );
});

test("credits require role and display name", () => {
  assert.throws(() => normalizeCredits([{ role: "", displayName: "A" }]));
});

test("Reveal choreography validates targeted actions and sorts time", () => {
  const reveal = normalizeReveal({
    name: "Build",
    steps: [
      { atMs: 5000, action: "ALL_SOURCES", stemGroupId: null },
      { atMs: 0, action: "SILENCE", stemGroupId: null },
    ],
  });

  assert.equal(reveal?.steps[0].atMs, 0);
  assert.equal(reveal?.steps[1].atMs, 5000);
});

test("publishing requires a ready master and no processing failures", () => {
  assert.doesNotThrow(() =>
    validatePublishReadiness({
      currentStatus: "READY",
      readyMasterCount: 1,
      processingSourceCount: 0,
      failedSourceCount: 0,
    }),
  );

  assert.throws(() =>
    validatePublishReadiness({
      currentStatus: "READY",
      readyMasterCount: 0,
      processingSourceCount: 0,
      failedSourceCount: 0,
    }),
  );
});
