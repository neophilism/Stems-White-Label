import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAcceptedLicenseVersions,
  normalizeBuyerEmail,
  normalizeCartIds,
} from "./checkout";

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


test("accepted license versions must exactly match the reviewed quote", () => {
  const quote = {
    items: [
      { licenseVersionId: "lv_1" },
      { licenseVersionId: "lv_2" },
    ],
  };

  assert.doesNotThrow(() =>
    assertAcceptedLicenseVersions(quote, ["lv_1", "lv_2"]),
  );
  assert.throws(() =>
    assertAcceptedLicenseVersions(quote, ["lv_1"]),
  );
  assert.throws(() =>
    assertAcceptedLicenseVersions(quote, ["lv_1", "lv_old"]),
  );
});
