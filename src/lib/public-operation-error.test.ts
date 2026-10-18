import assert from "node:assert/strict";
import test from "node:test";
import { publicOperationError } from "./public-operation-error";

test("public APIs retain fixed validation guidance and hide arbitrary diagnostics", () => {
  assert.equal(publicOperationError(new Error("Cart is empty."), "Unable to quote cart."), "Cart is empty.");
  for (const diagnostic of [new Error("postgresql://user:secret@internal/db"), new Error("Stripe InvalidRequestError customer cus_private"), new Error("Signature mismatch for body customer@example.com"), { message: "Cart is empty." }, "secret", null]) {
    assert.equal(publicOperationError(diagnostic, "Unable to start checkout."), "Unable to start checkout.");
  }
});
