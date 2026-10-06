"use client";

import { useEffect, useMemo, useState } from "react";

type Plan = {
  priceId: string;
  productId: string;
  key: string;
  name: string;
  description: string | null;
  currency: string;
  unitAmountCents: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  trialDays: number;
  maxWorks: number | null;
  maxStorageBytes: string | null;
  maxCustomDomains: number | null;
  maxMembers: number | null;
  allowCustomDomains: boolean;
  allowWhiteLabel: boolean;
  features: string[];
};

type Subscription = {
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  planKey: string | null;
  planName: string | null;
  currency: string | null;
  unitAmountCents: number | null;
  billingInterval: string | null;
  billingIntervalCount: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  pastDueGraceUntil: string | null;
  maxWorks: number | null;
  maxStorageBytes: string | null;
  maxCustomDomains: number | null;
  maxMembers: number | null;
  allowCustomDomains: boolean;
  allowWhiteLabel: boolean;
};

type BillingPayload = {
  billing: {
    subscription: Subscription;
    usage: {
      works: number;
      storageBytes: string;
      customDomains: number;
      members: number;
    };
    access: { allowed: boolean; reason: string | null };
  };
  plans: Plan[];
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function bytes(value: string | bigint) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let number = Number(amount);
  let index = 0;
  while (number >= 1024 && index < units.length - 1) {
    number /= 1024;
    index += 1;
  }
  return number.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " " + units[index];
}

