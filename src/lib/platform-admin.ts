import { Prisma } from "@prisma/client";

import { getTenantUsage } from "@/lib/billing";
import { normalizePlatformFeeBps } from "@/lib/commerce";
import { db } from "@/lib/db";

export type PlatformActor = {
  id: string;
  email: string | null;
};

export function normalizePlatformFeatureKey(value: unknown) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(key)) {
    throw new Error(
      "Feature flag key must be 2-64 lowercase letters, numbers, dots, dashes, or underscores.",
    );
  }
  return key;
}

export function normalizePlatformReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 8 || reason.length > 1000) {
    throw new Error("A reason from 8 to 1000 characters is required.");
  }
  return reason;
}

export function normalizeFeatureNote(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Feature note must be text.");
  const note = value.trim();
  if (note.length > 2000) throw new Error("Feature note is too long.");
  return note || null;
}

function auditJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}

async function appendAudit(
  tx: Prisma.TransactionClient,
  input: {
    actor: PlatformActor;
    tenantId?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  return tx.platformAuditLog.create({
    data: {
      actorUserId: input.actor.id,
      actorEmail: input.actor.email,
      tenantId: input.tenantId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
      before: auditJson(input.before),
      after: auditJson(input.after),
    },
  });
}

export async function tenantFeatureEnabled(
  tenantId: string,
  keyInput: string,
  defaultValue = false,
) {
  const key = normalizePlatformFeatureKey(keyInput);
  const flag = await db.tenantFeatureFlag.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { enabled: true },
  });
  return flag?.enabled ?? defaultValue;
}

export async function updatePlatformTenantStatus(input: {
  actor: PlatformActor;
  tenantId: string;
  status: "ACTIVE" | "SUSPENDED";
  reason: unknown;
}) {
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const before = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, slug: true, status: true, isSeed: true },
    });
    if (!before) throw new Error("Tenant not found.");
    if (before.status === input.status) return before;

    const after = await tx.tenant.update({
      where: { id: input.tenantId },
      data: { status: input.status },
      select: { id: true, name: true, slug: true, status: true, isSeed: true },
    });

    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action:
        input.status === "SUSPENDED"
          ? "TENANT_SUSPENDED"
          : "TENANT_REACTIVATED",
      targetType: "Tenant",
      targetId: input.tenantId,
      reason,
      before,
      after,
    });
    return after;
  });
}

export async function updateTenantPlatformFee(input: {
  actor: PlatformActor;
  tenantId: string;
  platformFeeBps: unknown;
  reason: unknown;
}) {
  const fee = normalizePlatformFeeBps(input.platformFeeBps);
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true },
    });
    if (!tenant) throw new Error("Tenant not found.");

    const before = await tx.tenantCommerce.findUnique({
      where: { tenantId: input.tenantId },
      select: { id: true, platformFeeBps: true, stripeAccountId: true },
    });

    const after = await tx.tenantCommerce.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        platformFeeBps: fee,
      },
      update: { platformFeeBps: fee },
      select: { id: true, platformFeeBps: true, stripeAccountId: true },
    });

    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action: "PLATFORM_FEE_UPDATED",
      targetType: "TenantCommerce",
      targetId: after.id,
      reason,
      before,
      after,
    });
    return after;
  });
}

export async function setTenantFeatureFlag(input: {
  actor: PlatformActor;
  tenantId: string;
  key: unknown;
  enabled: unknown;
  note?: unknown;
  reason: unknown;
}) {
  const key = normalizePlatformFeatureKey(input.key);
  if (typeof input.enabled !== "boolean") {
    throw new Error("Feature flag enabled state must be boolean.");
  }
  const note = normalizeFeatureNote(input.note);
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true },
    });
    if (!tenant) throw new Error("Tenant not found.");

    const before = await tx.tenantFeatureFlag.findUnique({
      where: { tenantId_key: { tenantId: input.tenantId, key } },
    });

    const after = await tx.tenantFeatureFlag.upsert({
      where: { tenantId_key: { tenantId: input.tenantId, key } },
      create: {
        tenantId: input.tenantId,
        key,
        enabled: input.enabled,
        note,
      },
      update: {
        enabled: input.enabled,
        note,
      },
    });

    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action: "FEATURE_FLAG_SET",
      targetType: "TenantFeatureFlag",
      targetId: after.id,
      reason,
      before,
      after,
    });
    return after;
  });
}

