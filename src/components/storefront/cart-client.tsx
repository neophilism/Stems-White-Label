"use client";

import { useEffect, useMemo, useState } from "react";

const CART_KEY = "stems-white-label-cart-v1";

type QuoteItem = {
  licenseProductId: string;
  licenseVersionId: string;
  workSlug: string;
  workTitle: string;
  licenseName: string;
  licenseVersionNumber: number;
  scope: string;
  priceCents: number;
  currency: string;
  termsText: string;
  selectedStemLabels: string[];
};

type Quote = {
  currency: string;
  subtotalCents: number;
  items: QuoteItem[];
};

function readStoredCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function CartClient({ buyNowId }: { buyNowId: string | null }) {
  const [ids, setIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isBuyNow = Boolean(buyNowId);

  useEffect(() => {
    setIds(buyNowId ? [buyNowId] : readStoredCart());
  }, [buyNowId]);

  useEffect(() => {
    if (ids.length === 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    setError(null);

    void fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseProductIds: ids }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to quote cart.");
        setQuote(payload);
      })
      .catch((loadError) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to quote cart.");
      });

    return () => controller.abort();
  }, [ids]);

  const total = useMemo(
    () => quote ? money(quote.subtotalCents, quote.currency) : "—",
    [quote],
  );

  function remove(id: string) {
    const next = ids.filter((item) => item !== id);
    setIds(next);
    if (!isBuyNow) {
      window.localStorage.setItem(CART_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("stems-cart-change"));
    }
    setAccepted(false);
  }

  async function checkout() {
    if (!quote || !accepted || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseProductIds: ids,
          acceptedLicenseVersionIds: quote.items.map((item) => item.licenseVersionId),
          termsAccepted: accepted,
          buyerEmail: buyerEmail.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to start checkout.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  if (ids.length === 0) {
    return (
      <section className="cart-empty">
        <p className="micro-label">Cart</p>
        <h1>No source licenses selected.</h1>
        <a className="text-link" href="/#archive">Return to the archive</a>
      </section>
    );
  }

  return (
    <div className="cart-review">
      <header className="cart-review__header">
        <div>
          <p className="micro-label">{isBuyNow ? "Buy now" : "Cart"}</p>
          <h1>Review the license record.</h1>
          <p>
            These exact license versions and terms will be frozen into the order
            before Stripe Checkout opens.
          </p>
        </div>
        <strong>{total}</strong>
      </header>

      {quote ? (
        <div className="cart-review__items">
          {quote.items.map((item) => (
            <article className="cart-review__item" key={item.licenseProductId}>
              <div className="cart-review__item-head">
                <div>
                  <p className="micro-label">License v{item.licenseVersionNumber}</p>
                  <h2>{item.workTitle}</h2>
                  <p>{item.licenseName}</p>
                </div>
                <strong>{money(item.priceCents, item.currency)}</strong>
              </div>
              <p className="cart-review__scope">
                {item.scope.replaceAll("_", " ")}
                {item.selectedStemLabels.length ? " · " + item.selectedStemLabels.join(" · ") : ""}
              </p>
              <details className="cart-review__terms" open={quote.items.length === 1}>
                <summary>Exact license terms</summary>
                <div>
                  {item.termsText.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
              </details>
              <button className="cart-review__remove" onClick={() => remove(item.licenseProductId)} type="button">
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="cart-review__loading">Loading exact license versions…</p>
      )}

      <section className="cart-review__acceptance">
        <label>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            I have reviewed and accept each exact license version and terms shown
            above. I understand these terms will be preserved with my order.
          </span>
        </label>

        <label className="cart-review__email">
          <span>Email (optional before Stripe; Stripe will collect one if blank)</span>
          <input
            type="email"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <button
          className="purchase-button cart-review__checkout"
          disabled={!quote || !accepted || busy}
          onClick={() => void checkout()}
          type="button"
        >
          {busy ? "Opening secure checkout…" : "Continue to Stripe"}
        </button>

        {error ? <p className="cart-review__error">{error}</p> : null}
      </section>
    </div>
  );
}