function limitText(value: number | string | null, unit?: "bytes") {
  if (value == null) return "Unlimited";
  return unit === "bytes" ? bytes(String(value)) : Number(value).toLocaleString();
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function usagePercent(used: number | bigint, limit: number | bigint | null) {
  if (limit == null) return null;
  if (BigInt(limit) === 0n) return BigInt(used) > 0n ? 100 : 0;
  return Math.min(100, Number((BigInt(used) * 10000n) / BigInt(limit)) / 100);
}

export function BillingManager({
  checkoutResult,
}: {
  checkoutResult: "success" | "canceled" | null;
}) {
  const [payload, setPayload] = useState<BillingPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    checkoutResult === "canceled" ? "Subscription checkout was canceled." : null,
  );

  async function load() {
    const response = await fetch("/api/admin/billing", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load billing.");
    setPayload(data);
  }

  async function action(actionName: "subscribe" | "portal" | "sync", priceId?: string) {
    setBusy(actionName + (priceId ?? ""));
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, priceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update billing.");

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      await load();
      setMessage("Subscription status refreshed.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update billing.");
      setBusy(null);
    }
  }

  useEffect(() => {
    void load()
      .then(() => {
        if (checkoutResult === "success") void action("sync");
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load billing."),
      );
  }, []);

  const currentPriceId = payload?.billing.subscription.stripePriceId ?? null;
  const canUsePortal = Boolean(
    payload?.billing.subscription.stripeCustomerId &&
      payload?.billing.subscription.stripeSubscriptionId,
  );

  const usageRows = useMemo(() => {
    if (!payload) return [];
    const s = payload.billing.subscription;
    const u = payload.billing.usage;
    return [
      {
        label: "Works",
        used: u.works.toLocaleString(),
        limit: limitText(s.maxWorks),
        percent: usagePercent(u.works, s.maxWorks),
      },
      {
        label: "Storage",
        used: bytes(u.storageBytes),
        limit: limitText(s.maxStorageBytes, "bytes"),
        percent: usagePercent(BigInt(u.storageBytes), s.maxStorageBytes == null ? null : BigInt(s.maxStorageBytes)),
      },
      {
        label: "Custom domains",
        used: u.customDomains.toLocaleString(),
        limit: s.allowCustomDomains ? limitText(s.maxCustomDomains) : "Not included",
        percent: s.allowCustomDomains ? usagePercent(u.customDomains, s.maxCustomDomains) : 100,
      },
      {
        label: "Team members",
        used: u.members.toLocaleString(),
        limit: limitText(s.maxMembers),
        percent: usagePercent(u.members, s.maxMembers),
      },
    ];
  }, [payload]);

  if (!payload) return <p className="cms-loading">Loading SaaS billing…</p>;

  const subscription = payload.billing.subscription;

  return (
    <div className="billing-manager">
      <section className="cms-panel billing-current">
        <div className="billing-current__head">
          <div>
            <p className="eyebrow">Subscription</p>
            <h2>{subscription.planName ?? "No active plan"}</h2>
            <p>
              Status: <strong>{subscription.status.replaceAll("_", " ")}</strong>
              {subscription.cancelAtPeriodEnd ? " · Cancels at period end" : ""}
            </p>
          </div>
          <span className={"billing-access billing-access--" + (payload.billing.access.allowed ? "active" : "blocked")}>
            {payload.billing.access.allowed ? "Service active" : "Action required"}
          </span>
        </div>

        {!payload.billing.access.allowed && payload.billing.access.reason ? (
          <p className="commerce-warning">{payload.billing.access.reason}</p>
        ) : null}

        <dl className="billing-periods">
          <dt>Trial ends</dt><dd>{date(subscription.trialEnd)}</dd>
          <dt>Current period ends</dt><dd>{date(subscription.currentPeriodEnd)}</dd>
          <dt>Past-due grace ends</dt><dd>{date(subscription.pastDueGraceUntil)}</dd>
        </dl>

        <div className="billing-actions">
          {canUsePortal ? (
            <button
              className="cms-primary-button"
              disabled={busy !== null}
              onClick={() => void action("portal")}
              type="button"
            >
              {busy === "portal" ? "Opening…" : "Manage plan & billing"}
            </button>
          ) : null}
          {subscription.stripeSubscriptionId ? (
            <button
              className="cms-secondary-button"
              disabled={busy !== null}
              onClick={() => void action("sync")}
              type="button"
            >
              {busy === "sync" ? "Refreshing…" : "Refresh Stripe status"}
            </button>
          ) : null}
        </div>

        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Usage</p>
          <h2>Current plan consumption</h2>
          <p>
            Limits are snapshotted from the Stripe plan at subscription changes.
            Existing content remains available if a limit is later reduced; new
            resource creation is blocked until usage is back within the plan.
          </p>
        </div>

        <div className="billing-usage-grid">
          {usageRows.map((row) => (
            <article key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>{row.used} / {row.limit}</strong>
              </div>
              {row.percent == null ? (
                <div className="billing-meter billing-meter--unlimited" />
              ) : (
                <div className="billing-meter">
                  <span style={{ width: row.percent + "%" }} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Plans</p>
          <h2>Choose the operating envelope.</h2>
          <p>
            New subscriptions start through Stripe Checkout. Once subscribed,
            upgrades, downgrades, payment methods, invoices, and cancellation are
            managed through the Stripe Billing portal.
          </p>
        </div>

        {payload.plans.length ? (
          <div className="billing-plan-grid">
            {payload.plans.map((plan) => {
              const current = currentPriceId === plan.priceId;
              return (
                <article className={"billing-plan" + (current ? " billing-plan--current" : "")} key={plan.priceId}>
                  <p className="eyebrow">{plan.key}</p>
                  <h3>{plan.name}</h3>
                  {plan.description ? <p>{plan.description}</p> : null}
                  <strong className="billing-plan__price">
                    {money(plan.unitAmountCents, plan.currency)}
                    <span>
                      / {plan.intervalCount > 1 ? plan.intervalCount + " " : ""}
                      {plan.interval}
                    </span>
                  </strong>
                  {plan.trialDays > 0 ? (
                    <p className="billing-plan__trial">{plan.trialDays}-day trial</p>
                  ) : null}
                  <dl>
                    <dt>Works</dt><dd>{limitText(plan.maxWorks)}</dd>
                    <dt>Storage</dt><dd>{limitText(plan.maxStorageBytes, "bytes")}</dd>
                    <dt>Custom domains</dt><dd>{plan.allowCustomDomains ? limitText(plan.maxCustomDomains) : "Not included"}</dd>
                    <dt>Team members</dt><dd>{limitText(plan.maxMembers)}</dd>
                    <dt>White label</dt><dd>{plan.allowWhiteLabel ? "Included" : "Not included"}</dd>
                  </dl>
                  {plan.features.length ? (
                    <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  ) : null}

                  {current ? (
                    <span className="billing-plan__current">Current plan</span>
                  ) : canUsePortal ? (
                    <button
                      className="cms-secondary-button"
                      disabled={busy !== null}
                      onClick={() => void action("portal")}
                      type="button"
                    >
                      Change in billing portal
                    </button>
                  ) : (
                    <button
                      className="cms-primary-button"
                      disabled={busy !== null}
                      onClick={() => void action("subscribe", plan.priceId)}
                      type="button"
                    >
                      {busy === "subscribe" + plan.priceId ? "Opening…" : plan.trialDays > 0 ? "Start trial" : "Choose plan"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="cms-empty">
            No Stripe Billing Price IDs are configured for this environment.
          </p>
        )}
      </section>
    </div>
  );
}
