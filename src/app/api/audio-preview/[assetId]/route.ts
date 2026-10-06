import { NextResponse } from "next/server";

import {
  buildPreviewOriginUrl,
  verifyPreviewAccess,
} from "@/lib/audio-preview-access";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

type PreviewRouteProps = {
  params: Promise<{ assetId: string }>;
};

function safeRange(value: string | null) {
  if (!value || !/^bytes=\d*-\d*$/.test(value)) return null;
  return value;
}

async function proxyPreview(request: Request, assetId: string) {
  const requestUrl = new URL(request.url);
  const expires = Number(requestUrl.searchParams.get("exp"));
  const signature = requestUrl.searchParams.get("sig") || "";

  if (!verifyPreviewAccess(assetId, expires, signature)) {
    return NextResponse.json(
      { error: "Preview link expired or invalid." },
      { status: 403 },
    );
  }

  const tenant = await getCurrentTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
  }

  const asset = await db.audioAsset.findFirst({
    where: {
      id: assetId,
      tenantId: tenant.id,
      kind: "PREVIEW",
      status: "READY",
      storageKey: { not: null },
      work: {
        status: "PUBLISHED",
      },
    },
    select: {
      storageKey: true,
      mimeType: true,
    },
  });

  if (!asset?.storageKey) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const originBaseUrl = process.env.PREVIEW_ORIGIN_BASE_URL;

  if (!originBaseUrl) {
    return NextResponse.json(
      { error: "Preview origin is not configured." },
      { status: 503 },
    );
  }

  let originUrl: URL;

  try {
    originUrl = buildPreviewOriginUrl(originBaseUrl, asset.storageKey);
  } catch {
    return NextResponse.json({ error: "Invalid preview asset." }, { status: 500 });
  }

  const headers = new Headers();
  const range = safeRange(request.headers.get("range"));
  const bearerToken = process.env.PREVIEW_ORIGIN_BEARER_TOKEN;

  if (range) headers.set("Range", range);
  if (bearerToken) headers.set("Authorization", "Bearer " + bearerToken);

  const upstream = await fetch(originUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    console.error("Preview origin returned", upstream.status, originUrl.origin);
    return NextResponse.json(
      { error: "Preview source is unavailable." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const responseHeaders = new Headers();
  const contentType =
    upstream.headers.get("content-type") ||
    asset.mimeType ||
    "application/octet-stream";

  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("Accept-Ranges", "bytes");

  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, { params }: PreviewRouteProps) {
  const { assetId } = await params;
  return proxyPreview(request, assetId);
}

export async function HEAD(request: Request, { params }: PreviewRouteProps) {
  const { assetId } = await params;
  return proxyPreview(request, assetId);
}
