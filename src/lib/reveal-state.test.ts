import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRevealState,
  validateRevealStep,
  type RevealStepState,
} from "./reveal-state";

const groups = new Set(["drums", "bass", "horns"]);

const steps: RevealStepState[] = [
  {
    atMs: 0,
    action: "ADD_SOURCE",
    stemGroupId: "bass",
    caption: "Bass enters alone.",
  },
  {
    atMs: 4000,
    action: "ADD_SOURCE",
    stemGroupId: "drums",
    caption: "The rhythm section forms.",
  },
  {
    atMs: 8000,
    action: "ADD_SOURCE",
    stemGroupId: "horns",
    caption: "Horn Section enters.",
  },
  {
    atMs: 12000,
    action: "REMOVE_SOURCE",
    stemGroupId: "bass",
    caption: "Bass drops away.",
  },
  {
    atMs: 16000,
    action: "ALL_SOURCES",
    stemGroupId: null,
    caption: "The complete source arrangement.",
  },
  {
    atMs: 20000,
    action: "FULL_MIX",
    stemGroupId: null,
    caption: "Return to the finished record.",
  },
];

test("reveal begins from silence and adds creator-defined groups", () => {
  const before = resolveRevealState(steps, -1, groups);
  assert.deepEqual([...before.muted].sort(), ["bass", "drums", "horns"]);

  const bassOnly = resolveRevealState(steps, 1000, groups);
  assert.equal(bassOnly.mode, "stems");
  assert.deepEqual([...bassOnly.muted].sort(), ["drums", "horns"]);
  assert.equal(bassOnly.caption, "Bass enters alone.");
});

test("reveal supports adding and removing groups", () => {
  const afterHorns = resolveRevealState(steps, 9000, groups);
  assert.equal(afterHorns.muted.size, 0);

  const bassRemoved = resolveRevealState(steps, 13000, groups);
  assert.deepEqual([...bassRemoved.muted].sort(), ["bass"]);
});

test("reveal can transition to all sources and then full mix", () => {
  const allSources = resolveRevealState(steps, 17000, groups);
  assert.equal(allSources.mode, "stems");
  assert.equal(allSources.muted.size, 0);

  const fullMix = resolveRevealState(steps, 21000, groups);
  assert.equal(fullMix.mode, "full");
  assert.equal(fullMix.caption, "Return to the finished record.");
});

test("reveal validation enforces action shape", () => {
  assert.throws(() =>
    validateRevealStep({
      atMs: 1000,
      action: "ADD_SOURCE",
      stemGroupId: null,
      caption: null,
    }),
  );

  assert.throws(() =>
    validateRevealStep({
      atMs: -1,
      action: "SILENCE",
      stemGroupId: null,
      caption: null,
    }),
  );

  assert.doesNotThrow(() =>
    validateRevealStep({
      atMs: 0,
      action: "SILENCE",
      stemGroupId: null,
      caption: "Begin from silence.",
    }),
  );
});
