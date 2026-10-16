# Production deployment and Engine Room integration

This is a deployment **runbook**, not evidence of an active production deployment.
Never commit live credentials or allow demo catalog material to become production data.

## Components

Deploy **three processes from the same commit** with Node.js 22, a private
PostgreSQL instance, and an S3-compatible **private** object bucket:

1. **Web**: `npm install && npm run build`, followed by
   `npm run db:deploy && npm run start` (ensure only one deploy/migration actor).
2. **Asset worker**: `npm install && npm run worker:assets` with FFmpeg and
   ffprobe binaries installed and available on PATH.
3. **Package worker**: `npm install && npm run worker:packages`.
   Container filesystem is ephemeral; workers must use private object storage.

All three processes share `DATABASE_URL` and object-storage configuration.
Separate the workers from the HTTP instance to prevent audio processing from
starving requests. For production builds, favor a pinned Node release and
committed package lock. Do not enable paid services without explicit approval.

## Configuration and cutover

* Provision database and object storage, configure `.env.example` values as
  **private service environment variables**, never in a client bundle.
* On the platform-owned Render hostname only, set `PLATFORM_DEFAULT_HOSTNAME=stems-white-label-preview.onrender.com` and `DEFAULT_TENANT_SLUG=unsealed-records` as server environment variables. Without this exact host setting, the shared preview hostname cannot resolve a tenant when `TenantDomain` has no verified domain rows. This narrow fallback is intentionally separate from customer custom domain verification. Do not configure unowned hostnames or wildcard values here.
* Configure NextAuth GitHub OAuth, production `NEXTAUTH_URL` and
  `NEXTAUTH_SECRET`, customer SMTP, private upload bucket CORS, payment provider
  merchant and subscription webhook endpoints with account-specific signing keys.
  Follow [COMMERCE-GATEWAYS.md](COMMERCE-GATEWAYS.md); obsolete provider environment variables are no longer used.
* Configure custom-domain routing targets, verify domain ownership, route and
  HTTPS readiness through tenant administration. DNS/certificate provisioning
  remains a hosting-provider task.
* Apply all Prisma migrations once with `npm run db:deploy`. Seed the intended
  tenant only after reviewing tenant/user memberships. Keep `DEMO_MODE=false`
  on customer-facing production domains unless explicitly demonstrating.
* Before enabling live commerce, validate seller onboarding, tax/refund and
  subscription posture, signed webhook processing, real download entitlements,
  order/license immutability, and a refund/revocation dry run.
* Smoke-test uploads, previews, a synchronized multistem audition, license
  acceptance, completed payment, customer library and timed download.
* Configure daily offsite database backups, periodic restore exercises,
  object-storage retention, and webhook reconciliation alerting.

## Probes

* `GET /api/health`: process liveness, HTTP 200 (not a dependency check).
* `HEAD /api/health`: lightweight liveness.
* `GET /api/ready`: database readiness; HTTP 200 when available, HTTP 503
  when unavailable or a check exceeds three seconds. The response is
  deliberately non-sensitive and bypasses caching.
* Monitor the above from Engine Room with service, environment and URL fields.
  Avoid recording headers, tokens, customer identity, or webhook payloads.

## Engine Room telemetry contract

Suggested non-secret periodic data fields: `service_id`, `environment`,
`commit_sha`, `deployment_state`, `last_probe_at`, `http_status`,
`latency_ms`, `worker_role`, `queue_pending`, `queue_failed`,
`last_job_completed_at`, `last_ci_conclusion`.

Publish from **trusted server-side** monitoring; do not put GitHub or hosting
credentials into a storefront endpoint. Engine Room should poll the real
deployment and GitHub APIs, not treat a static `ok` response as proof of
end-to-end checkout or worker health. Queue counters require authenticated
internal telemetry or read-only DB access with appropriately scoped credentials.

## Rollback

Retain previous healthy image/commit, track migration compatibility, disable
checkout first if payment reconciliation is impaired, and roll back the web
service only when database changes are backward compatible. Do not reverse
irreversible schema/data migrations automatically.

## Prepared container and worker configuration

`Dockerfile` builds the web, asset and package-worker code at one commit with
FFmpeg/ffprobe and a non-root runtime user. It uses an init process so termination
signals reach workers and child audio processes. It includes the TypeScript
runtime and Prisma CLI because existing runtime scripts require them. No secrets
are accepted as build arguments. GitHub run 38940814094 built the container and verified the non-root Prisma
runtime and FFmpeg/ffprobe binaries. Runtime queue acceptance still requires an
appropriately configured environment.

The default container starts HTTP only, without automatic migrations. Apply the
coordinated commerce migration with a single migration actor before deploying
matching code. For the current native Node web service use `npm ci && npm run build`
and `npm start -- --hostname 0.0.0.0 --port $PORT`; its prestart migration/bootstrap
behavior remains unchanged. A real cutover must drain and stop the old app first.

`deploy/render-workers.yaml` is a review-only Blueprint for two separate workers,
not an already applied deployment. Render workers require a paid plan; no new paid
resource was created. Before applying, supply the approved `stems-private-media`
environment group with `DATABASE_URL`, `OBJECT_STORAGE_BUCKET`,
`OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_ACCESS_KEY_ID`,
`OBJECT_STORAGE_SECRET_ACCESS_KEY` and `OBJECT_STORAGE_FORCE_PATH_STYLE` matching
the intended isolated test environment. Do not include web authentication,
merchant or billing credentials in this worker group. Review and approve worker
cost before provisioning; then build both workers from the exact accepted web
commit, run the existing real media/package integration suites and verify queue
claims, recovery and graceful shutdown in that environment.
