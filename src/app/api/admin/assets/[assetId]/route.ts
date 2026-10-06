import { NextResponse } from "next/server";

import { getTenantApiAccess } from "@/lib/access";
import { db } from "@/lib/db";

type AssetStatusRouteProps = {
  params: Promise<{ assetId: string }>;
};

export async function GET(_request: Request, { params }: AssetStatusRouteProps) {
  const access = await getTenantApiAccess("catalog.read");

  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { assetId } = await params;
  const asset = await db.audioAsset.findFirst({
    where: {
      id: assetId,
      tenantId: access.tenant.id,
    },
    include: {
      processingJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      derivatives: {
        where: { kind: "PREVIEW" },
        select: {
          id: true,
          status: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          durationMs: true,
          waveformStorageKey: true,
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const serialized = {
    ...asset,
    sizeBytes: asset.sizeBytes?.toString() ?? null,
    derivatives: asset.derivatives.map((derivative) => ({
      ...derivative,
      sizeBytes: derivative.sizeBytes?.toString() ?? null,
    })),
  };

  return NextResponse.json(serialized, {
    headers: { "Cache-Control": "no-store" },
  });
}
