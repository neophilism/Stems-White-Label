
import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_DAY_OPTIONS,
  normalizeAnalyticsDays,
} from "./analytics-report";

test("analytics supports bounded dashboard windows", () => {
  assert.deepEqual(ANALYTICS_DAY_OPTIONS, [7, 30, 90, 365]);
  assert.equal(normalizeAnalyticsDays("7"), 7);
  assert.equal(normalizeAnalyticsDays(30), 30);
  assert.equal(normalizeAnalyticsDays("365"), 365);
});

test("unsupported analytics windows fall back to 30 days", () => {
  assert.equal(normalizeAnalyticsDays("1"), 30);
  assert.equal(normalizeAnalyticsDays("9999"), 30);
  assert.equal(normalizeAnalyticsDays("abc"), 30);
});
