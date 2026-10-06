"use client";

import { useEffect, useState } from "react";

type Domain = {
  id: string;
  hostname: string;
  isPrimary: boolean;
  verificationToken: string | null;
  ownershipStatus: "PENDING" | "VERIFIED" | "FAILED";
  routingStatus: "PENDING" | "READY" | "FAILED";
  tlsStatus: "PENDING" | "READY" | "FAILED";
  verifiedAt: string | null;
  routingVerifiedAt: string | null;
  tlsVerifiedAt: string | null;
  claimExpiresAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  setup: {
    ownership: { type: "TXT"; host: string; value: string } | null;
    routing: {
      cnameTarget: string | null;
      ipv4Targets: string[];
      ipv6Targets: string[];
      configured: boolean;
    };
  };
};

function statusClass(status: string) {
  return "domain-status domain-status--" + status.toLowerCase();
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/domains", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load domains.");
    setDomains(payload.domains);
  }

  useEffect(() => {
    void load().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Unable to load domains."),
    );
  }, []);

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("add");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to register domain.");
      setHostname("");
      await load();
      setMessage("Domain claim created. Add the DNS records below, then verify.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to register domain.");
    } finally {
      setBusy(null);
    }
  }

  async function action(domainId: string, actionName: "verify" | "make-primary") {
    setBusy(domainId + ":" + actionName);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/domains/" + domainId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update domain.");
      await load();
      setMessage(
        actionName === "verify"
          ? "DNS and HTTPS status refreshed."
          : "Primary domain updated.",
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update domain.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(domain: Domain) {
    if (!window.confirm("Remove " + domain.hostname + " from this tenant?")) return;

    setBusy(domain.id + ":delete");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/domains/" + domain.id, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Unable to remove domain.");
      }
      await load();
      setMessage("Domain removed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove domain.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="domain-manager">
      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Add custom domain</p>
          <h2>Claim a hostname.</h2>
          <p>
            Ownership, platform routing, and the HTTPS certificate are verified
            separately. A hostname does not serve this tenant until all three
            checks are ready.
          </p>
        </div>

        <form className="domain-add-form" onSubmit={addDomain}>
          <label className="cms-field">
            <span>Hostname</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="stems.artist.com"
              required
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
            />
          </label>
          <button className="cms-primary-button" disabled={busy !== null} type="submit">
            {busy === "add" ? "Registering…" : "Register domain"}
          </button>
        </form>

        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <div className="domain-list">
        {domains.map((domain) => {
          const fullyReady =
            domain.ownershipStatus === "VERIFIED" &&
            domain.routingStatus === "READY" &&
            domain.tlsStatus === "READY";
          const managedPlatformDomain = !domain.setup.ownership;

          return (
            <article className="cms-panel domain-card" key={domain.id}>
              <header className="domain-card__header">
                <div>
                  <p className="eyebrow">
                    {domain.isPrimary
                      ? "Primary domain"
                      : managedPlatformDomain
                        ? "Platform domain"
                        : "Custom domain"}
                  </p>
                  <h2>{domain.hostname}</h2>
                </div>
                {fullyReady ? (
                  <a
                    className="text-link"
                    href={"https://" + domain.hostname}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open ↗
                  </a>
                ) : null}
              </header>

              <div className="domain-status-grid">
                <div>
                  <span>Ownership</span>
                  <strong className={statusClass(domain.ownershipStatus)}>
                    {domain.ownershipStatus}
                  </strong>
                </div>
                <div>
                  <span>Routing</span>
                  <strong className={statusClass(domain.routingStatus)}>
                    {domain.routingStatus}
                  </strong>
                </div>
                <div>
                  <span>HTTPS / TLS</span>
                  <strong className={statusClass(domain.tlsStatus)}>
                    {domain.tlsStatus}
                  </strong>
                </div>
              </div>

              {domain.setup.ownership ? (
                <section className="domain-dns-instructions">
                  <div>
                    <p className="eyebrow">1 · Prove ownership</p>
                    <dl>
                      <dt>Type</dt><dd>TXT</dd>
                      <dt>Host</dt><dd><code>{domain.setup.ownership.host}</code></dd>
                      <dt>Value</dt><dd><code>{domain.setup.ownership.value}</code></dd>
                    </dl>
                  </div>

                  <div>
                    <p className="eyebrow">2 · Route traffic</p>
                    {domain.setup.routing.cnameTarget ? (
                      <dl>
                        <dt>Type</dt><dd>CNAME</dd>
                        <dt>Host</dt><dd><code>{domain.hostname}</code></dd>
                        <dt>Target</dt><dd><code>{domain.setup.routing.cnameTarget}</code></dd>
                      </dl>
                    ) : domain.setup.routing.ipv4Targets.length ||
                      domain.setup.routing.ipv6Targets.length ? (
                      <div>
                        {domain.setup.routing.ipv4Targets.map((target) => (
                          <p key={target}><code>A · {domain.hostname} → {target}</code></p>
                        ))}
                        {domain.setup.routing.ipv6Targets.map((target) => (
                          <p key={target}><code>AAAA · {domain.hostname} → {target}</code></p>
                        ))}
                      </div>
                    ) : (
                      <p className="cms-error">
                        Platform routing targets are not configured yet.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="eyebrow">3 · HTTPS</p>
                    <p>
                      After ownership and routing pass, verification performs a
                      real TLS handshake for <code>{domain.hostname}</code>. The
                      domain becomes eligible for primary use only after its
                      certificate validates successfully.
                    </p>
                  </div>
                </section>
              ) : null}

              {domain.lastError ? (
                <p className="domain-card__error">{domain.lastError}</p>
              ) : null}

              <footer className="domain-card__footer">
                <div>
                  <span>Last checked: {date(domain.lastCheckedAt)}</span>
                  {domain.claimExpiresAt ? (
                    <span>Claim expires: {date(domain.claimExpiresAt)}</span>
                  ) : null}
                </div>

                <div className="domain-card__actions">
                  {domain.setup.ownership ? (
                    <button
                      className="cms-secondary-button"
                      disabled={busy !== null}
                      onClick={() => void action(domain.id, "verify")}
                      type="button"
                    >
                      {busy === domain.id + ":verify" ? "Checking…" : "Check DNS & HTTPS"}
                    </button>
                  ) : null}

                  {!domain.isPrimary && fullyReady ? (
                    <button
                      className="cms-primary-button"
                      disabled={busy !== null}
                      onClick={() => void action(domain.id, "make-primary")}
                      type="button"
                    >
                      Make primary
                    </button>
                  ) : null}

                  {!domain.isPrimary && domain.setup.ownership ? (
                    <button
                      className="cms-danger-button"
                      disabled={busy !== null}
                      onClick={() => void remove(domain)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