export async function removeTenantFeatureFlag(input: {
  actor: PlatformActor;
  tenantId: string;
  key: unknown;
  reason: unknown;
}) {
  const key = normalizePlatformFeatureKey(input.key);
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const before = await tx.tenantFeatureFlag.findUnique({
      where: { tenantId_key: { tenantId: input.tenantId, key } },
    });
    if (!before) throw new Error("Feature flag not found.");

    await tx.tenantFeatureFlag.delete({ where: { id: before.id } });
    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action: "FEATURE_FLAG_REMOVED",
      targetType: "TenantFeatureFlag",
      targetId: before.id,
      reason,
      before,
      after: null,
    });
    return before;
  });
}

export async function retryFailedProcessingJob(input: {
  actor: PlatformActor;
  tenantId: string;
  jobId: string;
  reason: unknown;
}) {
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const before = await tx.processingJob.findFirst({
      where: {
        id: input.jobId,
        tenantId: input.tenantId,
        status: "FAILED",
      },
      include: {
        audioAsset: {
          select: {
            id: true,
            workId: true,
            status: true,
            work: { select: { status: true } },
          },
        },
      },
    });
    if (!before) throw new Error("Failed processing job not found.");
    if (before.audioAsset.work.status === "PUBLISHED") {
      throw new Error(
        "Published Works must be unpublished through the tenant CMS before retrying failed source processing.",
      );
    }

    const after = await tx.processingJob.update({
      where: { id: before.id },
      data: {
        status: "QUEUED",
        attempts: 0,
        runAfter: new Date(),
        lockedAt: null,
        lockedBy: null,
        startedAt: null,
        completedAt: null,
        lastError: null,
      },
    });
    await tx.audioAsset.update({
      where: { id: before.audioAsset.id },
      data: { status: "PROCESSING" },
    });
    await tx.work.update({
      where: { id: before.audioAsset.workId },
      data: { status: "PROCESSING" },
    });

    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action: "PROCESSING_JOB_RETRIED",
      targetType: "ProcessingJob",
      targetId: before.id,
      reason,
      before,
      after,
    });
    return after;
  });
}

export async function retryFailedDownloadPackage(input: {
  actor: PlatformActor;
  tenantId: string;
  packageId: string;
  reason: unknown;
}) {
  const reason = normalizePlatformReason(input.reason);

  return db.$transaction(async (tx) => {
    const before = await tx.downloadPackage.findFirst({
      where: {
        id: input.packageId,
        tenantId: input.tenantId,
        status: "FAILED",
      },
    });
    if (!before) throw new Error("Failed download package not found.");

    const after = await tx.downloadPackage.update({
      where: { id: before.id },
      data: {
        status: "QUEUED",
        attempts: 0,
        runAfter: new Date(),
        lockedAt: null,
        lockedBy: null,
        startedAt: null,
        completedAt: null,
        lastError: null,
      },
    });

    await appendAudit(tx, {
      actor: input.actor,
      tenantId: input.tenantId,
      action: "DOWNLOAD_PACKAGE_RETRIED",
      targetType: "DownloadPackage",
      targetId: before.id,
      reason,
      before,
      after,
    });
    return after;
  });
}

const directDeliverySql = [
  'SELECT COALESCE(SUM(ent."downloadsCount" * COALESCE(asset."sizeBytes", 0)), 0)::bigint AS bytes,',
  'COALESCE(SUM(ent."downloadsCount"), 0)::bigint AS requests',
  'FROM "DownloadEntitlement" ent',
  'JOIN "AudioAsset" asset ON asset."id" = ent."audioAssetId"',
].join(" ");

