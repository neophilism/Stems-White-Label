"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CART_KEY = "stems-white-label-cart-v1";

function readCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}

export function LicensePurchaseActions({
  licenseProductId,
}: {
  licenseProductId: string;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function addToCart() {
    const ids = readCart();
    if (!ids.includes(licenseProductId)) ids.push(licenseProductId);
    window.localStorage.setItem(CART_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("stems-cart-change"));
    setAdded(true);
  }

  return (
    <div className="license-option__purchase-actions">
      <button className="purchase-button" onClick={() => router.push("/cart?buy=" + encodeURIComponent(licenseProductId))} type="button">
        Buy now
      </button>
      <button className="purchase-button purchase-button--secondary" onClick={addToCart} type="button">
        {added ? "Added" : "Add to cart"}
      </button>
    </div>
  );
}
