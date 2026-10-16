> October 16 commerce checkpoint and remaining gaps: [CURRENT_STATUS.md](CURRENT_STATUS.md), [COMMERCE-GATEWAYS.md](COMMERCE-GATEWAYS.md). Issue #28 remains open pending actual provider and requested settlement acceptance.

> **Canonical PR roadmap and Engine Room tracking:** [`registry/roadmap.json`](../registry/roadmap.json). This original detailed plan is preserved; new PR mappings and planned-work totals belong in the canonical file.

# Stems White Label — recovered original 20-PR plan + approved 30-PR expansion

**Source:** October 7–10 original development conversations, verified GitHub PR #1–20 titles/bodies and [approved roadmap](APPROVED-ROADMAP.md). The first 20 source PRs and the amended 21–30 scope are preserved separately. Current GitHub PR **numbers** must not be treated as matching milestone IDs after #23: for example actual PR #27 is roadmap-accounting documentation, **not** the originally planned flagship-catalog milestone SWL-27. Only evidence-linked merged work counts.

## Product contract

A highly polished, luxurious multi-tenant music storefront for artists/labels to present Works and synchronized **grouped stems**, document musical construction, and offer exact versioned licenses and secured original-file delivery. **Unsealed Records is the flagship tenant**, not the only supported label. Tenant-specific themes, domain verification, creator roles, SaaS billing, commerce and analytics must be independently scoped and secured.

**User-approved public audition change:** the public multitrack player is synchronized playback with per-stem mute/unmute and no mixing console, solo/master-volume/reveal controls or audio tagging. Earlier PR #5 and PR #6 implemented broader interaction but the later PR #21 deliberately removed public controls. Do not restore them because they appear in the original roadmap. Licensed usage must be governed by the purchased LicenseVersion; owning/listening to an audio file alone grants no commercial rights.

## Complete milestone delivery plan

### Original 20 PR foundation and product

#### SWL-01 — Platform foundation

- **Implement:** Next.js/Postgres/Prisma platform, identity, protected tenant admin, verified hostname scoping, Docker/CI/health and Unsealed as seed tenant.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-02 — Core music domain

- **Implement:** Work, source group, preview/master/stem assets, credits, ordered editorial metadata and customer-owned tenant models.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-03 — Luxury storefront design system

- **Implement:** Luxury, artist-forward visual design; responsive public pages and polished creator experience.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-04 — Bespoke work showcase

- **Implement:** Individual published Work pages, editorial sections, creator-defined stem groups and truthful technical/source provenance.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-05 — Synchronized multitrack stem player

- **Implement:** Original synchronized Web Audio engine used creator-defined groups and mixed playback controls; **superseded for the public surface by item 21's strict mute/unmute-only rule**. Retain synchronized clock, secure preview URLs and range-safe media.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-06 — Reveal the Record

- **Implement:** Original creator-defined timed 'Reveal the Record' sequence and captions, seek-aware reconstruction; not exposed as a public mixing control after item 21 unless user deliberately reverses the decision.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-07 — Asset storage and processing pipeline

- **Implement:** Private object storage, secure ingest, malware/type validation, safe encoding/derivatives, durable workers and only public PREVIEW URLs.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-08 — Creator catalog CMS

- **Implement:** Protected creator Work, group and assets CMS, ordered credits, upload, editorial material and published state.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-09 — Versioned licensing engine

- **Implement:** Immutable LicenseVersion with explicit WORK/ALL_STEMS/SELECTED_STEMS scope, prices, rights, attribution, seats and projects.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-10 — Checkout and orders

- **Implement:** Server-sourced payment provider checkout, immutable legal/price snapshots, signed webhook fulfillment, idempotent purchase grants, refund handling.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-11 — Secure delivery and customer library

- **Implement:** Signed private source delivery only for authenticated purchasers/entitlements, revoked on full refund; customer library and exact accepted license.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-12 — Collections and catalog navigation

- **Implement:** Tenant catalog, collections and search/navigation with business/editorial presentation.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-13 — White-label theme engine

- **Implement:** Safe customizable white-label palettes/type/layout and independent tenant branding.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-14 — Custom domains

- **Implement:** Tenant DNS TXT ownership proof, exact routing target, actual TLS certificate validation, no unverified host routing.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-15 — Merchant payments tenant commerce

- **Implement:** Tenant Merchant payments account onboarding, separate payouts, explicit platform fee bps, settlement and readiness checks.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-16 — SaaS billing, trials and usage limits

- **Implement:** Separate SaaS billing from merchant commerce, plan entitlements, grandfathering, quotas, upgrades/cancellations and signed subscriptions.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-17 — Tenant analytics

- **Implement:** Tenant-only analytics, storefront outcomes, license type, creator income and admin insight with source provenance.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-18 — Platform super admin

- **Implement:** Global platform privileges, safe tenant operations and audit logs; no unauthorized access to artist archives.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-19 — Team accounts

- **Implement:** Scoped label team accounts, invitations, roles and permissions.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-20 — Presentation and SaaS demo mode

- **Implement:** Clearly synthetic presentation/demo tenant, theme samples, product tour, illustrative price tiers and deployment-safe separation.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

### Approved additional 10 delivery and launch gates

#### SWL-21 — Synchronized mute-only public stem player

