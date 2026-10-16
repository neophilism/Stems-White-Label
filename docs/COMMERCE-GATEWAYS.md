# Merchant payments and subscriptions

This branch replaces the previous processor SDK, endpoints and active schema
names with a provider interface and an Authorize.net hosted-form adapter. It
includes executable money-integrity and migration tests. This document is not
evidence that a merchant account or a real sandbox transaction was tested.

## Supported fund flow

Each tenant uses its own underwritten merchant account. Hosted payments settle
directly to that merchant through its acquirer. The application records exact
order amounts, refunds, legal grants and configured fees. The included adapter
does not expose marketplace split settlement or a bank-payout API. Nonzero
platform fees therefore disable checkout. Do not relabel a ledger entry as an
actual payout. A split-capable provider and its settlement tests remain necessary
for marketplace revenue sharing with automatic fees.

SaaS billing is independent: a separate merchant configuration collects platform
subscription revenue. Hosted profile forms hold payment methods at the provider.
ARB creates recurring schedules; an active schedule alone does not grant paid
access. A verified capture enables the corresponding subscription period.

## Server-only configuration

Generate `PAYMENT_TOKEN_KEY` with `openssl rand -hex 32`. Keep it in the hosting
secret store. AES-256-GCM encrypts hosted form tokens with tenant-bound additional
authenticated data. Rotating this key invalidates outstanding hosted forms; retain
reference rows for delayed reconciliation. Expired tokens can be removed with
`npm run commerce:expire-tokens`.

`COMMERCE_MERCHANTS_JSON` is keyed by the actual database tenant ID:

```json
{
  "TENANT_ID": {
    "accountId": "unique-stable-merchant-alias",
    "apiLoginId": "SET_IN_SECRET_STORE",
    "transactionKey": "SET_IN_SECRET_STORE",
    "signatureKey": "128_HEXADECIMAL_CHARACTERS_FROM_PROVIDER",
    "currency": "USD",
    "mode": "sandbox",
    "underwritingApproved": false,
    "dashboardUrl": "https://sandbox.authorize.net/",
    "onboardingUrl": "https://www.authorize.net/sign-up.html"
  }
}
```

The account alias must be unique across tenants. It must continue to identify
the same real provider account and environment; do not reuse it for a different
merchant or switch a sandbox alias to live credentials. The account currency is
a trusted operator setting because the reporting response does not reliably
supply it. Set it to the actual currency of the acquirer account.

`SAAS_BILLING_MERCHANT_JSON` is one object with the same fields, using a separate
platform billing account alias. Never use client-prefixed environment variables.
Live mode requires both `underwritingApproved: true` and
`LIVE_COMMERCE_ENABLED=true`. Default activation is false.

After configuring merchant credentials, the owner uses **Refresh merchant
status** in `/admin/commerce`. This authenticates the configured API credentials
and links the merchant to the tenant. It does not independently verify underwriting
or prove an actual payment or bank payout. Underwriting approval remains an
operator attestation backed by the acquirer agreement.

## Plan catalog

Set `SAAS_BILLING_PRICE_IDS` to the comma-separated allowed local plan IDs.
`SAAS_BILLING_PLANS_JSON` contains the corresponding plan objects:

```json
[{
  "priceId": "studio-monthly", "productId": "studio", "key": "studio",
  "name": "Studio", "description": "Example only; select your actual pricing.",
  "currency": "USD", "unitAmountCents": 2900, "interval": "month",
  "intervalCount": 1, "trialDays": 14, "maxWorks": 100,
  "maxStorageBytes": "107374182400", "maxCustomDomains": 1,
  "maxMembers": 5, "allowCustomDomains": true, "allowWhiteLabel": true,
  "features": ["Custom branding"]
}]
```

`null` means unlimited for quota fields. Storage is an integer byte string.
Recurring intervals must fit ARB: days 7–365 or months 1–12. A year maps to 12
months. Trials delay the first scheduled charge. Access expires at the stored
trial/paid period end if payment has not been confirmed. Saving a hosted payment
method returns to billing; authenticated **Refresh subscription status** finishes
subscription creation. Hosted profile management changes payment methods;
cancellation is a separate explicit application action. Plan changes currently
require cancellation and a new subscription; the hosted profile portal does not
change plans or generate an application invoice archive.

