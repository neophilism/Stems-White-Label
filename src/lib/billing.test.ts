import assert from "node:assert/strict";
import test from "node:test";

import {
  allowedBillingPriceIds,
  subscriptionAccessState,
} from "./billing";

test("billing price allowlist removes duplicates and blanks", () => {
  const previous = process.env.SAAS_BILLING_PRICE_IDS;
  process.env.SAAS_BILLING_PRICE_IDS = "price_a, price_b,price_a,,";
  try {
    assert.deepEqual(allowedBillingPriceIds(), ["price_a", "price_b"]);
  } finally {
    if (previous === undefined) delete process.env.SAAS_BILLING_PRICE_IDS;
    else process.env.SAAS_BILLING_PRICE_IDS = previous;
  }
});

test("active, trialing, and grandfathered subscriptions allow access", () => {
  for (const status of ["ACTIVE", "TRIALING", "GRANDFATHERED"]) {
    assert.equal(
      subscriptionAccessState({
        status,
        pastDueGraceUntil: null,
      }).allowed,
      true,
    );
  }
});

test("past-due subscriptions honor a bounded grace window", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  assert.equal(
    subscriptionAccessState(
      {
        status: "PAST_DUE",
        pastDueGraceUntil: new Date("2026-10-07T12:00:00Z"),
      },
      now,
    ).allowed,
    true,
  );

  assert.equal(
    subscriptionAccessState(
      {
        status: "PAST_DUE",
        pastDueGraceUntil: new Date("2026-10-05T12:00:00Z"),
      },
      now,
    ).allowed,
    false,
  );
});

test("unsubscribed and terminal subscriptions fail closed", () => {
  for (const status of [
    "UNSUBSCRIBED",
    "CANCELED",
    "UNPAID",
    "INCOMPLETE",
    "INCOMPLETE_EXPIRED",
    "PAUSED",
  ]) {
    assert.equal(
      subscriptionAccessState({
        status,
        pastDueGraceUntil: null,
      }).allowed,
      false,
    );
  }
});
