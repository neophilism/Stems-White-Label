import { db } from "@/lib/db";
import {
  domainClaimExpiry,
  domainRoutingConfigured,
  domainRoutingMatches,
  domainTargetsFromEnv,
  generateDomainVerificationToken,
  normalizeCustomHostname,
  ownershipVerified,
  readDomainDns,
  verificationRecordHost,
  verificationRecordValue,
  verifyDomainTls,
} from "@/lib/domains";

function maxDomainsPerTenant() {
  const value = Number(process.env.CUSTOM_DOMAIN_MAX_PER_TENANT ?? 10);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100) : 10;
}

export function domainSetupInstructions(domain: {
  hostname: string;
  verificationToken: string | null;
}) {
  const targets = domainTargetsFromEnv();
  return {
    ownership: domain.verificationToken
      ? {
          type: "TXT" as const,
          host: verificationRecordHost(domain.hostname),
          value: verificationRecordValue(domain.verificationToken),
        }
      : null,
    routing: {
      cnameTarget: targets.cname,
      ipv4Targets: [...targets.ipv4],
      ipv6Targets: [...targets.ipv6],
      configured: domainRoutingConfigured(targets),
    },
  };
}

export async function registerTenantDomain(tenantId: string, value: string) {
  const hostname = normalizeCustomHostname(value);
  const now = new Date();

  const existing = await db.tenantDomain.findUnique({
    where: { hostname },
  });

  if (existing) {
    if (existing.tenantId === tenantId) return existing;

    const claimStillValid =
      existing.ownershipStatus === "VERIFIED" ||
      !existing.claimExpiresAt ||
      existing.claimExpiresAt > now;

    if (claimStillValid) {
      throw new Error("That domain is already registered.");
    }

    await db.tenantDomain.delete({ where: { id: existing.id } });
  }

  const count = await db.tenantDomain.count({ where: { tenantId } });
  if (count >= maxDomainsPerTenant()) {
    throw new Error("This tenant has reached its custom-domain limit.");
  }

  return db.tenantDomain.create({
    data: {
      tenantId,
      hostname,
      verificationToken: generateDomainVerificationToken(),
      ownershipStatus: "PENDING",
      routingStatus: "PENDING",
      tlsStatus: "PENDING",
      claimExpiresAt: domainClaimExpiry(now),
    },
  });
}

export async function verifyTenantDomain(tenantId: string, domainId: string) {
  const domain = await db.tenantDomain.findFirst({
    where: { id: domainId, tenantId },
  });
  if (!domain) throw new Error("Domain not found.");
  if (!domain.verificationToken) {
    throw new Error("Domain is missing an ownership verification token.");
  }

  const now = new Date();
  const snapshot = await readDomainDns(domain.hostname);

  if (!ownershipVerified(snapshot, domain.verificationToken)) {
    return db.tenantDomain.update({
      where: { id: domain.id },
      data: {
        ownershipStatus: "FAILED",
        routingStatus: "PENDING",
        tlsStatus: "PENDING",
        verifiedAt: null,
        routingVerifiedAt: null,
        tlsVerifiedAt: null,
        lastCheckedAt: now,
        lastError:
          "Ownership TXT record was not found. DNS changes can take time to propagate.",
      },
    });
  }

  const targets = domainTargetsFromEnv();
  if (!domainRoutingConfigured(targets)) {
    return db.tenantDomain.update({
      where: { id: domain.id },
      data: {
        ownershipStatus: "VERIFIED",
        verifiedAt: domain.verifiedAt ?? now,
        claimExpiresAt: null,
        routingStatus: "FAILED",
        tlsStatus: "PENDING",
        routingVerifiedAt: null,
        tlsVerifiedAt: null,
        lastCheckedAt: now,
        lastError:
          "Custom-domain routing targets are not configured on the platform.",
      },
    });
  }

  if (!domainRoutingMatches(snapshot, targets)) {
    return db.tenantDomain.update({
      where: { id: domain.id },
      data: {
        ownershipStatus: "VERIFIED",
        verifiedAt: domain.verifiedAt ?? now,
        claimExpiresAt: null,
        routingStatus: "FAILED",
        tlsStatus: "PENDING",
        routingVerifiedAt: null,
        tlsVerifiedAt: null,
        lastCheckedAt: now,
        lastError:
          "Ownership is verified, but the domain is not yet routed to the configured platform target.",
      },
    });
  }

  try {
    await verifyDomainTls(domain.hostname);
    return db.tenantDomain.update({
      where: { id: domain.id },
      data: {
        ownershipStatus: "VERIFIED",
        verifiedAt: domain.verifiedAt ?? now,
        claimExpiresAt: null,
        routingStatus: "READY",
        routingVerifiedAt: domain.routingVerifiedAt ?? now,
        tlsStatus: "READY",
        tlsVerifiedAt: now,
        lastCheckedAt: now,
        lastError: null,
      },
    });
  } catch (error) {
    return db.tenantDomain.update({
      where: { id: domain.id },
      data: {
        ownershipStatus: "VERIFIED",
        verifiedAt: domain.verifiedAt ?? now,
        claimExpiresAt: null,
        routingStatus: "READY",
        routingVerifiedAt: domain.routingVerifiedAt ?? now,
        tlsStatus: "PENDING",
        tlsVerifiedAt: null,
        lastCheckedAt: now,
        lastError:
          "DNS routing is ready, but HTTPS certificate validation is not ready yet: " +
          (error instanceof Error ? error.message : "TLS handshake failed."),
      },
    });
  }
}

export async function makeTenantDomainPrimary(tenantId: string, domainId: string) {
  const domain = await db.tenantDomain.findFirst({
    where: { id: domainId, tenantId },
  });
  if (!domain) throw new Error("Domain not found.");
  if (
    domain.ownershipStatus !== "VERIFIED" ||
    domain.routingStatus !== "READY" ||
    domain.tlsStatus !== "READY"
  ) {
    throw new Error("Only a fully verified HTTPS-ready domain can be primary.");
  }

  return db.$transaction(async (tx) => {
    await tx.tenantDomain.updateMany({
      where: { tenantId, isPrimary: true },
      data: { isPrimary: false },
    });
    return tx.tenantDomain.update({
      where: { id: domain.id },
      data: { isPrimary: true },
    });
  });
}

export async function deleteTenantDomain(tenantId: string, domainId: string) {
  const domain = await db.tenantDomain.findFirst({
    where: { id: domainId, tenantId },
  });
  if (!domain) throw new Error("Domain not found.");
  if (domain.isPrimary) {
    throw new Error("Choose another primary domain before deleting this one.");
  }
  await db.tenantDomain.delete({ where: { id: domain.id } });
}

export async function listTenantDomains(tenantId: string) {
  const domains = await db.tenantDomain.findMany({
    where: {
      tenantId,
      hostname: { notIn: ["localhost", "127.0.0.1", "::1"] },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return domains.map((domain) => ({
    ...domain,
    setup: domainSetupInstructions(domain),
  }));
}
