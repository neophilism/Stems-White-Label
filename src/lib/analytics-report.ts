
import { db } from "@/lib/db";

export const ANALYTICS_DAY_OPTIONS = [7, 30, 90, 365] as const;

export function normalizeAnalyticsDays(value: unknown) {
  const days = Number(value);
  return ANALYTICS_DAY_OPTIONS.includes(
    days as (typeof ANALYTICS_DAY_OPTIONS)[number],
  )
    ? days
    : 30;
}

function number(value: bigint | number | null | undefined) {
  if (value == null) return 0;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : Number.MAX_SAFE_INTEGER;
}

type DailyRow = {
  day: Date;
  views: bigint;
  plays: bigint;
  reveals: bigint;
  stemInteractions: bigint;
  checkouts: bigint;
  purchases: bigint;
};

type FunnelRow = {
  checkouts: bigint;
  converted: bigint;
};

type RevenueRow = {
  currency: string;
  grossCents: bigint;
  refundedCents: bigint;
  netCents: bigint;
  paidOrders: bigint;
};

type TopWorkRow = {
  workId: string;
  title: string;
  views: bigint;
  uniqueViewSessions: bigint;
  plays: bigint;
  reveals: bigint;
  stemInteractions: bigint;
};

type WorkSalesRow = {
  workId: string;
  paidUnits: bigint;
};

type TopGroupRow = {
  stemGroupId: string;
  label: string;
  workTitle: string;
  interactions: bigint;
  muteChanges: bigint;
  soloChanges: bigint;
};

const uniqueSessionsSql =
  'SELECT COUNT(DISTINCT "sessionId")::bigint AS count ' +
  'FROM "AnalyticsEvent" ' +
  'WHERE "tenantId" = $1 AND "createdAt" >= $2 AND "createdAt" < $3 ' +
  'AND "sessionId" IS NOT NULL';

const funnelSql =
  'SELECT COUNT(*)::bigint AS checkouts, ' +
  'COUNT(*) FILTER (WHERE orders."paidAt" IS NOT NULL ' +
  'AND orders."paidAt" < $3 ' +
  "AND orders.\"status\" IN ('PAID','PARTIALLY_REFUNDED','REFUNDED'))::bigint AS converted " +
  'FROM "AnalyticsEvent" checkout ' +
  'JOIN "Order" orders ON orders."id" = checkout."orderId" ' +
  'WHERE checkout."tenantId" = $1 ' +
  "AND checkout.\"type\" = 'CHECKOUT_STARTED' " +
  'AND checkout."createdAt" >= $2 AND checkout."createdAt" < $3';

const revenueSql =
  'SELECT UPPER(payment."currency") AS currency, ' +
  'COALESCE(SUM(payment."amountCents"), 0)::bigint AS "grossCents", ' +
  'COALESCE(SUM(payment."refundedCents"), 0)::bigint AS "refundedCents", ' +
  'COALESCE(SUM(payment."amountCents" - payment."refundedCents"), 0)::bigint AS "netCents", ' +
  'COUNT(DISTINCT payment."orderId")::bigint AS "paidOrders" ' +
  'FROM "Payment" payment JOIN "Order" orders ON orders."id" = payment."orderId" ' +
  'WHERE payment."tenantId" = $1 ' +
  'AND orders."paidAt" >= $2 AND orders."paidAt" < $3 ' +
  "AND payment.\"status\" IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED') " +
  'GROUP BY UPPER(payment."currency") ORDER BY UPPER(payment."currency")';

