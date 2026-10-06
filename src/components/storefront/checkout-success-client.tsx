"use client";

import { useEffect, useState } from "react";

const CART_KEY = "stems-white-label-cart-v1";

type Order = {
  id: string;
  status: string;
  currency: string;
  totalCents: number;
  buyerEmail: string | null;
  paidAt: string | null;
  items: Array<{
    id: string;
    workTitleSnapshot: string;
    licenseNameSnapshot: string;
    licenseVersionNumber: number;
    unitPriceCents: number;
    currency: string;
    purchaseLicense: { id: string } | null;
  }>;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function CheckoutSuccessClient({ sessionId }: { sessionId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const response = await fetch("/api/checkout/order?session_id=" + encodeURIComponent(sessionId), {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load order.");
        if (cancelled) return;

        setOrder(payload.order);

        if (payload.order.status === "PAID") {
          window.localStorage.removeItem(CART_KEY);
          window.dispatchEvent(new Event("stems-cart-change"));
          return;
        }

        if (["CHECKOUT_CREATED", "PENDING"].includes(payload.order.status)) {
          timer = setTimeout(load, 1500);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load order.");
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (error) return <p className="cart-review__error">{error}</p>;
  if (!order) return <p className="cart-review__loading">Confirming payment with Stripe…</p>;

  const paid = order.status === "PAID";

  return (
    <section className="receipt">
      <p className="micro-label">{paid ? "Payment confirmed" : "Payment status"}</p>
      <h1>{paid ? "The license record is sealed." : "Confirming the transaction."}</h1>
      <p>
        {paid
          ? "Your order now points to the exact license versions you accepted. Secure downloads and the customer library arrive in PR 11."
          : "The return from Stripe is not treated as proof of payment. This page waits for the verified Stripe webhook before granting licenses."}
      </p>

      <div className="receipt__meta">
        <span>Order {order.id}</span>
        <span>{order.status.replaceAll("_", " ")}</span>
        <span>{money(order.totalCents, order.currency)}</span>
      </div>

      <div className="receipt__items">
        {order.items.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.workTitleSnapshot}</strong>
              <span>{item.licenseNameSnapshot} · v{item.licenseVersionNumber}</span>
            </div>
            <strong>{money(item.unitPriceCents, item.currency)}</strong>
          </article>
        ))}
      </div>

      <div className="receipt__actions">
        {paid ? (
          <a className="text-link" href="/library">
            Open customer library
          </a>
        ) : null}
        <a className="text-link" href="/#archive">Return to the archive</a>
      </div>
    </section>
  );
}
