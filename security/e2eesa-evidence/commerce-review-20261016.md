# Commerce source and threat review — October 16, 2026

Scope: provider-neutral merchant checkout, hosted form tokens, payment/refund
ledger, recurring subscriptions and finance-origin boundaries in PR #35. Main
source implementation is commit `5aa935c3c67b420253ab14d3c791e1a92d9cf653`;
HTTP test transport and deployment assets were added at
`322e08912dcb024627588e27d7a246db0b273733`. Subsequent fee arithmetic/expiry
regressions require their own final-head CI result. This is an AI-assisted source
review and automated-test record, not an independent expert audit or certification.

## Boundaries reviewed

- Public quotes bind server-owned published license versions and exact prices.
  Browser input cannot supply authoritative paid amounts or delivered assets.
- Card data stays in the provider-hosted form. Server credentials remain runtime
  secrets. Hosted tokens are authenticated with AES-256-GCM and tenant-bound AAD,
  expire after fourteen minutes and are cleared after completion/cleanup.
- Raw provider notifications are capped at 64 KiB and HMAC-SHA512 verified using
  the configured merchant key before parsing. Authoritative transaction/status
  lookups authenticate with that merchant's independent credentials.
- Tenant, merchant alias, invoice reference, exact captured amount/currency,
  payment ID and original buyer bind fulfillment. Account-scoped identifiers
  prevent unrelated merchants' overlapping transaction/refund IDs from colliding.
- PostgreSQL event locks and order row locks prevent parallel callback/refund
  races. Event receipts and fulfillment effects are one transaction; rejected
  events do not leave a successful receipt. Replayed payload IDs cannot mutate
  their meaning. Partial/full refunds and late failed/capture callbacks preserve
  revoked or refunded states.
- Cookie-authorized finance mutations require an exact tenant-host Origin.
  Host resolution and permission checks also protect hosted billing/profile forms.
- Recurring schedules alone cannot activate paid access. Trials/paid periods
  expire; verified captures extend a specific calendar period. Uncertain provider
  provisioning calls retain a claim rather than creating duplicate schedules.
- Hosted form action URLs are restricted to the official provider origins and
  paths. Forms use nonce-restricted scripts, no-store, no-referrer and frame denial.
  Provider error text is not echoed into customer-facing errors.

## Concrete findings corrected

1. Original payment callbacks could fulfill without comparing settled amount or
   currency. The new reconciliation path requires exact immutable order amounts.
2. Concurrent refunds could observe the same balance. Row locking now serializes
   refunds and capture/failure changes for each order.
3. Late failed callbacks could regress a partially refunded order. Settled,
   refunded and canceled orders are protected from failed-state regression.
4. Provider transaction/refund IDs were globally unique despite independent
   merchants. Composite identifiers now include merchant identity.
5. Event processing and receipt insertion were separate commits. They now commit
   together, with exact-payload replay checks and per-event serialization.
6. Customer/payment IDs on duplicate paid events could be changed. Exact buyer
   and transaction binding now rejects reassignment attempts.
7. Implicit provider onboarding/capability claims could enable unsupported split
   fees. Direct merchant settlement is explicit and unsupported fees pause checkout.

## Evidence and limits

Unit tests, populated historical-migration preservation and TypeScript/build checks
passed locally. GitHub run 38940373251 passed the real PostgreSQL, media/package,
concurrent callback/refund and all existing integration suites. That run's HTTP
sibling-host assertion failed and was not accepted as security evidence. Its test
transport was replaced with raw HTTP; run 38940814094 then passed the complete
built-server role, tenant, origin and callback suite.
Container build/runtime tests were added to CI, and passed in run 38940814094.

No actual Authorize.net sandbox credentials, real payment/refund, ARB schedule or
bank settlement were exercised. A mock provider is not real gateway acceptance.
Split settlement/payout initiation and application invoice history remain absent.
No claim is made about end-to-end encryption of all original media or customer
metadata, complete protected-flow inventory, all six upstream security gates,
production conformance, or independent human review. Those broader status fields
remain false. Independent human review is deferred follow-up, not a prerequisite
for continuing implementation, testing or an otherwise authorized test deployment.
