import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFeatureNote,
  normalizePlatformFeatureKey,
  normalizePlatformReason,
} from "./platform-admin";
import {
  configuredPlatformSuperAdminEmails,
  platformEmailIsBootstrapAdmin,
} from "./platform-access";

test("platform feature keys are normalized and constrained", () => {
  assert.equal(normalizePlatformFeatureKey(" Beta.New_Player "), "beta.new_player");
  assert.throws(() => normalizePlatformFeatureKey("Bad Flag!"));
  assert.throws(() => normalizePlatformFeatureKey("a"));
});

test("platform mutations require substantive reasons", () => {
  assert.equal(
    normalizePlatformReason("Customer support incident 4312."),
    "Customer support incident 4312.",
  );
  assert.throws(() => normalizePlatformReason("short"));
});

test("feature notes are optional and bounded", () => {
  assert.equal(normalizeFeatureNote(null), null);
  assert.equal(normalizeFeatureNote("  rollout cohort  "), "rollout cohort");
  assert.throws(() => normalizeFeatureNote("x".repeat(2001)));
});

test("bootstrap super-admin email allowlist normalizes addresses", () => {
  const previous = process.env.PLATFORM_SUPER_ADMIN_EMAILS;
  process.env.PLATFORM_SUPER_ADMIN_EMAILS =
    " Admin@Example.com, ops@example.com ,,";
  try {
    assert.deepEqual(
      [...configuredPlatformSuperAdminEmails()],
      ["admin@example.com", "ops@example.com"],
    );
    assert.equal(platformEmailIsBootstrapAdmin("ADMIN@example.com"), true);
    assert.equal(platformEmailIsBootstrapAdmin("other@example.com"), false);
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_SUPER_ADMIN_EMAILS;
    else process.env.PLATFORM_SUPER_ADMIN_EMAILS = previous;
  }
});
