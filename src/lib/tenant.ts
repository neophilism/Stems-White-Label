import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";

export function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, "");
}

export const resolveTenantByHostname = cache(async (hostname: string) => {
  const normalized = normalizeHostname(hostname);

  const domain = await db.tenantDomain.findUnique({
    where: { hostname: normalized },
    include: { tenant: true },
  });

  if (domain?.tenant.status === "ACTIVE") {
    return domain.tenant;
  }

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  ) {
    const slug = process.env.DEFAULT_TENANT_SLUG ?? "unsealed-records";
    return db.tenant.findFirst({
      where: { slug, status: "ACTIVE" },
    });
  }

  return null;
});

export async function getCurrentTenant() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) return null;

  return resolveTenantByHostname(host);
}
