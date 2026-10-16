import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { HostedForm } from "@/lib/payment-gateway";

function tokenKey() {
  const key = process.env.PAYMENT_TOKEN_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("PAYMENT_TOKEN_KEY must contain 32 random bytes in hex.");
  return Buffer.from(key, "hex");
}

export function encryptHostedToken(token: string, tenantId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAAD(Buffer.from(tenantId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptHostedToken(value: string, tenantId: string) {
  const buffer = Buffer.from(value, "base64url");
  if (buffer.length < 29) throw new Error("Invalid hosted checkout token.");
  const cipher = createDecipheriv("aes-256-gcm", tokenKey(), buffer.subarray(0, 12));
  cipher.setAAD(Buffer.from(tenantId));
  cipher.setAuthTag(buffer.subarray(12, 28));
  return Buffer.concat([cipher.update(buffer.subarray(28)), cipher.final()]).toString("utf8");
}

export function checkoutIdentifiers() {
  return { id: randomBytes(32).toString("hex"), reference: randomBytes(10).toString("hex") };
}

export async function saveHostedCheckout(input: {
  id: string; reference: string; tenantId: string; orderId?: string; kind: "PAYMENT" | "BILLING" | "PORTAL";
  accountId: string; form: HostedForm; planId?: string; providerCustomerId?: string;
}) {
  const { form, ...fields } = input;
  return db.hostedCheckout.create({ data: {
    ...fields, provider: "AUTHORIZE_NET", token: encryptHostedToken(form.token, input.tenantId),
    actionUrl: form.actionUrl, expiresAt: new Date(Date.now() + 14 * 60_000),
  } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function hostedCheckoutResponse(form: HostedForm) {
  const action = new URL(form.actionUrl);
  if (!["https://accept.authorize.net", "https://test.authorize.net"].includes(action.origin) ||
      !["/payment/payment", "/customer/manage"].includes(action.pathname) || action.search || action.hash) {
    throw new Error("Untrusted hosted checkout destination.");
  }
  const nonce = randomBytes(18).toString("base64");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Secure checkout</title></head><body><main><h1>Continue to secure checkout</h1><p>Your payment details are entered directly with the payment provider.</p><form method="post" action="${escapeHtml(form.actionUrl)}"><input type="hidden" name="token" value="${escapeHtml(form.token)}"><button type="submit">Continue securely</button></form></main><script nonce="${nonce}">document.forms[0].submit()</script></body></html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${action.origin}; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}
