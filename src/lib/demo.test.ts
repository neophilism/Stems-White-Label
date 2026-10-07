import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_FEATURES,
  DEMO_PRICING,
  DEMO_THEMES,
  demoModeEnabled,
  demoTenantSlug,
} from "@/lib/demo";

test("demo mode is explicitly opt-in", () => {
  assert.equal(demoModeEnabled({}), false);
  assert.equal(demoModeEnabled({ DEMO_MODE: "false" }), false);
  assert.equal(demoModeEnabled({ DEMO_MODE: "true" }), true);
});

test("demo tenant slug has a safe stable default", () => {
  assert.equal(demoTenantSlug({}), "stems-demo");
  assert.equal(demoTenantSlug({ DEMO_TENANT_SLUG: " sample " }), "sample");
});

test("presentation configuration is complete", () => {
  assert.equal(DEMO_THEMES.length >= 3, true);
  assert.equal(DEMO_FEATURES.length, 4);
  assert.equal(DEMO_PRICING.length >= 3, true);
  assert.equal(DEMO_PRICING.filter((plan) => plan.featured).length, 1);
  for (const theme of DEMO_THEMES) {
    assert.match(theme.vars.background, /^#[0-9a-f]{6}$/i);
    assert.match(theme.vars.accent, /^#[0-9a-f]{6}$/i);
  }
});
