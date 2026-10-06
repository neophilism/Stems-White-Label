import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStorageKey } from "./object-storage";

test("normalizes nested private object keys", () => {
  assert.equal(
    normalizeStorageKey("/tenants/t1/works/w1/originals/a1/test.wav"),
    "tenants/t1/works/w1/originals/a1/test.wav",
  );
});

test("rejects path traversal and invalid storage keys", () => {
  assert.throws(() => normalizeStorageKey("../secret.wav"));
  assert.throws(() => normalizeStorageKey("tenants/t1/../secret.wav"));
  assert.throws(() => normalizeStorageKey(""));
});
