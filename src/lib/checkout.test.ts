import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBuyerEmail, normalizeCartIds } from "./checkout";

test("normalizes cart ids and removes duplicates", () => {
  assert.deepEqual(normalizeCartIds(["a", "b", "a"]), ["a", "b"]);
});

test("cart validation rejects empty carts", () => {
  assert.throws(() => normalizeCartIds([]));
});

test("normalizes buyer email", () => {
  assert.equal(normalizeBuyerEmail(" Buyer@Example.COM "), "buyer@example.com");
  assert.throws(() => normalizeBuyerEmail("not-an-email"));
});
