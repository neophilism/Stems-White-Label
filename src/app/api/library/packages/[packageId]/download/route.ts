import { NextResponse } from "next/server";

import { getCustomerApiAccess } from "@/lib/customer-access";
import { createPrivateDownloadUrl } from "@/lib/object-storage";
import { db } from "@/lib/db";

type RouteProps = { params: Promise<{ packageId: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const access = await getCustomerApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { packageId } = await params;
  const record = await db.downloadPackage.findFirst({
    where: {
      id: packageId,
      tenantId: access.tenant.id,
      status: "READY",
      storageKey: { not: null },
      purchaseLicense: {
        customerId: access.customer.id,
        revokedAt: null,
        order: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      },
    },
  });

  if (!record?.storageKey) {
    return NextResponse.json({ error: "Download package not found." }, { status: 404 });
  }

  const url = await createPrivateDownloadUrl({
    storageKey: record.storageKey,
    fileName: record.fileName,
    contentType: "application/zip",
  });

  await db.downloadPackage.update({
    where: { id: record.id },
    data: {
      downloadsCount: { increment: 1 },
      lastDownloadedAt: new Date(),
    },
  });

  return NextResponse.redirect(url, 303);
}
