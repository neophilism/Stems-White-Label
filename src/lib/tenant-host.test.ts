import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHostname } from "./tenant";
test("tenant normalization refuses ambiguous or injected hosts", () => {
  for (const host of ["first.example, second.example", "first.example/admin", "first.example@evil.test", "first.example:9999", "first.example\\\\evil", "bad..example"])
    assert.equal(normalizeHostname(host), "");
});
test("tenant normalization permits well-formed domains", () => {
  assert.equal(normalizeHostname("SHOP.EXAMPLE."), "shop.example");
  assert.equal(normalizeHostname("shop.example:443"), "shop.example");
});