Provisioning states prevent duplicate customer/schedule creation after timeouts.
If `provisioningState` remains `CREATING_CUSTOMER` or `CREATING_SUBSCRIPTION`,
check the provider dashboard for the existing operation before any retry. Record
the discovered customer/subscription identifiers and reconcile the local row in
a controlled database transaction. Never blindly reset the state to `IDLE` or
repeat a charge. There is no automatic retry of an uncertain provisioning call.

## Webhooks and reconciliation

Merchant endpoint, separately configured for each merchant:

`https://YOUR_HOST/api/payments/authorize-net/TENANT_ID/webhook`

Platform subscription endpoint:

`https://YOUR_HOST/api/payments/authorize-net/billing/webhook`

Subscribe to captured payments, refunds and voids on merchant accounts, and to
subscription state and payment notifications on the billing account. Signatures
use HMAC-SHA512 over exact request bytes with the binary decoded hex signature
key. Bodies are bounded to 64 KiB. A valid notification triggers a fresh
authenticated transaction/subscription lookup rather than trusting supplied price,
customer, tenant or status fields.

Event keys include provider, merchant alias, scope and notification ID. A changed
payload under a previously used ID is rejected. PostgreSQL advisory locks serialize
event receipt; per-order row locks serialize fulfillment and refunds. Event
receipts, order/license effects and token retirement commit together. Refund and
transaction IDs are merchant-scoped. A fully refunded order keeps its downloads
revoked even after a late captured-payment callback.

For a delayed/missing merchant notification, run the trusted operator command:

`npm run commerce:reconcile -- TENANT_ID PROVIDER_TRANSACTION_ID`

It fetches and verifies the provider transaction and runs the same ledger checks.
A failed reconciliation is not permission to edit paid amounts or grant files.
Refunds are initiated through the merchant provider dashboard; the verified
notification records them and revokes rights on full refund. There is currently
no application refund-initiation form or payout API.

## Migration and rollback

Back up and test restoration before applying the cutover migration. Old migration
files remain unchanged. The new migration renames columns/tables/enums in place,
retains existing payment/refund/customer/event identifiers and scopes refund IDs,
pauses existing provider subscriptions and disables legacy merchant checkout.
Existing completed purchases and legal records remain intact. Legacy subscriptions
must be reconciled and canceled with the former processor before starting a new
schedule, to prevent double billing.

The migration is not compatible with old web/worker code. Drain checkout, stop
old application processes, apply the migration once, then start the matching new
commit. To reverse a failed cutover, restore the validated backup and matching
previous code together. Do not roll old code onto the renamed schema or rewrite
old migration checksums.

## Acceptance and evidence

- `npm test`: money arithmetic, signatures, live activation, hosted form bounds,
  token tampering, provider failures, subscription dates, existing platform units.
- `npm run test:commerce-migration`: entire migration history plus legacy data
  preservation in an embedded PostgreSQL engine.
- `npm run test:payment-integration`: real PostgreSQL atomic callback replay,
  changed payload, wrong tenant/buyer/payment, parallel over-refund rejection,
  late capture and failure, and cross-merchant transaction ID isolation.
- `npm run test:commerce-integration`: merchant readiness, identity isolation,
  fee calculation and rejection of unsupported split-settlement fees.
- `npm run test:http-security` after build: real HTTP server checks anonymous and
  viewer access, owner access, sibling-tenant isolation, origin protection,
  expired/unknown checkout references, removed endpoints and invalid notifications.
- All pre-existing domain, queue, licensing, delivery, media and billing integration
  suites remain required. Tests with a mocked provider do not prove real gateway
  acceptance. Before live activation, use genuine provider sandbox credentials to
  complete hosted checkout, signed capture, exact licensed download, refund,
  revocation, trial/recurring billing and merchant bank-settlement acceptance.

Primary protocol references consulted October 16, 2026:

https://developer.authorize.net/api/reference/features/accept-hosted.html
https://developer.authorize.net/api/reference/features/webhooks.html
https://developer.authorize.net/api/reference/features/customer-profiles.html
https://developer.authorize.net/api/reference/features/recurring-billing.html
https://developer.authorize.net/api/reference/index.html
