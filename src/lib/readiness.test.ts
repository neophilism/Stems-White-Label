import assert from "node:assert/strict";
import test from "node:test";

import { readinessResponse } from "./readiness";

test("readiness returns 200 and avoids caching when DB check succeeds", async () => {
  const response = await readinessResponse(async () => 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).dependencies.database, "ready");
});

test("readiness returns 503 without exposing database errors", async () => {
  const response = await readinessResponse(async () => {
    throw new Error("secret database URL");
  });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.doesNotMatch(body, /secret database URL/);
  assert.match(body, /unavailable/);
});
