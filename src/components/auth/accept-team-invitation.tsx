"use client";

import { useState } from "react";

export function AcceptTeamInvitation({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to accept invitation.");
      window.location.assign("/admin");
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Unable to accept invitation.",
      );
      setBusy(false);
    }
  }

  return (
    <section className="cms-panel invitation-accept__panel">
      <button className="cms-primary-button" disabled={busy} onClick={() => void accept()} type="button">
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
      {error ? <p className="cms-error">{error}</p> : null}
    </section>
  );
}
