export type LicenseScope = "WORK" | "SELECTED_STEMS" | "ALL_STEMS";

export type LicenseDraft = {
  name: unknown;
  slug?: unknown;
  summary?: unknown;
  scope?: unknown;
  priceCents: unknown;
  currency?: unknown;
  termsText: unknown;
  attributionRequired?: unknown;
  commercialUseAllowed?: unknown;
  derivativesAllowed?: unknown;
  redistributionAllowed?: unknown;
  seatLimit?: unknown;
  projectLimit?: unknown;
  selectedStemGroupIds?: unknown;
};

export function licenseSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function optionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(label + " must be a positive integer.");
  }
  return number;
}

export function normalizeLicenseDraft(input: LicenseDraft) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 180) : "";
  if (!name) throw new Error("License name is required.");

  const slug = licenseSlug(
    typeof input.slug === "string" && input.slug.trim() ? input.slug : name,
  );
  if (!slug) throw new Error("License slug is required.");

  const scope = input.scope ?? "ALL_STEMS";
  if (!["WORK", "SELECTED_STEMS", "ALL_STEMS"].includes(String(scope))) {
    throw new Error("Unsupported license scope.");
  }

  const priceCents = Number(input.priceCents);
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > 100_000_000) {
    throw new Error("Price must be a non-negative integer in cents.");
  }

  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase()
      : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Currency must be a 3-letter code.");

  const termsText =
    typeof input.termsText === "string" ? input.termsText.trim().slice(0, 100_000) : "";
  if (!termsText) throw new Error("License terms are required.");

  const selectedStemGroupIds = Array.isArray(input.selectedStemGroupIds)
    ? [...new Set(input.selectedStemGroupIds.filter((id): id is string => typeof id === "string" && Boolean(id)))]
    : [];

  if (scope === "SELECTED_STEMS" && selectedStemGroupIds.length === 0) {
    throw new Error("Selected-stems licenses require at least one source group.");
  }
  if (scope !== "SELECTED_STEMS" && selectedStemGroupIds.length > 0) {
    throw new Error("Only selected-stems licenses may specify source groups.");
  }

  return {
    name,
    slug,
    summary:
      typeof input.summary === "string" && input.summary.trim()
        ? input.summary.trim().slice(0, 4000)
        : null,
    scope: scope as LicenseScope,
    selectedStemGroupIds,
    version: {
      priceCents,
      currency,
      termsText,
      attributionRequired: Boolean(input.attributionRequired),
      commercialUseAllowed: input.commercialUseAllowed !== false,
      derivativesAllowed: input.derivativesAllowed !== false,
      redistributionAllowed: Boolean(input.redistributionAllowed),
      seatLimit: optionalPositiveInteger(input.seatLimit, "Seat limit"),
      projectLimit: optionalPositiveInteger(input.projectLimit, "Project limit"),
    },
  };
}

export function formatLicensePrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}
