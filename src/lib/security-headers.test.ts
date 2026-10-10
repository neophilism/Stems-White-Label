import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../../next.config";

test("storefront responses apply basic browser security headers", async () => {
  const rules = await nextConfig.headers?.();
  assert.ok(rules && rules.length > 0);
  const names = new Set(rules[0]?.headers.map((header) => header.key));
  for (const required of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.equal(names.has(required), true);
  }
});
