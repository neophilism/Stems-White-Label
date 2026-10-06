"use client";

import { useEffect, useState } from "react";

type PackageState = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  fileName: string;
  sizeBytes: string | null;
  lastError?: string | null;
} | null;

export function LibraryPackageControls({
  purchaseLicenseId,
  initialPackage,
  disabled,
}: {
  purchaseLicenseId: string;
  initialPackage: PackageState;
  disabled: boolean;
}) {
  const [record, setRecord] = useState<PackageState>(initialPackage);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!record || !["QUEUED", "PROCESSING"].includes(record.status)) return;

    const timer = setInterval(() => {
      void fetch(
        "/api/library/licenses/" +
          encodeURIComponent(purchaseLicenseId) +
          "/package",
        { cache: "no-store" },
      )
        .then((response) => response.json())
        .then((payload) => setRecord(payload.package ?? null))
        .catch(() => undefined);
    }, 2000);

    return () => clearInterval(timer);
  }, [purchaseLicenseId, record?.status]);

  async function requestPackage() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/library/licenses/" +
          encodeURIComponent(purchaseLicenseId) +
          "/package",
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to build package.");
      setRecord(payload.package);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to build package.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return null;

  if (record?.status === "READY") {
    return (
      <a
        className="library-download-button"
        href={"/api/library/packages/" + encodeURIComponent(record.id) + "/download"}
      >
        Download ZIP package
      </a>
    );
  }

  if (record && ["QUEUED", "PROCESSING"].includes(record.status)) {
    return (
      <span className="library-package-status">
        {record.status === "QUEUED"
          ? "ZIP package queued…"
          : "Building ZIP package…"}
      </span>
    );
  }

  return (
    <div className="library-package-request">
      <button
        className="library-download-button"
        disabled={busy}
        onClick={() => void requestPackage()}
        type="button"
      >
        {busy
          ? "Queuing package…"
          : record?.status === "FAILED"
            ? "Retry ZIP package"
            : "Build ZIP package"}
      </button>
      {error ? <span className="cart-review__error">{error}</span> : null}
    </div>
  );
}
