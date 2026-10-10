import assert from "node:assert/strict";
import test from "node:test";

import { probeDeployment, probeEndpoint } from "./live-smoke.mjs";

const good = (url) => new Response(
  JSON.stringify({
    ok: true,
    service: "stems-white-label",
    ...(url.pathname === "/api/ready" ? { dependencies: { database: "ready" } } : {}),
  }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);

test("probes both actual application endpoints, including database readiness", async () => {
  const paths = [];
  const result = await probeDeployment(
    "https://stems-white-label-preview.onrender.com",
    async (url) => { paths.push(url.pathname); return good(url); },
    { attempts: 1 },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(paths, ["/api/health", "/api/ready"]);
});

test("an HTML or inaccurate 200 response does not count as healthy", async () => {
  await assert.rejects(
    probeEndpoint(async () => new Response("<h1>OK</h1>", { status: 200 }), "https://example.com", "/api/health"),
  );
  await assert.rejects(
    probeEndpoint(async () => new Response(JSON.stringify({ ok: true, service: "stems-white-label", dependencies: { database: "unavailable" } }), { status: 200 }), "https://example.com", "/api/ready"),
  );
});

test("temporary cold-start failures retry before being considered down", async () => {
  let count = 0;
  const result = await probeDeployment(
    "https://stems-white-label-preview.onrender.com",
    async (url) => ++count === 1 ? new Response("retry", { status: 503 }) : good(url),
    { attempts: 3, delayMs: 0, sleep: async () => {} },
  );
  assert.equal(result.attempts, 2);
});

test("rejects insecure or credential-bearing monitoring destinations", async () => {
  await assert.rejects(probeDeployment("http://example.com", async () => good(new URL("https://example.com"))));
  await assert.rejects(probeDeployment("https://user:pass@example.com", async () => good(new URL("https://example.com"))));
});
