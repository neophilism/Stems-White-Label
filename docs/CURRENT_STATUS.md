# STEMS implementation checkpoint — October 16, 2026

Branch: `feat/commerce-gateway-20261016`, based on PR #34's tested head.
This checkpoint is development code, not a deployed or commercially accepted release.

## Delivered on this branch

- Provider interface and Authorize.net hosted checkout/profile/recurring adapter.
- Active provider SDK and legacy webhook endpoints removed; neutral schema fields
  and an in-place migration preserve existing commercial records.
- Exact captured amount/currency and buyer/payment integrity; merchant-scoped
  transaction/refund IDs; order row locks and atomic webhook/ledger commits.
- Encrypted, short-lived hosted tokens; production activation requires configured
  merchant credentials and underwriting attestation. Unsupported platform split
  fees disable checkout rather than misrepresenting settlement.
- Subscription schedule provisioning guards, verified-payment activation,
  trial/paid period expiry, explicit cancellation and hosted payment-method updates.
- Dependency lockfile, migration preservation, expanded integration and built-server
  security tests; current setup and recovery procedures in COMMERCE-GATEWAYS.md.

## Verified locally

117 unit tests passed. TypeScript verification passed. The production build passed
before the latest security test additions; final CI is required on the published
head. Full migration history plus populated legacy payment/refund/customer/event
preservation passed in an embedded PostgreSQL engine. Full PostgreSQL and built
HTTP tests are defined for CI; their result must be recorded after execution.

## Remote state and remaining work

PR #34 has a successful complete GitHub CI run:
https://github.com/neophilism/Stems-White-Label/actions/runs/38919821943
It remains open. Automatic approval review rejected the attempted merge as
insufficiently specifically authorized, despite standing autonomous-development
instructions. No alternative path has been used to merge it.

The existing free Render preview tracks main and is separate from this branch:
https://stems-white-label-preview.onrender.com
No claim is made that the new branch is deployed there.

Issue #28 remains open until real provider sandbox acceptance and all requested
commercial fund flows are verified. The included direct-merchant adapter does not
provide automatic marketplace split fees, provider-initiated bank payouts,
in-app invoice archives or seamless subscription plan changes. Preserve those
requirements in the remaining roadmap; do not mark the entire platform complete.

Remaining deployment work: separate audio/package workers with FFmpeg, real private
object storage and catalog provenance, isolated database/backup restore tests,
provider credentials/underwriting and actual end-to-end paid-license acceptance.
Independent human security review is deferred follow-up, not a development gate.
