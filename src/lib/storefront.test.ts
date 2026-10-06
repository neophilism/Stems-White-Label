import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDuration,
  stemSummary,
  titleMonogram,
} from "./storefront";

test("formats work duration for storefront metadata", () => {
  assert.equal(formatDuration(245_000), "4:05");
  assert.equal(formatDuration(null), null);
});

test("creates concise typographic monograms", () => {
  assert.equal(titleMonogram("Mongoose v. King"), "MVK");
  assert.equal(titleMonogram(""), "UR");
});

test("summarizes creator-defined source groups without taxonomy", () => {
  assert.equal(
    stemSummary([
      "Drums",
      "Bass",
      "Horn Section 1",
      "Horn Section 2",
      "Textures",
    ]),
    "Drums · Bass · Horn Section 1 · Horn Section 2 +1",
  );
});
