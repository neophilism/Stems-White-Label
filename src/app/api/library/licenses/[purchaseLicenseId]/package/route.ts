import { NextResponse } from "next/server";

import { getCustomerApiAccess } from "@/lib/customer-access";
import { requestDownloadPackage } from "@/lib/download-packages";
import { db } from "@/lib/db";

type RouteProps = { params: Promise<{ purchaseLicenseId: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const access = await getCustomerApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { purchaseLicenseId } = await params;
  const record = await db.downloadPackage.findFirst({
    where: {
      purchaseLicenseId,
      tenantId: access.tenant.id,
      purchaseLicense: { customerId: access.customer.id },
    },
    select: {
      id: true,
      status: true,
      fileName: true,
      sizeBytes: true,
      checksumSha256: true,
      lastError: true,
      completedAt: true,
    },
  });

  return NextResponse.json({
    package: record
      ? { ...record, sizeBytes: record.sizeBytes?.toString() ?? null }
      : null,
  });
}

export async function POST(_request: Request, { params }: RouteProps) {
  const access = await getCustomerApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { purchaseLicenseId } = await params;

  try {
    const record = await requestDownloadPackage({
      tenantId: access.tenant.id,
      customerId: access.customer.id,
      purchaseLicenseId,
    });
    return NextResponse.json({
      package: {
        ...record,
        sizeBytes: record.sizeBytes?.toString() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to request package." },
      { status: 400 },
    );
  }
}
