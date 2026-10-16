import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { AuthorizeNetGateway, centsToDecimal, decimalToCents, merchantConfig, parseMerchantConfig, type MerchantConfig } from "./payment-gateway";
import { decryptHostedToken, encryptHostedToken, hostedCheckoutResponse } from "./hosted-checkout";
import { billingPeriodEnd } from "./subscription-webhooks";
import { billingInterval } from "./subscription-gateway";

const config: MerchantConfig = { accountId: "test-merchant", apiLoginId: "test-login", transactionKey: "test-key", signatureKey: "ab".repeat(64), currency: "USD", mode: "sandbox", underwritingApproved: false };

test("money conversion uses exact cents and rejects ambiguous provider amounts", () => {
  assert.equal(centsToDecimal(12501), "125.01");
  assert.equal(decimalToCents("125.01"), 12501);
  assert.equal(decimalToCents("0.1"), 10);
  for (const amount of ["1.005", "1e5", "NaN", "-1", " 1", "9007199254740992"]) assert.throws(() => decimalToCents(amount));
  for (const amount of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => centsToDecimal(amount));
});

test("webhook signatures authenticate exact bytes using the binary signature key", () => {
  const gateway = new AuthorizeNetGateway(config);
  const raw = '{"amount":125}';
  const signature = "sha512=" + createHmac("sha512", Buffer.from(config.signatureKey, "hex")).update(raw).digest("hex");
  gateway.verifyWebhook(raw, signature);
  assert.throws(() => gateway.verifyWebhook(raw + "\n", signature));
  for (const signature of [null, "sha512=00", "sha512=" + "0".repeat(128)]) assert.throws(() => gateway.verifyWebhook(raw, signature));
});

test("live payments require both underwriting approval and operator activation", () => {
  const previous = process.env.COMMERCE_MERCHANTS_JSON;
  const enabled = process.env.LIVE_COMMERCE_ENABLED;
  try {
    process.env.LIVE_COMMERCE_ENABLED = "false";
    process.env.COMMERCE_MERCHANTS_JSON = JSON.stringify({ t1: { ...config, mode: "live", underwritingApproved: true } });
    assert.throws(() => merchantConfig("t1"));
    process.env.LIVE_COMMERCE_ENABLED = "true";
    process.env.COMMERCE_MERCHANTS_JSON = JSON.stringify({ t1: { ...config, mode: "live", underwritingApproved: false } });
    assert.throws(() => merchantConfig("t1"));
    assert.throws(() => merchantConfig("t2"));
    assert.throws(() => merchantConfig("__proto__"));
    assert.throws(() => parseMerchantConfig({ ...config, signatureKey: "invalid" }));
  } finally {
    if (previous === undefined) delete process.env.COMMERCE_MERCHANTS_JSON; else process.env.COMMERCE_MERCHANTS_JSON = previous;
    if (enabled === undefined) delete process.env.LIVE_COMMERCE_ENABLED; else process.env.LIVE_COMMERCE_ENABLED = enabled;
  }
});

test("hosted checkout sends immutable amount and reference without taking card data", async () => {
  let calls = 0;
  const gateway = new AuthorizeNetGateway(config, async (url, init) => {
    calls++;
    assert.equal(url, "https://apitest.authorize.net/xml/v1/request.api");
    const body = JSON.parse(String(init?.body)).getHostedPaymentPageRequest;
    assert.equal(body.transactionRequest.amount, "125.01");
    assert.deepEqual(body.transactionRequest.order, { invoiceNumber: "0123456789abcdef1234" });
    assert.equal(body.transactionRequest.payment, undefined);
    assert.equal(init?.redirect, "error");
    return new Response(JSON.stringify({ token: "hosted-token", messages: { resultCode: "Ok" } }));
  });
  const input = { reference: "0123456789abcdef1234", amountCents: 12501, currency: "USD", email: "buyer@example.test", returnUrl: "https://store.test/receipt", cancelUrl: "https://store.test/cart" };
  assert.deepEqual(await gateway.hostedPayment(input), { token: "hosted-token", actionUrl: "https://test.authorize.net/payment/payment" });
  await assert.rejects(() => gateway.hostedPayment({ ...input, currency: "EUR" }));
  assert.equal(calls, 1);
});

test("gateway failures never echo merchant credentials or customer error text", async () => {
  const gateway = new AuthorizeNetGateway(config, async () => new Response(JSON.stringify({ messages: { resultCode: "Error", message: [{ code: "E00001", text: "secret-value buyer@example.test" }] } })));
  await assert.rejects(() => gateway.transaction("123"), error => {
    assert.match(String(error), /E00001/);
    assert.doesNotMatch(String(error), /secret-value|buyer@example/);
    return true;
  });
});

test("hosted tokens are authenticated, tenant bound, and never sent to arbitrary URLs", async () => {
  const previous = process.env.PAYMENT_TOKEN_KEY;
  process.env.PAYMENT_TOKEN_KEY = "cd".repeat(32);
  try {
    const encrypted = encryptHostedToken("token-value", "tenant-1");
    assert.equal(decryptHostedToken(encrypted, "tenant-1"), "token-value");
    assert.throws(() => decryptHostedToken(encrypted, "tenant-2"));
    const damaged = Buffer.from(encrypted, "base64url"); damaged[30] ^= 1;
    assert.throws(() => decryptHostedToken(damaged.toString("base64url"), "tenant-1"));
    const response = hostedCheckoutResponse({ token: '\"><script>attack()</script>', actionUrl: "https://test.authorize.net/payment/payment" });
    assert.match(response.headers.get("Content-Security-Policy")!, /form-action https:\/\/test.authorize.net/);
    assert.doesNotMatch(await response.text(), /<script>attack/);
    assert.throws(() => hostedCheckoutResponse({ token: "secret", actionUrl: "https://attacker.test/payment/payment" }));
  } finally { if (previous === undefined) delete process.env.PAYMENT_TOKEN_KEY; else process.env.PAYMENT_TOKEN_KEY = previous; }
});

test("recurring periods preserve calendar month boundaries and provider interval constraints", () => {
  assert.equal(billingPeriodEnd(new Date("2028-01-31T12:00:00Z"), "month", 1).toISOString(), "2028-02-29T12:00:00.000Z");
  assert.deepEqual(billingInterval("year", 1), { unit: "months", length: 12 });
  assert.throws(() => billingInterval("day", 1));
  assert.throws(() => billingInterval("month", 13));
});
