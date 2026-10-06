import { NextResponse } from "next/server";

import { getCustomerApiAccess } from "@/lib/customer-access";
import { renderLicenseDocument, safeDownloadName } from "@/lib/download-delivery";
import { db } from "@/lib/db";

type RouteProps = { params: Promise<{ purchaseLicenseId: string }> };

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export async function GET(_request: Request, { params }: RouteProps) {
  const access = await getCustomerApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { purchaseLicenseId } = await params;
  const purchase = await db.purchaseLicense.findFirst({
    where: {
      id: purchaseLicenseId,
      tenantId: access.tenant.id,
      customerId: access.customer.id,
    },
    include: {
      customer: { select: { email: true } },
      order: { select: { id: true } },
      orderItem: true,
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: "License record not found." }, { status: 404 });
  }

  const text = renderLicenseDocument({
    orderId: purchase.order.id,
    purchaseLicenseId: purchase.id,
    acceptedAt: purchase.acceptedAt,
    customerEmail: purchase.customer.email,
    workTitle: purchase.orderItem.workTitleSnapshot,
    licenseName: purchase.orderItem.licenseNameSnapshot,
    licenseVersionNumber: purchase.orderItem.licenseVersionNumber,
    priceCents: purchase.orderItem.unitPriceCents,
    currency: purchase.orderItem.currency,
    termsText: purchase.termsTextSnapshot,
    attributionRequired: purchase.orderItem.attributionRequired,
    commercialUseAllowed: purchase.orderItem.commercialUseAllowed,
    derivativesAllowed: purchase.orderItem.derivativesAllowed,
    redistributionAllowed: purchase.orderItem.redistributionAllowed,
    seatLimit: purchase.orderItem.seatLimit,
    projectLimit: purchase.orderItem.projectLimit,
    selectedStemLabels: stringArray(
      purchase.orderItem.selectedStemLabelsSnapshot,
    ),
  });

  const fileName = safeDownloadName(
    purchase.orderItem.workTitleSnapshot +
      " - " +
      purchase.orderItem.licenseNameSnapshot +
      " - License.txt",
    "License.txt",
  );

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + fileName.replace(/"/g, "_") + '"',
      "Cache-Control": "private, no-store",
    },
  });
}
