import { db } from "@/lib/db";

export function safeDownloadName(value: string, fallback = "download") {
  const base = value
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim();

  return (base || fallback).slice(0, 180);
}

export function packageFileName(workTitle: string, licenseName: string) {
  const stem = safeDownloadName(
    workTitle + " - " + licenseName,
    "licensed-source-material",
  )
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return stem + ".zip";
}

export function packageStorageKey(input: {
  tenantId: string;
  purchaseLicenseId: string;
  packageId: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "licensed-packages",
    input.purchaseLicenseId,
    input.packageId + ".zip",
  ].join("/");
}

export function renderLicenseDocument(input: {
  orderId: string;
  purchaseLicenseId: string;
  acceptedAt: Date;
  customerEmail: string;
  workTitle: string;
  licenseName: string;
  licenseVersionNumber: number;
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
}) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.currency,
  }).format(input.priceCents / 100);

  return [
    input.workTitle,
    input.licenseName + " — License version " + input.licenseVersionNumber,
    "",
    "Purchase license ID: " + input.purchaseLicenseId,
    "Order ID: " + input.orderId,
    "Accepted: " + input.acceptedAt.toISOString(),
    "Customer: " + input.customerEmail,
    "Price at purchase: " + price,
    "",
    "LICENSED MATERIAL",
    input.selectedStemLabels.length
      ? input.selectedStemLabels.join(", ")
      : "As defined by the purchased license scope.",
    "",
    "RIGHTS SNAPSHOT",
    "Commercial use: " + (input.commercialUseAllowed ? "Permitted" : "Not permitted"),
    "Derivative works: " + (input.derivativesAllowed ? "Permitted" : "Not permitted"),
    "Attribution: " + (input.attributionRequired ? "Required" : "Not required"),
    "Redistribution: " + (input.redistributionAllowed ? "Permitted" : "Not permitted"),
    "Seat limit: " + (input.seatLimit ?? "None specified"),
    "Project limit: " + (input.projectLimit ?? "None specified"),
    "",
    "EXACT ACCEPTED TERMS",
    input.termsText,
    "",
    "This record is generated from the immutable order and license snapshots preserved at purchase.",
    "",
  ].join("\n");
}

export async function getCustomerLibrary(tenantId: string, customerId: string) {
  return db.purchaseLicense.findMany({
    where: {
      tenantId,
      customerId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          currency: true,
          totalCents: true,
          paidAt: true,
          createdAt: true,
        },
      },
      orderItem: {
        select: {
          id: true,
          workTitleSnapshot: true,
          licenseNameSnapshot: true,
          licenseVersionNumber: true,
          unitPriceCents: true,
          currency: true,
          scopeSnapshot: true,
          attributionRequired: true,
          commercialUseAllowed: true,
          derivativesAllowed: true,
          redistributionAllowed: true,
          seatLimit: true,
          projectLimit: true,
          selectedStemLabelsSnapshot: true,
          work: {
            select: {
              slug: true,
              artwork: { select: { id: true, status: true } },
            },
          },
        },
      },
      downloadEntitlements: {
        orderBy: { createdAt: "asc" },
        include: {
          audioAsset: {
            select: {
              id: true,
              status: true,
              kind: true,
              mimeType: true,
              sizeBytes: true,
              storageKey: true,
            },
          },
        },
      },
      downloadPackage: true,
    },
  });
}
