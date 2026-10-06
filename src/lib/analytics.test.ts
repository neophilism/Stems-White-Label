import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_ANALYTICS_TYPES,
  normalizeAnalyticsEventId,
  normalizeAnalyticsPositionMs,
  normalizeAnalyticsSessionId,
} from "./analytics";

test("public analytics vocabulary excludes server conversion events", () => {
  assert.equal(PUBLIC_ANALYTICS_TYPES.has("WORK_VIEW"), true);
  assert.equal(PUBLIC_ANALYTICS_TYPES.has("REVEAL_START"), true);
  assert.equal(PUBLIC_ANALYTICS_TYPES.has("CHECKOUT_STARTED"), false);
  assert.equal(PUBLIC_ANALYTICS_TYPES.has("PURCHASE_COMPLETED"), false);
});

test("analytics event IDs are bounded opaque identifiers", () => {
  assert.equal(normalizeAnalyticsEventId("evt_12345678"), "evt_12345678");
  assert.throws(() => normalizeAnalyticsEventId("bad id"));
  assert.throws(() => normalizeAnalyticsEventId("short"));
});

test("analytics positions are integer milliseconds within one day", () => {
  assert.equal(normalizeAnalyticsPositionMs(1234), 1234);
  assert.equal(normalizeAnalyticsPositionMs(null), null);
  assert.throws(() => normalizeAnalyticsPositionMs(-1));
  assert.throws(() => normalizeAnalyticsPositionMs(86400001));
  assert.throws(() => normalizeAnalyticsPositionMs(10.5));
});

test("analytics session IDs reuse valid cookies and replace malformed values", () => {
  assert.equal(normalizeAnalyticsSessionId("session_12345678"), "session_12345678");
  const generated = normalizeAnalyticsSessionId("bad cookie value");
  assert.match(generated, /^[0-9a-f-]{36}$/);
});
