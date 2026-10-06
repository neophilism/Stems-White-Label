"use client";

import { useState } from "react";

type FailedProcessingJob = {
  id: string;
  fileName: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
};

type FailedPackage = {
  id: string;
  fileName: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
};

type Flag = {
  key: string;
  enabled: boolean;
  note: string | null;
};

async function postAction(
  tenantId: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    "/api/platform-admin/tenants/" + encodeURIComponent(tenantId) + "/actions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Platform action failed.");
  }
}

export function PlatformTenantControls({
  tenantId,
  tenantStatus,
  platformFeeBps,
  flags,
  failedProcessingJobs,
  failedPackages,
}: {
  tenantId: string;
  tenantStatus: "ACTIVE" | "SUSPENDED";
  platformFeeBps: number | null;
  flags: Flag[];
  failedProcessingJobs: FailedProcessingJob[];
  failedPackages: FailedPackage[];
}) {
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState(String(platformFeeBps ?? 0));
  const [flagKey, setFlagKey] = useState("");
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagNote, setFlagNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    key: string,
    body: Record<string, unknown>,
  ) {
    setBusy(key);
    setError(null);
    try {
      await postAction(tenantId, { ...body, reason });
      window.location.reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Platform action failed.",
      );
      setBusy(null);
    }
  }

  return (
    <div className="platform-controls">
      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Operator reason</p>
          <h2>Every mutation is audited.</h2>
          <p>
            Enter the ticket, incident, customer request, or operational reason
            for the action. The same reason is written into the immutable audit
            ledger.
          </p>
        </div>
        <label className="cms-field">
          <span>Required reason</span>
          <textarea
            minLength={8}
            maxLength={1000}
            placeholder="Support ticket, incident, rollout rationale, or other operator justification"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <div className="platform-controls__grid">
        <section className="cms-panel">
          <p className="eyebrow">Tenant availability</p>
          <h2>{tenantStatus}</h2>
          <p>
            Suspension removes the tenant from public hostname resolution while
            retaining its data, orders, licenses, and audit history.
          </p>
          <button
            className={
              tenantStatus === "ACTIVE"
                ? "cms-danger-button"
                : "cms-primary-button"
            }
            disabled={busy !== null || reason.trim().length < 8}
            onClick={() =>
              void run("tenant-status", {
                action: "tenant-status",
                status: tenantStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
              })
            }
            type="button"
          >
            {busy === "tenant-status"
              ? "Applying…"
              : tenantStatus === "ACTIVE"
                ? "Suspend tenant"
                : "Reactivate tenant"}
          </button>
        </section>

        <section className="cms-panel">
          <p className="eyebrow">Commerce settlement</p>
          <h2>Platform fee</h2>
          <label className="cms-field">
            <span>Basis points</span>
            <input
              inputMode="numeric"
              min={0}
              max={10000}
              type="number"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
            />
          </label>
          <p className="platform-control-note">
            100 basis points = 1%. Changes apply to future Checkout sessions;
            existing Orders keep their settlement snapshots.
          </p>
          <button
            className="cms-primary-button"
            disabled={busy !== null || reason.trim().length < 8}
            onClick={() =>
              void run("platform-fee", {
                action: "platform-fee",
                platformFeeBps: Number(fee),
              })
            }
            type="button"
          >
            {busy === "platform-fee" ? "Saving…" : "Update platform fee"}
          </button>
        </section>
      </div>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Tenant feature flags</p>
          <h2>Controlled rollout</h2>
          <p>
            Flags are tenant-scoped. A flag has no effect until application code
            explicitly reads that key; this prevents the operator console from
            creating arbitrary behavior.
          </p>
        </div>

        {flags.length ? (
          <div className="platform-flags">
            {flags.map((flag) => (
              <article key={flag.key}>
                <div>
                  <code>{flag.key}</code>
                  <strong>{flag.enabled ? "Enabled" : "Disabled"}</strong>
                  {flag.note ? <p>{flag.note}</p> : null}
                </div>
                <button
                  className="cms-danger-button"
                  disabled={busy !== null || reason.trim().length < 8}
                  onClick={() =>
                    void run("remove:" + flag.key, {
                      action: "remove-feature",
                      key: flag.key,
                    })
                  }
                  type="button"
                >
                  Remove override
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No tenant feature overrides.</p>
        )}

        <div className="platform-flag-form">
          <label className="cms-field">
            <span>Flag key</span>
            <input
              placeholder="beta.new_player"
              value={flagKey}
              onChange={(event) => setFlagKey(event.target.value)}
            />
          </label>
          <label className="cms-field">
            <span>State</span>
            <select
              value={flagEnabled ? "enabled" : "disabled"}
              onChange={(event) =>
                setFlagEnabled(event.target.value === "enabled")
              }
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label className="cms-field">
            <span>Operator note</span>
            <input
              placeholder="Optional rollout cohort or context"
              value={flagNote}
              onChange={(event) => setFlagNote(event.target.value)}
            />
          </label>
          <button
            className="cms-primary-button"
            disabled={
              busy !== null ||
              reason.trim().length < 8 ||
              flagKey.trim().length < 2
            }
            onClick={() =>
              void run("set-feature", {
                action: "set-feature",
                key: flagKey,
                enabled: flagEnabled,
                note: flagNote,
              })
            }
            type="button"
          >
            {busy === "set-feature" ? "Saving…" : "Set feature override"}
          </button>
        </div>
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Failed audio processing</p>
          <h2>Operator retries</h2>
        </div>
        {failedProcessingJobs.length ? (
          <div className="platform-failures">
            {failedProcessingJobs.map((job) => (
              <article key={job.id}>
                <div>
                  <strong>{job.fileName}</strong>
                  <span>
                    Attempts {job.attempts}/{job.maxAttempts}
                  </span>
                  {job.lastError ? <p>{job.lastError}</p> : null}
                </div>
                <button
                  className="cms-secondary-button"
                  disabled={busy !== null || reason.trim().length < 8}
                  onClick={() =>
                    void run("processing:" + job.id, {
                      action: "retry-processing",
                      jobId: job.id,
                    })
                  }
                  type="button"
                >
                  Retry
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No failed audio processing jobs.</p>
        )}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Failed ZIP packaging</p>
          <h2>Package retries</h2>
        </div>
        {failedPackages.length ? (
          <div className="platform-failures">
            {failedPackages.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{entry.fileName}</strong>
                  <span>
                    Attempts {entry.attempts}/{entry.maxAttempts}
                  </span>
                  {entry.lastError ? <p>{entry.lastError}</p> : null}
                </div>
                <button
                  className="cms-secondary-button"
                  disabled={busy !== null || reason.trim().length < 8}
                  onClick={() =>
                    void run("package:" + entry.id, {
                      action: "retry-package",
                      packageId: entry.id,
                    })
                  }
                  type="button"
                >
                  Retry
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No failed package jobs.</p>
        )}
      </section>
    </div>
  );
}
