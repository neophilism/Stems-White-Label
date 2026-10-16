
import Link from "next/link";

import type { getTenantAnalyticsReport } from "@/lib/analytics-report";

type Report = Awaited<ReturnType<typeof getTenantAnalyticsReport>>;

function integer(value: number) {
  return value.toLocaleString();
}

function percent(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";
}

function money(cents: string, currency: string) {
  const amount = Number(cents) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return currency + " " + amount.toFixed(2);
  }
}

function completionRate(starts: number, completes: number) {
  return starts > 0 ? (completes / starts) * 100 : 0;
}

export function AnalyticsDashboard({
  report,
}: {
  report: Report;
}) {
  const maxDaily = Math.max(
    1,
    ...report.daily.map(
      (row) =>
        row.views +
        row.plays +
        row.reveals +
        row.stemInteractions +
        row.checkouts +
        row.purchases,
    ),
  );

  return (
    <div className="analytics-dashboard">
      <section className="analytics-kpis">
        <article>
          <span>Work views</span>
          <strong>{integer(report.totals.views)}</strong>
          <small>{integer(report.totals.uniqueSessions)} observed sessions</small>
        </article>
        <article>
          <span>Preview plays</span>
          <strong>{integer(report.totals.plays)}</strong>
          <small>Deliberate play actions</small>
        </article>
        <article>
          <span>Source interactions</span>
          <strong>{integer(report.totals.stemInteractions)}</strong>
          <small>Mute / unmute / solo / unsolo</small>
        </article>
        <article>
          <span>Reveal usage</span>
          <strong>{integer(report.totals.revealStarts)}</strong>
          <small>
            {percent(
              completionRate(
                report.totals.revealStarts,
                report.totals.revealCompletes,
              ),
            )} completion
          </small>
        </article>
        <article>
          <span>Checkout starts</span>
          <strong>{integer(report.totals.checkoutStarts)}</strong>
          <small>{integer(report.totals.convertedCheckouts)} converted</small>
        </article>
        <article>
          <span>Checkout conversion</span>
          <strong>{percent(report.totals.conversionRate)}</strong>
          <small>Checkout-start cohort</small>
        </article>
      </section>

      <section className="cms-panel analytics-revenue">
        <div className="cms-panel__heading">
          <p className="eyebrow">Revenue</p>
          <h2>Paid orders and refunds</h2>
          <p>
            Revenue is calculated from authoritative Payment and Refund records,
            not browser events. Net shown here is after customer refunds and
            before payment provider processing fees or Connect settlement adjustments.
          </p>
        </div>

        {report.revenue.length ? (
          <div className="analytics-revenue__grid">
            {report.revenue.map((row) => (
              <article key={row.currency}>
                <p className="eyebrow">{row.currency}</p>
                <strong>{money(row.netCents, row.currency)}</strong>
                <dl>
                  <dt>Gross</dt>
                  <dd>{money(row.grossCents, row.currency)}</dd>
                  <dt>Refunded</dt>
                  <dd>{money(row.refundedCents, row.currency)}</dd>
                  <dt>Paid orders</dt>
                  <dd>{integer(row.paidOrders)}</dd>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No paid orders in this period.</p>
        )}
      </section>

      <section className="cms-panel analytics-activity">
        <div className="cms-panel__heading">
          <p className="eyebrow">Activity over time</p>
          <h2>Daily storefront behavior</h2>
          <p>
            UTC daily buckets. The strip combines views, plays, Reveal starts,
            source-group interactions, Checkout starts, and purchases.
          </p>
        </div>

        {report.daily.length ? (
          <>
            <div className="analytics-activity__legend">
              <span>Views</span>
              <span>Plays</span>
              <span>Reveal</span>
              <span>Sources</span>
              <span>Checkout</span>
              <span>Purchase</span>
            </div>
            <div className="analytics-activity__scroll">
              <div
                className="analytics-activity__bars"
                style={{
                  minWidth: Math.max(620, report.period.days * 10) + "px",
                }}
              >
                {report.daily.map((row) => {
                  const total =
                    row.views +
                    row.plays +
                    row.reveals +
                    row.stemInteractions +
                    row.checkouts +
                    row.purchases;
                  const height = Math.max(2, (total / maxDaily) * 100);
                  return (
                    <div
                      className="analytics-day"
                      key={row.date}
                      title={
                        row.date +
                        " · " +
                        row.views +
                        " views · " +
                        row.plays +
                        " plays · " +
                        row.checkouts +
                        " checkouts · " +
                        row.purchases +
                        " purchases"
                      }
                    >
                      <span
                        className="analytics-day__bar"
                        style={{ height: height + "%" }}
                      />
                      <small>{row.date.slice(5)}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="cms-empty">No observed storefront activity in this period.</p>
        )}
      </section>

      <div className="analytics-columns">
        <section className="cms-panel">
          <div className="cms-panel__heading">
            <p className="eyebrow">Top Works</p>
            <h2>What people enter and explore</h2>
          </div>

          {report.topWorks.length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Work</th>
                    <th>Views</th>
                    <th>Sessions</th>
                    <th>Plays</th>
                    <th>Reveal</th>
                    <th>Source actions</th>
                    <th>Paid units</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topWorks.map((work) => (
                    <tr key={work.workId}>
                      <td>{work.title}</td>
                      <td>{integer(work.views)}</td>
                      <td>{integer(work.uniqueViewSessions)}</td>
                      <td>{integer(work.plays)}</td>
                      <td>{integer(work.reveals)}</td>
                      <td>{integer(work.stemInteractions)}</td>
                      <td>{integer(work.paidUnits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cms-empty">No Work engagement in this period.</p>
          )}
        </section>

        <section className="cms-panel">
          <div className="cms-panel__heading">
            <p className="eyebrow">Top source groups</p>
            <h2>What listeners manipulate</h2>
          </div>

          {report.topSourceGroups.length ? (
            <ol className="analytics-groups">
              {report.topSourceGroups.map((group) => (
                <li key={group.stemGroupId}>
                  <div>
                    <strong>{group.label}</strong>
                    <span>{group.workTitle}</span>
                  </div>
                  <dl>
                    <dt>Actions</dt><dd>{integer(group.interactions)}</dd>
                    <dt>Mute</dt><dd>{integer(group.muteChanges)}</dd>
                    <dt>Solo</dt><dd>{integer(group.soloChanges)}</dd>
                  </dl>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cms-empty">No source-group interactions in this period.</p>
          )}
        </section>
      </div>

      <p className="analytics-privacy-note">
        First-party analytics only. No IP address, browser fingerprint, user
        agent, email address, or third-party tracking identifier is stored by the
        analytics event pipeline.
      </p>
    </div>
  );
}
