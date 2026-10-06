import assert from "node:assert/strict";
import test from "node:test";

import { formatLicensePrice, normalizeLicenseDraft } from "./licensing";

test("normalizes arbitrary tenant-defined license names", () => {
  const license = normalizeLicenseDraft({
    name: "Independent Film / Festival",
    priceCents: 25000,
    termsText: "Licensed for one independently financed film.",
  });
  assert.equal(license.slug, "independent-film-festival");
  assert.equal(license.version.currency, "USD");
});

test("selected-stems scope requires explicit source groups", () => {
  assert.throws(() =>
    normalizeLicenseDraft({
      name: "Selected",
      scope: "SELECTED_STEMS",
      priceCents: 5000,
      termsText: "Terms.",
    }),
  );
});

test("license limits must be positive integers", () => {
  assert.throws(() =>
    normalizeLicenseDraft({
      name: "Commercial",
      priceCents: 10000,
      termsText: "Terms.",
      projectLimit: 0,
    }),
  );
});

test("formats license price from integer cents", () => {
  assert.equal(formatLicensePrice(12500, "USD"), "$125.00");
});