const dailySql =
  'SELECT DATE_TRUNC(\'day\', "createdAt") AS day, ' +
  "COUNT(*) FILTER (WHERE \"type\" = 'WORK_VIEW')::bigint AS views, " +
  "COUNT(*) FILTER (WHERE \"type\" = 'PLAYER_PLAY')::bigint AS plays, " +
  "COUNT(*) FILTER (WHERE \"type\" = 'REVEAL_START')::bigint AS reveals, " +
  "COUNT(*) FILTER (WHERE \"type\" IN ('STEM_MUTE','STEM_UNMUTE','STEM_SOLO','STEM_UNSOLO'))::bigint AS \"stemInteractions\", " +
  "COUNT(*) FILTER (WHERE \"type\" = 'CHECKOUT_STARTED')::bigint AS checkouts, " +
  "COUNT(*) FILTER (WHERE \"type\" = 'PURCHASE_COMPLETED')::bigint AS purchases " +
  'FROM "AnalyticsEvent" WHERE "tenantId" = $1 ' +
  'AND "createdAt" >= $2 AND "createdAt" < $3 ' +
  'GROUP BY DATE_TRUNC(\'day\', "createdAt") ORDER BY day ASC';

const topWorksSql =
  'SELECT work."id" AS "workId", work."title" AS title, ' +
  "COUNT(*) FILTER (WHERE event.\"type\" = 'WORK_VIEW')::bigint AS views, " +
  "COUNT(DISTINCT event.\"sessionId\") FILTER (WHERE event.\"type\" = 'WORK_VIEW')::bigint AS \"uniqueViewSessions\", " +
  "COUNT(*) FILTER (WHERE event.\"type\" = 'PLAYER_PLAY')::bigint AS plays, " +
  "COUNT(*) FILTER (WHERE event.\"type\" = 'REVEAL_START')::bigint AS reveals, " +
  "COUNT(*) FILTER (WHERE event.\"type\" IN ('STEM_MUTE','STEM_UNMUTE','STEM_SOLO','STEM_UNSOLO'))::bigint AS \"stemInteractions\" " +
  'FROM "AnalyticsEvent" event JOIN "Work" work ON work."id" = event."workId" ' +
  'WHERE event."tenantId" = $1 AND event."createdAt" >= $2 AND event."createdAt" < $3 ' +
  'AND event."workId" IS NOT NULL ' +
  'GROUP BY work."id", work."title" ' +
  "ORDER BY COUNT(*) FILTER (WHERE event.\"type\" = 'WORK_VIEW') DESC, " +
  "COUNT(*) FILTER (WHERE event.\"type\" = 'PLAYER_PLAY') DESC, work.\"title\" ASC LIMIT 12";

const workSalesSql =
  'SELECT item."workId" AS "workId", COUNT(item."id")::bigint AS "paidUnits" ' +
  'FROM "OrderItem" item JOIN "Order" orders ON orders."id" = item."orderId" ' +
  'WHERE orders."tenantId" = $1 AND orders."paidAt" >= $2 AND orders."paidAt" < $3 ' +
  "AND orders.\"status\" IN ('PAID','PARTIALLY_REFUNDED') " +
  'GROUP BY item."workId"';

const topGroupsSql =
  'SELECT stem."id" AS "stemGroupId", stem."label" AS label, work."title" AS "workTitle", ' +
  'COUNT(*)::bigint AS interactions, ' +
  "COUNT(*) FILTER (WHERE event.\"type\" IN ('STEM_MUTE','STEM_UNMUTE'))::bigint AS \"muteChanges\", " +
  "COUNT(*) FILTER (WHERE event.\"type\" IN ('STEM_SOLO','STEM_UNSOLO'))::bigint AS \"soloChanges\" " +
  'FROM "AnalyticsEvent" event ' +
  'JOIN "StemGroup" stem ON stem."id" = event."stemGroupId" ' +
  'JOIN "Work" work ON work."id" = stem."workId" ' +
  'WHERE event."tenantId" = $1 AND event."createdAt" >= $2 AND event."createdAt" < $3 ' +
  "AND event.\"type\" IN ('STEM_MUTE','STEM_UNMUTE','STEM_SOLO','STEM_UNSOLO') " +
  'GROUP BY stem."id", stem."label", work."title" ' +
  'ORDER BY COUNT(*) DESC, work."title" ASC, stem."label" ASC LIMIT 12';

