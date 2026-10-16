import type { LicenseScope } from "@prisma/client";

import { db } from "@/lib/db";

export type CheckoutQuoteItem = {
  licenseProductId: string;
  licenseVersionId: string;
  workId: string;
  workSlug: string;
  workTitle: string;
  licenseName: string;
  licenseVersionNumber: number;
  scope: LicenseScope;
  priceCents: number;
  currency: string;
  termsText: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  derivativesAllowed: boolean;
  redistributionAllowed: boolean;
  seatLimit: number | null;
  projectLimit: number | null;
  selectedStemLabels: string[];
  deliverableAssets: Array<{
    id: string;
    fileName: string;
    kind: "MASTER" | "STEM";
    stemLabel: string | null;
  }>;
};

export function normalizeCartIds(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Cart items must be an array.");
  const ids = [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
  if (ids.length === 0) throw new Error("Cart is empty.");
  if (ids.length > 20) throw new Error("A checkout can contain at most 20 licenses.");
  return ids;
}

export function normalizeBuyerEmail(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Buyer email must be a string.");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Buyer email is invalid.");
  return email;
}

export async function quoteLicenseProducts(tenantId: string, rawIds: unknown) {
  const ids = normalizeCartIds(rawIds);
  const products = await db.licenseProduct.findMany({
    where: {
      id: { in: ids },
      tenantId,
      isActive: true,
      work: { status: "PUBLISHED" },
    },
    include: {
      work: {
        select: {
          id: true,
          slug: true,
          title: true,
          audioAssets: {
            where: {
              status: "READY",
              storageKey: { not: null },
              kind: { in: ["MASTER", "STEM"] },
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              fileName: true,
              kind: true,
              stemGroupId: true,
              stemGroup: { select: { label: true } },
            },
          },
        },
      },
      selectedStems: {
        include: { stemGroup: { select: { id: true, label: true } } },
      },
      versions: {
        where: { retiredAt: null },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (products.length !== ids.length) throw new Error("One or more licenses are unavailable.");

  const byId = new Map(products.map((product) => [product.id, product]));
  const items: CheckoutQuoteItem[] = ids.map((id) => {
    const product = byId.get(id)!;
    const version = product.versions[0];
    if (!version) throw new Error("A selected license has no current version.");

    const selectedStemIds = new Set(
      product.selectedStems.map((entry) => entry.stemGroupId),
    );

    const candidateAssets =
      product.scope === "WORK"
        ? product.work.audioAssets.filter((asset) => asset.kind === "MASTER")
        : product.work.audioAssets.filter(
            (asset) =>
              asset.kind === "STEM" &&
              asset.stemGroupId &&
              (product.scope === "ALL_STEMS" ||
                selectedStemIds.has(asset.stemGroupId)),
          );

    const seenStemGroups = new Set<string>();
    const deliverableAssets = candidateAssets.filter((asset) => {
      if (asset.kind === "MASTER") return true;
      if (!asset.stemGroupId || seenStemGroups.has(asset.stemGroupId)) return false;
      seenStemGroups.add(asset.stemGroupId);
      return true;
    });

    if (deliverableAssets.length === 0) {
      throw new Error(
        product.name + " has no ready original files available for delivery.",
      );
    }

    return {
      licenseProductId: product.id,
      licenseVersionId: version.id,
      workId: product.work.id,
      workSlug: product.work.slug,
      workTitle: product.work.title,
      licenseName: product.name,
      licenseVersionNumber: version.version,
      scope: product.scope,
      priceCents: version.priceCents,
      currency: version.currency,
      termsText: version.termsText,
      attributionRequired: version.attributionRequired,
      commercialUseAllowed: version.commercialUseAllowed,
      derivativesAllowed: version.derivativesAllowed,
      redistributionAllowed: version.redistributionAllowed,
      seatLimit: version.seatLimit,
      projectLimit: version.projectLimit,
      selectedStemLabels: product.selectedStems.map((entry) => entry.stemGroup.label),
      deliverableAssets: deliverableAssets.map((asset) => ({
        id: asset.id,
        fileName: asset.fileName,
        kind: asset.kind as "MASTER" | "STEM",
        stemLabel: asset.stemGroup?.label ?? null,
      })),
    };
  });

  const currencies = new Set(items.map((item) => item.currency));
  if (currencies.size !== 1) throw new Error("All cart licenses must use the same currency.");

  return {
    items,
    currency: items[0]!.currency,
    subtotalCents: items.reduce((sum, item) => sum + item.priceCents, 0),
  };
}

export function assertAcceptedLicenseVersions(
  quote: { items: Array<{ licenseVersionId: string }> },
  rawAcceptedVersionIds: unknown,
) {
  const accepted = Array.isArray(rawAcceptedVersionIds)
    ? new Set(rawAcceptedVersionIds.filter((id): id is string => typeof id === "string"))
    : new Set<string>();

  if (
    accepted.size !== quote.items.length ||
    quote.items.some((item) => !accepted.has(item.licenseVersionId))
  ) {
    throw new Error(
      "License terms changed since review. Please review the current version before checkout.",
    );
  }
}

export async function createPendingOrder(
  tenantId: string,
  quote: Awaited<ReturnType<typeof quoteLicenseProducts>>,
  accepted: boolean,
  buyerEmail: string | null,
  settlement?: {
    provider?: "AUTHORIZE_NET" | "SANDBOX";
    providerAccountId: string;
    platformFeeCents: number;
  },
) {
  if (!accepted) throw new Error("License terms must be accepted before checkout.");

  return db.order.create({
    data: {
      tenantId,
      status: "PENDING",
      currency: quote.currency,
      subtotalCents: quote.subtotalCents,
      totalCents: quote.subtotalCents,
      buyerEmail,
      providerAccountId: settlement?.providerAccountId ?? null,
      platformFeeCents: settlement?.platformFeeCents ?? 0,
      termsAcceptedAt: new Date(),
      items: {
        create: quote.items.map((item) => ({
          licenseProductId: item.licenseProductId,
          licenseVersionId: item.licenseVersionId,
          workId: item.workId,
          licenseNameSnapshot: item.licenseName,
          workTitleSnapshot: item.workTitle,
          licenseVersionNumber: item.licenseVersionNumber,
          scopeSnapshot: item.scope,
          unitPriceCents: item.priceCents,
          currency: item.currency,
          termsTextSnapshot: item.termsText,
          attributionRequired: item.attributionRequired,
          commercialUseAllowed: item.commercialUseAllowed,
          derivativesAllowed: item.derivativesAllowed,
          redistributionAllowed: item.redistributionAllowed,
          seatLimit: item.seatLimit,
          projectLimit: item.projectLimit,
          selectedStemLabelsSnapshot: item.selectedStemLabels,
          deliverableAssets: {
            create: item.deliverableAssets.map((asset) => ({
              audioAssetId: asset.id,
              fileNameSnapshot: asset.fileName,
              kindSnapshot: asset.kind,
              stemLabelSnapshot: asset.stemLabel,
            })),
          },
        })),
      },
      payments: {
        create: {
          tenantId,
          provider: settlement?.provider ?? "AUTHORIZE_NET",
          status: "PENDING",
          providerAccountId: settlement?.providerAccountId ?? null,
          platformFeeCents: settlement?.platformFeeCents ?? 0,
          amountCents: quote.subtotalCents,
          currency: quote.currency,
        },
      },
    },
    include: { items: true, payments: true },
  });
}
