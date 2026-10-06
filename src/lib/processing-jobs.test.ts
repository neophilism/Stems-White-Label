import assert from "node:assert/strict";
import test from "node:test";

import { retryDelayMs, safeProcessingError } from "./processing-jobs";

test("processing retries use bounded exponential backoff", () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(2), 60_000);
  assert.equal(retryDelayMs(3), 120_000);
  assert.equal(retryDelayMs(20), 900_000);
});

test("processing errors are bounded before persistence", () => {
  const message = safeProcessingError(new Error("x".repeat(5000)));
  assert.equal(message.length, 4000);
});