const packageDeliverySql = [
  'SELECT COALESCE(SUM(pkg."downloadsCount" * COALESCE(pkg."sizeBytes", 0)), 0)::bigint AS bytes,',
  'COALESCE(SUM(pkg."downloadsCount"), 0)::bigint AS requests',
  'FROM "DownloadPackage" pkg',
].join(" ");

const tenantDirectDeliverySql = directDeliverySql + ' WHERE ent."tenantId" = $1';
const tenantPackageDeliverySql = packageDeliverySql + ' WHERE pkg."tenantId" = $1';

const payments30dSql = [
  'SELECT UPPER(payment."currency") AS currency,',
  'COALESCE(SUM(payment."amountCents"), 0)::bigint AS "grossCents",',
  'COALESCE(SUM(payment."refundedCents"), 0)::bigint AS "refundedCents",',
  'COALESCE(SUM(payment."amountCents" - payment."refundedCents"), 0)::bigint AS "netCents",',
  'COUNT(DISTINCT payment."orderId")::bigint AS orders',
  'FROM "Payment" payment',
  'JOIN "Order" orders ON orders."id" = payment."orderId"',
  'WHERE orders."paidAt" >= $1',
  "AND payment.\"status\" IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')",
  'GROUP BY UPPER(payment."currency")',
  'ORDER BY UPPER(payment."currency")',
].join(" ");

export async function getPlatformOverview() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    tenantStatuses,
    subscriptionStatuses,
    processingStatuses,
    packageStatuses,
    domainTotal,
    domainReady,
    domainFailed,
    commerceTotal,
    commerceReady,
    audioStorage,
    artworkStorage,
    themeStorage,
    packageStorage,
    directDelivery,
    packageDelivery,
    recentAudit,
    recentFailures,
    recentPackageFailures,
    paymentRows,
  ] = await Promise.all([
    db.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
    db.tenantSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
    db.processingJob.groupBy({ by: ["status"], _count: { _all: true } }),
    db.downloadPackage.groupBy({ by: ["status"], _count: { _all: true } }),
    db.tenantDomain.count(),
    db.tenantDomain.count({
      where: {
        ownershipStatus: "VERIFIED",
        routingStatus: "READY",
        tlsStatus: "READY",
      },
    }),
    db.tenantDomain.count({
      where: {
        OR: [
          { ownershipStatus: "FAILED" },
          { routingStatus: "FAILED" },
          { tlsStatus: "FAILED" },
        ],
      },
    }),
    db.tenantCommerce.count(),
    db.tenantCommerce.count({
      where: {
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        disabledReason: null,
      },
    }),
    db.audioAsset.aggregate({ _sum: { sizeBytes: true } }),
    db.artworkAsset.aggregate({ _sum: { sizeBytes: true } }),
    db.themeAsset.aggregate({ _sum: { sizeBytes: true } }),
    db.downloadPackage.aggregate({ _sum: { sizeBytes: true } }),
    db.$queryRawUnsafe<Array<{ bytes: bigint; requests: bigint }>>(
      directDeliverySql,
    ),
    db.$queryRawUnsafe<Array<{ bytes: bigint; requests: bigint }>>(
      packageDeliverySql,
    ),
    db.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    }),
    db.processingJob.findMany({
      where: { status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        tenant: { select: { name: true, slug: true } },
        audioAsset: { select: { fileName: true } },
      },
    }),
    db.downloadPackage.findMany({
      where: { status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    }),
    db.$queryRawUnsafe<Array<{
      currency: string;
      grossCents: bigint;
      refundedCents: bigint;
      netCents: bigint;
      orders: bigint;
    }>>(payments30dSql, since),
  ]);

  const totalStorageBytes =
    (audioStorage._sum.sizeBytes ?? 0n) +
    (artworkStorage._sum.sizeBytes ?? 0n) +
    (themeStorage._sum.sizeBytes ?? 0n) +
    (packageStorage._sum.sizeBytes ?? 0n);

  const direct = directDelivery[0] ?? { bytes: 0n, requests: 0n };
  const packaged = packageDelivery[0] ?? { bytes: 0n, requests: 0n };

  return {
    tenantStatuses,
    subscriptionStatuses,
    processingStatuses,
    packageStatuses,
    domains: { total: domainTotal, ready: domainReady, failed: domainFailed },
    commerce: { total: commerceTotal, ready: commerceReady },
    storage: {
      totalBytes: totalStorageBytes,
      audioBytes: audioStorage._sum.sizeBytes ?? 0n,
      artworkBytes: artworkStorage._sum.sizeBytes ?? 0n,
      themeBytes: themeStorage._sum.sizeBytes ?? 0n,
      packageBytes: packageStorage._sum.sizeBytes ?? 0n,
    },
    deliveryRequests: {
      directCount: direct.requests,
      directBytesRequested: direct.bytes,
      packageCount: packaged.requests,
      packageBytesRequested: packaged.bytes,
    },
    payments30d: paymentRows,
    recentAudit,
    recentFailures,
    recentPackageFailures,
  };
}

