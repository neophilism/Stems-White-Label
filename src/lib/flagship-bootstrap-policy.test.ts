import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bootstrap = readFileSync(
  new URL("../../scripts/bootstrap-flagship.ts", import.meta.url),
  "utf8",
);

test("flagship creation is opt-in and idempotent", () => {
  assert.match(bootstrap, /BOOTSTRAP_UNSEALED_RECORDS !== "true"/);
  assert.match(bootstrap, /tenant\.upsert\(/);
  assert.match(bootstrap, /tenantTheme\.upsert\(/);
  assert.match(bootstrap, /tenantSubscription\.upsert\(/);
  assert.match(bootstrap, /artist\.upsert\(/);
});

test("flagship bootstrap never takes over unverified domains or deletes tenants", () => {
  assert.doesNotMatch(bootstrap, /tenantDomain\./);
  assert.doesNotMatch(bootstrap, /tenant\.delete/);
  assert.doesNotMatch(bootstrap, /\$executeRaw/);
});
