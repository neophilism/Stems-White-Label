import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { matchesManagedPlatformHost } from "@/lib/managed-host";

export function normalizeHostname(value: string) {
  const host = value.trim().toLowerCase();
  if (/[\\s,/@\\\\?#]/.test(host)) return "";
  const normalized = host.replace(/:443$/, "").replace(/\\.$/, "");
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalized) || normalized.includes("..")) return "";
  return normalized;
}

export async function resolveTenantByHostnameDirect(hostname: string) {
  const normalized = normalizeHostname(hostname);

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    matchesManagedPlatformHost(hostname, process.env.PLATFORM_DEFAULT_HOSTNAME)
  ) {
    const slug = process.env.DEFAULT_TENANT_SLUG ?? "unsealed-records";
    return db.tenant.findFirst({
      where: { slug, status: "ACTIVE" },
    });
  }

  const domain = await db.tenantDomain.findUnique({
    where: { hostname: normalized },
    include: { tenant: true },
  });

  if (
    domain?.tenant.status === "ACTIVE" &&
    domain.ownershipStatus === "VERIFIED" &&
    domain.routingStatus === "READY" &&
    domain.tlsStatus === "READY"
  ) {
    return domain.tenant;
  }

  return null;
}

export const resolveTenantByHostname = cache(resolveTenantByHostnameDirect);

export async function getCurrentTenant() {
  const requestHeaders = await headers();
  const host = process.env.TRUST_X_FORWARDED_HOST === "true"
    ? requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
    : requestHeaders.get("host");

  if (!host) return null;
  return resolveTenantByHostname(host);
}


export const getPrimaryTenantDomain = cache(async (tenantId: string) => {
  return db.tenantDomain.findFirst({
    where: {
      tenantId,
      isPrimary: true,
      ownershipStatus: "VERIFIED",
      routingStatus: "READY",
      tlsStatus: "READY",
    },
    select: { hostname: true },
  });
});
