import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const suffix = Date.now().toString(36);
const tenantIds = [], userIds = [];
let server;
try {
  const tenant = await db.tenant.create({ data: { name: 'HTTP security', slug: 'http-security-' + suffix } }); tenantIds.push(tenant.id);
  const other = await db.tenant.create({ data: { name: 'HTTP isolation', slug: 'http-isolation-' + suffix } }); tenantIds.push(other.id);
  const host = 'http-security-' + suffix + '.example.test';
  const otherHost = 'http-isolation-' + suffix + '.example.test';
  await db.tenantDomain.createMany({ data: [{ tenantId: tenant.id, hostname: host }, { tenantId: other.id, hostname: otherHost }].map(d => ({ ...d, ownershipStatus: 'VERIFIED', routingStatus: 'READY', tlsStatus: 'READY' })) });
  const owner = await db.user.create({ data: { email: 'owner-' + suffix + '@example.test', memberships: { create: { tenantId: tenant.id, role: 'OWNER' } } } }); userIds.push(owner.id);
  const viewer = await db.user.create({ data: { email: 'viewer-' + suffix + '@example.test', memberships: { create: { tenantId: tenant.id, role: 'VIEWER' } } } }); userIds.push(viewer.id);
  const ownerToken = randomBytes(32).toString('hex'), viewerToken = randomBytes(32).toString('hex');
  await db.session.createMany({ data: [{ userId: owner.id, sessionToken: ownerToken }, { userId: viewer.id, sessionToken: viewerToken }].map(s => ({ ...s, expires: new Date(Date.now() + 60000) })) });
  const base = 'http://127.0.0.1:3199';
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3199'], {
    env: { ...process.env, NEXTAUTH_URL: base, NEXTAUTH_SECRET: 'http-security-ci-only', DEFAULT_TENANT_SLUG: tenant.slug, DEMO_MODE: 'false' }, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let output = ''; server.stderr.on('data', d => { output = (output + d).slice(-4000); });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('HTTP server exited: ' + output);
    if (await fetch(base + '/api/health').then(r => r.ok, () => false)) break;
    await new Promise(r => setTimeout(r, 200));
  }
  // Use the raw HTTP client: fetch implementations can normalize a supplied Host.
  // Tenant-isolation tests must send the intended host header on the wire.
  const call = (path, token, customHost = host, extra = {}) => new Promise((resolve, reject) => {
    const request = httpRequest(base + path, { method: extra.method || 'GET', headers: {
      Host: customHost, ...(token ? { Cookie: 'next-auth.session-token=' + token + '; __Secure-next-auth.session-token=' + token } : {}), ...extra.headers,
    } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, text: async () => Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject); request.end(extra.body);
  });
  assert.equal((await call('/api/admin/commerce')).status, 401);
  assert.equal((await call('/api/admin/commerce', viewerToken)).status, 401);
  const ownerResponse = await call('/api/admin/commerce', ownerToken);
  assert.equal(ownerResponse.status, 200);
  assert.doesNotMatch(await ownerResponse.text(), /transactionKey|signatureKey|apiLoginId/);
  assert.equal((await call('/api/admin/commerce', ownerToken, otherHost)).status, 401);
  assert.equal((await call('/api/admin/billing', ownerToken, otherHost)).status, 401);
  for (const endpoint of ['/api/admin/commerce', '/api/admin/billing']) {
    const response = await call(endpoint, ownerToken, host, { method: 'POST', headers: { origin: 'https://' + otherHost, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync' }) });
    assert.equal(response.status, 403);
  }
  assert.equal((await call('/checkout/pay/' + 'ab'.repeat(32), ownerToken)).status, 410);
  assert.equal((await call('/api/checkout/order?session_id=unknown', ownerToken, 'unowned.example.test')).status, 404);
  assert.equal((await call('/api/stripe/webhook', null, host, { method: 'POST', body: '{}' })).status, 404);
  assert.equal((await call('/api/payments/authorize-net/' + tenant.id + '/webhook', null, host, { method: 'POST', body: '{}' })).status, 400);
  assert.equal((await call('/api/payments/authorize-net/billing/webhook', null, host, { method: 'POST', body: '{}' })).status, 400);
  console.log('Built-server anonymous, role, tenant, cross-origin finance, checkout and webhook negative tests passed.');
} finally {
  if (server) { server.kill('SIGTERM'); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); }
  await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
}