export async function getTenantAnalyticsReport(
  tenantId: string,
  daysInput: unknown = 30,
) {
  const days = normalizeAnalyticsDays(daysInput);
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const [
    typeCounts,
    uniqueSessionRows,
    funnelRows,
    revenueRows,
    dailyRows,
    topWorkRows,
    workSalesRows,
    topGroupRows,
  ] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["type"],
      where: {
        tenantId,
        createdAt: { gte: from, lt: to },
      },
      _count: { _all: true },
    }),
    db.$queryRawUnsafe<Array<{ count: bigint }>>(
      uniqueSessionsSql,
      tenantId,
      from,
      to,
    ),
    db.$queryRawUnsafe<FunnelRow[]>(funnelSql, tenantId, from, to),
    db.$queryRawUnsafe<RevenueRow[]>(revenueSql, tenantId, from, to),
    db.$queryRawUnsafe<DailyRow[]>(dailySql, tenantId, from, to),
    db.$queryRawUnsafe<TopWorkRow[]>(topWorksSql, tenantId, from, to),
    db.$queryRawUnsafe<WorkSalesRow[]>(workSalesSql, tenantId, from, to),
    db.$queryRawUnsafe<TopGroupRow[]>(topGroupsSql, tenantId, from, to),
  ]);

  const counts = new Map(
    typeCounts.map((row) => [row.type, row._count._all]),
  );
  const salesByWork = new Map(
    workSalesRows.map((row) => [row.workId, number(row.paidUnits)]),
  );

  const checkoutStarts = number(funnelRows[0]?.checkouts);
  const convertedCheckouts = number(funnelRows[0]?.converted);

  return {
    period: {
      days,
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: "UTC",
    },
    totals: {
      views: counts.get("WORK_VIEW") ?? 0,
      uniqueSessions: number(uniqueSessionRows[0]?.count),
      plays: counts.get("PLAYER_PLAY") ?? 0,
      revealStarts: counts.get("REVEAL_START") ?? 0,
      revealCompletes: counts.get("REVEAL_COMPLETE") ?? 0,
      stemInteractions:
        (counts.get("STEM_MUTE") ?? 0) +
        (counts.get("STEM_UNMUTE") ?? 0) +
        (counts.get("STEM_SOLO") ?? 0) +
        (counts.get("STEM_UNSOLO") ?? 0),
      checkoutStarts,
      convertedCheckouts,
      conversionRate:
        checkoutStarts > 0
          ? (convertedCheckouts / checkoutStarts) * 100
          : 0,
    },
    revenue: revenueRows.map((row) => ({
      currency: row.currency,
      grossCents: row.grossCents.toString(),
      refundedCents: row.refundedCents.toString(),
      netCents: row.netCents.toString(),
      paidOrders: number(row.paidOrders),
    })),
    daily: dailyRows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      views: number(row.views),
      plays: number(row.plays),
      reveals: number(row.reveals),
      stemInteractions: number(row.stemInteractions),
      checkouts: number(row.checkouts),
      purchases: number(row.purchases),
    })),
    topWorks: topWorkRows.map((row) => ({
      workId: row.workId,
      title: row.title,
      views: number(row.views),
      uniqueViewSessions: number(row.uniqueViewSessions),
      plays: number(row.plays),
      reveals: number(row.reveals),
      stemInteractions: number(row.stemInteractions),
      paidUnits: salesByWork.get(row.workId) ?? 0,
    })),
    topSourceGroups: topGroupRows.map((row) => ({
      stemGroupId: row.stemGroupId,
      label: row.label,
      workTitle: row.workTitle,
      interactions: number(row.interactions),
      muteChanges: number(row.muteChanges),
      soloChanges: number(row.soloChanges),
    })),
  };
}
