import { NextResponse } from "next/server";

import { getCustomerApiAccess } from "@/lib/customer-access";
import { createPrivateDownloadUrl } from "@/lib/object-storage";
import { db } from "@/lib/db";

type RouteProps = { params: Promise<{ entitlementId: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const access = await getCustomerApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { entitlementId } = await params;
  const entitlement = await db.downloadEntitlement.findFirst({
    where: {
      id: entitlementId,
      tenantId: access.tenant.id,
      purchaseLicense: {
        customerId: access.customer.id,
        revokedAt: null,
        order: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      },
    },
    include: {
      audioAsset: {
        select: {
          status: true,
          storageKey: true,
          mimeType: true,
        },
      },
    },
  });

  if (!entitlement) {
    return NextResponse.json({ error: "Download entitlement not found." }, { status: 404 });
  }
  if (
    entitlement.audioAsset.status !== "READY" ||
    !entitlement.audioAsset.storageKey
  ) {
    return NextResponse.json(
      { error: "Licensed source file is temporarily unavailable." },
      { status: 409 },
    );
  }

  const url = await createPrivateDownloadUrl({
    storageKey: entitlement.audioAsset.storageKey,
    fileName: entitlement.fileNameSnapshot,
    contentType: entitlement.audioAsset.mimeType,
  });

  await db.downloadEntitlement.update({
    where: { id: entitlement.id },
    data: {
      downloadsCount: { increment: 1 },
      lastDownloadedAt: new Date(),
    },
  });

  return NextResponse.redirect(url, 303);
}
