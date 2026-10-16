import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformTenantControls } from "@/components/admin/platform-tenant-controls";
import { requirePlatformSuperAdmin } from "@/lib/platform-access";
import { getPlatformTenantDetail } from "@/lib/platform-admin";

function bytes(value: bigint) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let amount = Number(value);
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " " + units[index];
}

function date(value: Date | null | undefined) {
  return value ? value.toLocaleString() : "—";
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export default async function PlatformTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requirePlatformSuperAdmin();
  const { tenantId } = await params;
  const detail = await getPlatformTenantDetail(tenantId);
  if (!detail) notFound();

  const tenant = detail.tenant;
  const subscription = tenant.subscription;
  const commerce = tenant.commerce;

  return (
    <main className="cms-shell platform-admin-shell">
      <Link className="text-link cms-back-link" href="/platform-admin">
        ← Platform overview
      </Link>

      <header className="platform-admin-header">
        <div>
          <p className="eyebrow">Tenant operations</p>
          <h1>{tenant.name}</h1>
          <p>
            {tenant.slug} · {tenant.status}
            {tenant.isSeed ? " · Seed tenant" : ""}
          </p>
        </div>
      </header>

      <section className="platform-kpis">
        <article>
          <span>Works</span>
          <strong>{detail.usage.works.toLocaleString()}</strong>
          <small>{subscription?.maxWorks == null ? "Unlimited plan limit" : "Limit " + subscription.maxWorks}</small>
        </article>
        <article>
          <span>Tracked storage</span>
          <strong>{bytes(detail.usage.storageBytes)}</strong>
          <small>
            {subscription?.maxStorageBytes == null
              ? "Unlimited plan limit"
              : "Limit " + bytes(subscription.maxStorageBytes)}
          </small>
        </article>
        <article>
          <span>Custom domains</span>
          <strong>{detail.usage.customDomains.toLocaleString()}</strong>
          <small>{subscription?.allowCustomDomains ? "Entitled" : "Not entitled"}</small>
        </article>
        <article>
          <span>Members</span>
          <strong>{detail.usage.members.toLocaleString()}</strong>
          <small>{subscription?.maxMembers == null ? "Unlimited plan limit" : "Limit " + subscription.maxMembers}</small>
        </article>
        <article>
          <span>Original delivery requests</span>
          <strong>{detail.deliveryRequests.direct.requests.toString()}</strong>
          <small>{bytes(detail.deliveryRequests.direct.bytes)} requested</small>
        </article>
        <article>
          <span>ZIP delivery requests</span>
          <strong>{detail.deliveryRequests.packages.requests.toString()}</strong>
          <small>{bytes(detail.deliveryRequests.packages.bytes)} requested</small>
        </article>
      </section>

      <div className="platform-overview-grid">
        <section className="cms-panel">
          <div className="cms-panel__heading">
            <p className="eyebrow">SaaS subscription</p>
            <h2>{subscription?.planName ?? "No subscription"}</h2>
          </div>
          <dl className="platform-metric-list">
            <dt>Status</dt><dd>{subscription?.status ?? "UNSUBSCRIBED"}</dd>
            <dt>Plan key</dt><dd>{subscription?.planKey ?? "—"}</dd>
            <dt>Price ID</dt><dd>{subscription?.providerPriceId ?? "—"}</dd>
            <dt>Period end</dt><dd>{date(subscription?.currentPeriodEnd)}</dd>
            <dt>Cancel at period end</dt><dd>{yesNo(subscription?.cancelAtPeriodEnd ?? false)}</dd>
            <dt>White-label entitlement</dt><dd>{yesNo(subscription?.allowWhiteLabel ?? false)}</dd>
          </dl>
        </section>

        <section className="cms-panel">
          <div className="cms-panel__heading">
            <p className="eyebrow">Merchant payments</p>
            <h2>{commerce?.providerAccountId ?? "Not connected"}</h2>
          </div>
          <dl className="platform-metric-list">
            <dt>Charges enabled</dt><dd>{yesNo(commerce?.chargesEnabled ?? false)}</dd>
            <dt>Payouts enabled</dt><dd>{yesNo(commerce?.payoutsEnabled ?? false)}</dd>
            <dt>Details submitted</dt><dd>{yesNo(commerce?.detailsSubmitted ?? false)}</dd>
            <dt>Disabled reason</dt><dd>{commerce?.disabledReason ?? "—"}</dd>
            <dt>Platform fee</dt><dd>{commerce ? (commerce.platformFeeBps / 100).toFixed(2) + "%" : "0.00%"}</dd>
            <dt>Last synced</dt><dd>{date(commerce?.lastSyncedAt)}</dd>
          </dl>
        </section>
      </div>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Domains</p>
          <h2>Routing and TLS state</h2>
        </div>
        {tenant.domains.length ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table platform-tenant-table">
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Primary</th>
                  <th>Ownership</th>
                  <th>Routing</th>
                  <th>TLS</th>
                  <th>Last checked</th>
                </tr>
              </thead>
              <tbody>
                {tenant.domains.map((domain) => (
                  <tr key={domain.id}>
                    <td>{domain.hostname}</td>
                    <td>{yesNo(domain.isPrimary)}</td>
                    <td>{domain.ownershipStatus}</td>
                    <td>{domain.routingStatus}</td>
                    <td>{domain.tlsStatus}</td>
                    <td>{date(domain.lastCheckedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cms-empty">No domains registered.</p>
        )}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Team</p>
          <h2>Tenant memberships</h2>
        </div>
        {tenant.memberships.length ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table platform-tenant-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {tenant.memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>{membership.user.name ?? "—"}</td>
                    <td>{membership.user.email ?? "—"}</td>
                    <td>{membership.role}</td>
                    <td>{membership.createdAt.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cms-empty">No tenant memberships.</p>
        )}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Payment posture</p>
          <h2>Lifecycle totals by currency</h2>
        </div>
        {detail.payments.length ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table platform-tenant-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Currency</th>
                  <th>Payments</th>
                  <th>Gross cents</th>
                  <th>Refunded cents</th>
                  <th>Platform-fee cents</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((row) => (
                  <tr key={row.status + ":" + row.currency}>
                    <td>{row.status}</td>
                    <td>{row.currency.toUpperCase()}</td>
                    <td>{row._count._all}</td>
                    <td>{row._sum.amountCents ?? 0}</td>
                    <td>{row._sum.refundedCents ?? 0}</td>
                    <td>{row._sum.platformFeeCents ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cms-empty">No customer payments recorded.</p>
        )}
      </section>

      <PlatformTenantControls
        tenantId={tenant.id}
        tenantStatus={tenant.status}
        platformFeeBps={commerce?.platformFeeBps ?? null}
        flags={tenant.featureFlags.map((flag) => ({
          key: flag.key,
          enabled: flag.enabled,
          note: flag.note,
        }))}
        failedProcessingJobs={tenant.processingJobs.map((job) => ({
          id: job.id,
          fileName: job.audioAsset.fileName,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          lastError: job.lastError,
        }))}
        failedPackages={tenant.downloadPackages.map((entry) => ({
          id: entry.id,
          fileName: entry.fileName,
          attempts: entry.attempts,
          maxAttempts: entry.maxAttempts,
          lastError: entry.lastError,
        }))}
      />

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Tenant audit history</p>
          <h2>Platform mutations</h2>
        </div>
        {tenant.platformAuditLogs.length ? (
          <div className="platform-audit-list">
            {tenant.platformAuditLogs.map((row) => (
              <article key={row.id}>
                <time>{row.createdAt.toLocaleString()}</time>
                <strong>{row.action}</strong>
                <span>{row.actorEmail ?? row.actorUserId ?? "System"}</span>
                {row.reason ? <p>{row.reason}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No platform mutations recorded for this tenant.</p>
        )}
      </section>
    </main>
  );
}