- **Implement:** **Approved public audition rule**: single synchronized transport, per-group mute/unmute only; REMOVE public solo/mix/full-mix switching, master volume and Reveal controls. Do not falsely attach licenses to preview listening. Public commercial-use rights require applicable paid permission.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-22 — Production database readiness and deployment runbook

- **Implement:** Safe DB migrations, liveness separate from PostgreSQL readiness, Render/Neon prestart and production rollback/restore runbook.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-23 — Engine Room roadmap and live readiness monitoring

- **Implement:** Versioned original 30-PR manifest and recurring live smoke checks that inspect both process and DB; Engine Room source mapping must use actual merged work units.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-24 — Security and operations controls

- **Implement:** High-risk routes/payment webhooks, session policy, tenant auth, SSRF and host security, privacy, protected asset paths, key handling and bounded logs.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-25 — Deployment and worker observability

- **Implement:** Real deploy events, workers/queue health, latency and failure alerts, admin incident response and Engine Room source freshness.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-26 — merchant commerce and end-to-end license verification

- **Implement:** Verify real payment provider test checkout, funds flow, signed webhook, paid rights terms, fulfillment, customer library, entitlement revocation and refund paths.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-27 — Real Unsealed Records flagship catalog and creator onboarding

- **Implement:** Import actual authorized Unsealed Records music, correct artist/label relationships, approved previews, valid license terms and staff onboarding.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-28 — Multi-tenant integration, accessibility and regression acceptance

- **Implement:** Regression across two tenants, branding/domains/auth, mixed media, mobile/keyboard/accessibility, browser auth, performance and integration.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-29 — Provider cutover, private audio, durable workers and backups

- **Implement:** Provision verified private media origin, durable workers, backups/restore, domains/certificate readiness and provider cutover; run migration audits.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

#### SWL-30 — Final real customer release and paid-license download acceptance

- **Implement:** Demonstrate production-approved paid transaction, invoice/license, actual private file download, rollback evidence, monitoring and user-facing launch acceptance.
- **Acceptance:** Unit/DB integration tests on tenant-scoped state and negative authorization; complete underlying route/API/media/payment provider workflow with idempotency, failure/refund behavior and source provenance; UI tests for keyboard, responsive design and protected/private media where applicable. **Environment-specific gates cannot be claimed from local tests**.

## Current GitHub PR mapping guardrails

- Historical original GitHub PR #1–20 correspond to the first 20 delivery stages; verify each merged commit and associated CI before treating complete. PR #21 is the required player simplification; #22 and #23 cover runbook and Engine Room readiness.
- Actual later GitHub PR #24 (trusted platform hostname), #25 (safe migrations/flagship bootstrap), and #26 (checkout redirects/security headers) are **implementation patches**, not a confirmation that full SWL-24/25/26 work packages are complete. Check their current open/merged state before continuing.
- Actual GitHub PR #27 is a **roadmap mapping change**, not flagship SWL-27. The checked-in approved manifest had explicit completion evidence for only 23 of 30 original slots; unassigned slots must stay incomplete until actually delivered and verified.
- Any PR number may service multiple approved roadmap IDs; keep canonical `SWL-XX → GitHub PR/commit + CI/deploy evidence` mapping and notify Engine Room through documented integration.

## Existing source documents and critical procedures

Read [APPROVED-ROADMAP.md](APPROVED-ROADMAP.md), [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md), `.exechub/project.yml`, README, Prisma migrations and environment template. Production values/keys live only in Render/Neon/payment provider; never commit them. The managed Render platform-host bypass must be exact allowlisted and **must never** undermine verification of customer custom domains. Unknown hosts fail closed.

## Separate tests for merchant versus SaaS money

Tenant Connect settlement and SaaS subscription billing have distinct merchant accounts/customers and ledgers. Server sets authoritative prices/licensing; only signed provider events finalize payment/access. Use end-to-end negative cases: changed license terms mid-checkout, duplicate webhook, full refund, revoked entitlement, wrong tenant, missing preview/object, stale subscription, non-HTTPS redirect, invalid host, delivery URL expiry, interrupted asset job. A seed tenant and a demo checkout are **not** evidence that Unsealed flagship payments are ready.

## Production definition of complete

There is a real authorized flagship catalog, tenant-admin access, valid HTTPS hostname resolution, verifiable media source provenance, private object-store original assets, real preview-only playback, an accepted legal LicenseVersion, signed payment provider webhook purchase, safe customer library download, production alerting, restore tests, accessibility acceptance and monitored Render/Neon health. Show per-gate actual evidence; never label the production deployment complete merely because a preview route renders.

## Handoff for another account

1. Verify current GitHub PR statuses/merges and CI; current staged branches may conflict with these documented changes.
2. Work in evidence-dependent stages, default to autonomous routine implementation, and merge only green tests with security checks. Request user attention only for provider credentials or substantive product/rights decisions.
3. Register every approved milestone's tested outcome with Engine Room and retain original/added scope colors. Separate merged development work, preview availability and commercial production acceptance.

## Recovery status

All 30 approved ordered milestone names/scopes have been recovered from the original 20-PR history and current approved plan. The exact wording of some later acceptance tests is synthesized from checked-in repo/PR specifications.
