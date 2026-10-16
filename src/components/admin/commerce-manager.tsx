"use client";

import { useEffect, useState } from "react";

type Commerce = {
  providerAccountId: string | null;
  country: string | null;
  defaultCurrency: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDue: unknown;
  requirementsEventuallyDue: unknown;
  requirementsPastDue: unknown;
  requirementsPendingVerification: unknown;
  disabledReason: string | null;
  platformFeeBps: number;
  onboardingStartedAt: string | null;
  onboardingCompletedAt: string | null;
  lastSyncedAt: string | null;
  ready: boolean;
  status: "NOT_CONNECTED" | "ONBOARDING" | "RESTRICTED" | "READY";
};

function asStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function percent(bps: number) {
  return (bps / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  }) + "%";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export function CommerceManager({
  canManage,
  returnedFromOnboarding,
}: {
  canManage: boolean;
  returnedFromOnboarding: boolean;
}) {
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [country, setCountry] = useState("US");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/commerce", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load commerce status.");
    setCommerce(payload.commerce);
    if (payload.commerce.country) setCountry(payload.commerce.country);
  }

  async function run(action: "start-onboarding" | "sync" | "dashboard") {
    setBusy(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, country }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update commerce.");

      if (payload.url) {
        window.location.assign(payload.url);
        return;
      }

      setCommerce(payload.commerce);
      setMessage("Merchant configuration refreshed.");
      setBusy(null);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update commerce.",
      );
      setBusy(null);
    }
  }

  useEffect(() => {
    void load()
      .then(() => {
        if (returnedFromOnboarding) {
          void run("sync");
        }
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load commerce status.",
        ),
      );
  }, []);

  if (!commerce) {
    return <p className={error ? "cms-error" : "cms-loading"}>{error ?? "Loading merchant status…"}</p>;
  }

  const due = asStrings(commerce.requirementsCurrentlyDue);
  const pastDue = asStrings(commerce.requirementsPastDue);
  const pendingVerification = asStrings(
    commerce.requirementsPendingVerification,
  );

  return (
    <div className="commerce-manager">
      <section className="cms-panel commerce-overview">
        <div className="commerce-overview__heading">
          <div>
            <p className="eyebrow">Merchant status</p>
            <h2>{commerce.status.replaceAll("_", " ")}</h2>
            <p>
              Checkout is enabled after merchant configuration is approved and
              both payment collection and payouts are available.
            </p>
          </div>
          <strong className={"commerce-ready commerce-ready--" + (commerce.ready ? "yes" : "no")}>
            {commerce.ready ? "Checkout ready" : "Checkout paused"}
          </strong>
        </div>

        <div className="commerce-status-grid">
          <div>
            <span>Details submitted</span>
            <strong>{commerce.detailsSubmitted ? "Yes" : "No"}</strong>
          </div>
          <div>
            <span>Charges</span>
            <strong>{commerce.chargesEnabled ? "Enabled" : "Unavailable"}</strong>
          </div>
          <div>
            <span>Payouts</span>
            <strong>{commerce.payoutsEnabled ? "Enabled" : "Unavailable"}</strong>
          </div>
          <div>
            <span>Platform fee</span>
            <strong>{percent(commerce.platformFeeBps)}</strong>
          </div>
        </div>

        <dl className="commerce-metadata">
          <dt>merchant account</dt>
          <dd>{commerce.providerAccountId ?? "Not connected"}</dd>
          <dt>Country</dt>
          <dd>{commerce.country ?? "Not selected"}</dd>
          <dt>Default currency</dt>
          <dd>{commerce.defaultCurrency?.toUpperCase() ?? "Not available"}</dd>
          <dt>Last synced</dt>
          <dd>{formatDate(commerce.lastSyncedAt)}</dd>
        </dl>

        {commerce.disabledReason ? (
          <p className="commerce-warning">
            Merchant restriction: {commerce.disabledReason}
          </p>
        ) : null}

        {(pastDue.length || due.length || pendingVerification.length) ? (
          <div className="commerce-requirements">
            {pastDue.length ? (
              <div>
                <p className="eyebrow">Past due</p>
                <ul>{pastDue.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {due.length ? (
              <div>
                <p className="eyebrow">Currently due</p>
                <ul>{due.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {pendingVerification.length ? (
              <div>
                <p className="eyebrow">Pending verification</p>
                <ul>{pendingVerification.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="commerce-actions">
          {commerce.providerAccountId ? (
            <>
              {canManage && !commerce.ready ? (
                <button
                  className="cms-primary-button"
                  disabled={busy !== null}
                  onClick={() => void run("start-onboarding")}
                  type="button"
                >
                  {busy === "start-onboarding" ? "Opening…" : "Continue onboarding"}
                </button>
              ) : null}
              <button
                className="cms-secondary-button"
                disabled={busy !== null}
                onClick={() => void run("sync")}
                type="button"
              >
                {busy === "sync" ? "Refreshing…" : "Refresh merchant status"}
              </button>
              <button
                className="cms-secondary-button"
                disabled={busy !== null}
                onClick={() => void run("dashboard")}
                type="button"
              >
                {busy === "dashboard" ? "Opening…" : "Open merchant dashboard"}
              </button>
            </>
          ) : canManage ? (
            <div className="commerce-connect">
              <label className="cms-field">
                <span>Merchant country</span>
                <input
                  maxLength={2}
                  value={country}
                  onChange={(event) => setCountry(event.target.value.toUpperCase())}
                />
              </label>
              <button
                className="cms-primary-button"
                disabled={busy !== null}
                onClick={() => void run("start-onboarding")}
                type="button"
              >
                {busy === "start-onboarding" ? "Opening…" : "Connect merchant account"}
              </button>
            </div>
          ) : (
            <p className="commerce-warning">
              An Owner or Administrator must start merchant onboarding.
            </p>
          )}
        </div>

        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <section className="cms-panel commerce-settlement-note">
        <p className="eyebrow">Settlement architecture</p>
        <h2>Merchant settlement</h2>
        <p>
          Hosted checkout collects payment directly for the configured merchant.
          Settlement and bank payouts are handled by that merchant&apos;s acquirer.
          Automatic marketplace splits require a provider that supports them;
          checkout stays paused when an unsupported platform fee is configured.
        </p>
        <p>
          The platform fee shown above is controlled by the platform, not by
          tenant staff. Future changes affect future Checkout sessions only.
        </p>
      </section>
    </div>
  );
}
