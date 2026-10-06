"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function CustomerEmailSignIn({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await signIn("email", {
      email,
      callbackUrl,
      redirect: false,
    });

    setBusy(false);

    if (!result?.ok) {
      setError(
        "Unable to send a sign-in link. Use the email address from your purchase.",
      );
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="customer-signin__sent">
        <p className="micro-label">Check your email</p>
        <h2>Your private sign-in link is on its way.</h2>
        <p>
          The link is single-use and expires automatically. Return here after
          opening it to access your licensed source material.
        </p>
      </div>
    );
  }

  return (
    <form className="customer-signin__form" onSubmit={submit}>
      <label>
        <span>Purchase email</span>
        <input
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <button className="purchase-button" disabled={busy} type="submit">
        {busy ? "Sending secure link…" : "Email me a sign-in link"}
      </button>
      {error ? <p className="cart-review__error">{error}</p> : null}
    </form>
  );
}
