import assert from "node:assert/strict";
import test from "node:test";

import { checkoutReturnOrigin } from "./checkout-origin";

test("production return URLs use tenant-authorized host, not forwarded URL", () => {
  assert.equal(
    checkoutReturnOrigin("https://attacker.example/api/checkout/session", "stems.unsealedrecords.com", true),
    "https://stems.unsealedrecords.com",
  );
  assert.equal(
    checkoutReturnOrigin("https://attacker.example/path", "stems-white-label-preview.onrender.com", true),
    "https://stems-white-label-preview.onrender.com",
  );
});

test("rejects ambiguous, local, or malicious production hosts", () => {
  for (const host of ["evil.test, stems.unsealedrecords.com", "evil.test/path", "user@evil.test",
                      "localhost", "127.0.0.1:3000", "", "evil..test", "evil.test:10000"]) {
    assert.throws(() => checkoutReturnOrigin("https://untrusted.test", host, true), host);
  }
});

test("local development still preserves its configured port", () => {
  assert.equal(
    checkoutReturnOrigin("http://localhost:3000/api/checkout/session", "localhost:3000", false),
    "http://localhost:3000",
  );
});
