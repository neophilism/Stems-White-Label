"use client";

import { useEffect, useMemo, useState } from "react";

type TeamRole = "OWNER" | "ADMIN" | "CATALOG_MANAGER" | "FINANCE" | "VIEWER";

type Member = {
  id: string;
  role: TeamRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  normalizedEmail: string;
  role: TeamRole;
  expiresAt: string;
  createdAt: string;
};

type Audit = {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

type Payload = {
  members: Member[];
  invitations: Invitation[];
  audit: Audit[];
  currentUserId: string;
  currentRole: TeamRole;
};

const roles: TeamRole[] = [
  "OWNER",
  "ADMIN",
  "CATALOG_MANAGER",
  "FINANCE",
  "VIEWER",
];

const roleDescriptions: Record<TeamRole, string> = {
  OWNER: "Full tenant authority, including owner-role changes.",
  ADMIN: "Tenant settings, team, catalog, finance, and analytics.",
  CATALOG_MANAGER: "Catalog publishing and analytics.",
  FINANCE: "Commerce, finance, catalog reading, and analytics.",
  VIEWER: "Read-only catalog and analytics access.",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function date(value: string) {
  return new Date(value).toLocaleString();
}

export function TeamManager() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("CATALOG_MANAGER");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/team", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load team.");
    setPayload(data);
  }

  async function action(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update team.");
      setPayload(data);
      if (body.action === "invite") {
        setEmail("");
        setMessage("Invitation sent.");
      } else if (body.action === "resend_invitation") {
        setMessage("Invitation resent with a fresh seven-day token.");
      } else {
        setMessage("Team access updated.");
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to update team.",
      );
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Unable to load team."),
    );
  }, []);

  const assignableRoles = useMemo(
    () =>
      payload?.currentRole === "OWNER"
        ? roles
        : roles.filter((entry) => entry !== "OWNER"),
    [payload?.currentRole],
  );

  if (!payload) {
    return <p className="cms-loading">Loading team accounts…</p>;
  }

  return (
    <div className="team-manager">
      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Invite</p>
          <h2>Add a tenant staff account.</h2>
          <p>
            Invitations expire after seven days. A pending invitation reserves a
            team seat so accepted invitations cannot silently exceed the SaaS plan.
          </p>
        </div>

        <form
          className="team-invite-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action({ action: "invite", email, role }, "invite");
          }}
        >
          <label>
            <span>Email address</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="collaborator@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              onChange={(event) => setRole(event.target.value as TeamRole)}
              value={role}
            >
              {assignableRoles.map((entry) => (
                <option key={entry} value={entry}>
                  {label(entry)}
                </option>
              ))}
            </select>
          </label>
          <button className="cms-primary-button" disabled={busy !== null} type="submit">
            {busy === "invite" ? "Sending…" : "Send invitation"}
          </button>
        </form>

        <p className="team-role-note">{roleDescriptions[role]}</p>
        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Members</p>
          <h2>Current access.</h2>
          <p>
            Role changes apply immediately. Revoking a membership removes tenant
            administration access without deleting the user identity.
          </p>
        </div>

        <div className="team-table" role="table" aria-label="Tenant team members">
          {payload.members.map((member) => {
            const managesOwner =
              member.role === "OWNER" || payload.currentRole !== "OWNER";
            const canEdit = !managesOwner || payload.currentRole === "OWNER";

            return (
              <article className="team-row" key={member.id}>
                <div className="team-row__identity">
                  <strong>{member.user.name || member.user.email || "Unnamed user"}</strong>
                  <span>{member.user.email || "No email"}</span>
                  {member.user.id === payload.currentUserId ? <em>You</em> : null}
                </div>

                <select
                  aria-label={"Role for " + (member.user.email || member.user.id)}
                  disabled={!canEdit || busy !== null}
                  onChange={(event) =>
                    void action(
                      {
                        action: "update_role",
                        membershipId: member.id,
                        role: event.target.value,
                      },
                      "role:" + member.id,
                    )
                  }
                  value={member.role}
                >
                  {(payload.currentRole === "OWNER"
                    ? roles
                    : roles.filter((entry) => entry !== "OWNER")
                  ).map((entry) => (
                    <option key={entry} value={entry}>
                      {label(entry)}
                    </option>
                  ))}
                </select>

                <button
                  className="cms-secondary-button"
                  disabled={!canEdit || busy !== null}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Revoke this member's tenant access immediately?",
                      )
                    ) {
                      void action(
                        { action: "revoke_member", membershipId: member.id },
                        "revoke:" + member.id,
                      );
                    }
                  }}
                  type="button"
                >
                  {busy === "revoke:" + member.id ? "Revoking…" : "Revoke"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Pending invitations</p>
          <h2>Reserved seats.</h2>
        </div>

        {payload.invitations.length ? (
          <div className="team-table">
            {payload.invitations.map((invitation) => (
              <article className="team-row" key={invitation.id}>
                <div className="team-row__identity">
                  <strong>{invitation.email}</strong>
                  <span>
                    {label(invitation.role)} · expires {date(invitation.expiresAt)}
                  </span>
                </div>
                <button
                  className="cms-secondary-button"
                  disabled={busy !== null}
                  onClick={() =>
                    void action(
                      {
                        action: "resend_invitation",
                        invitationId: invitation.id,
                      },
                      "resend:" + invitation.id,
                    )
                  }
                  type="button"
                >
                  {busy === "resend:" + invitation.id ? "Sending…" : "Resend"}
                </button>
                <button
                  className="cms-secondary-button"
                  disabled={busy !== null}
                  onClick={() =>
                    void action(
                      {
                        action: "revoke_invitation",
                        invitationId: invitation.id,
                      },
                      "revoke-invite:" + invitation.id,
                    )
                  }
                  type="button"
                >
                  Revoke
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No active invitations.</p>
        )}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Access ledger</p>
          <h2>Recent team history.</h2>
          <p>
            Team mutations are append-only at the database layer; application
            code exposes no audit update or delete operation.
          </p>
        </div>

        {payload.audit.length ? (
          <div className="team-audit-list">
            {payload.audit.map((entry) => (
              <article key={entry.id}>
                <strong>{label(entry.action)}</strong>
                <span>{entry.actorEmail || "Unknown actor"}</span>
                <time dateTime={entry.createdAt}>{date(entry.createdAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="cms-empty">No team-access events yet.</p>
        )}
      </section>
    </div>
  );
}