export async function getPlatformTenantList() {
  const tenants = await db.tenant.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isSeed: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          planName: true,
          currentPeriodEnd: true,
          maxStorageBytes: true,
        },
      },
      commerce: {
        select: {
          stripeAccountId: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
          disabledReason: true,
          platformFeeBps: true,
        },
      },
      _count: {
        select: {
          works: true,
          memberships: true,
          domains: true,
          featureFlags: true,
        },
      },
    },
  });

  const [audio, artwork, theme, packages] = await Promise.all([
    db.audioAsset.groupBy({ by: ["tenantId"], _sum: { sizeBytes: true } }),
    db.artworkAsset.groupBy({ by: ["tenantId"], _sum: { sizeBytes: true } }),
    db.themeAsset.groupBy({ by: ["tenantId"], _sum: { sizeBytes: true } }),
    db.downloadPackage.groupBy({ by: ["tenantId"], _sum: { sizeBytes: true } }),
  ]);

  const storage = new Map<string, bigint>();
  for (const rows of [audio, artwork, theme, packages]) {
    for (const row of rows) {
      storage.set(
        row.tenantId,
        (storage.get(row.tenantId) ?? 0n) + (row._sum.sizeBytes ?? 0n),
      );
    }
  }

  return tenants.map((tenant) => ({
    ...tenant,
    storageBytes: storage.get(tenant.id) ?? 0n,
  }));
}

export async function getPlatformTenantDetail(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: true,
      commerce: true,
      domains: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      featureFlags: { orderBy: { key: "asc" } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      processingJobs: {
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 15,
        include: { audioAsset: { select: { fileName: true, workId: true } } },
      },
      downloadPackages: {
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 15,
      },
      platformAuditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!tenant) return null;

  const usage = await getTenantUsage(tenant.id);
  const [directDelivery, packageDelivery, payments] = await Promise.all([
    db.$queryRawUnsafe<Array<{ bytes: bigint; requests: bigint }>>(
      tenantDirectDeliverySql,
      tenant.id,
    ),
    db.$queryRawUnsafe<Array<{ bytes: bigint; requests: bigint }>>(
      tenantPackageDeliverySql,
      tenant.id,
    ),
    db.payment.groupBy({
      by: ["status", "currency"],
      where: { tenantId: tenant.id },
      _count: { _all: true },
      _sum: { amountCents: true, refundedCents: true, platformFeeCents: true },
    }),
  ]);

  return {
    tenant,
    usage,
    deliveryRequests: {
      direct: directDelivery[0] ?? { bytes: 0n, requests: 0n },
      packages: packageDelivery[0] ?? { bytes: 0n, requests: 0n },
    },
    payments,
  };
}
