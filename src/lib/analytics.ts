import { randomUUID } from "node:crypto";

import type { AnalyticsEventType, Prisma, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";

export const ANALYTICS_SESSION_COOKIE = "stems_analytics_session";
export const ANALYTICS_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export const PUBLIC_ANALYTICS_TYPES = new Set<AnalyticsEventType>([
  "WORK_VIEW",
  "PLAYER_PLAY",
  "PLAYER_PAUSE",
  "STEM_MUTE",
  "STEM_UNMUTE",
  "STEM_SOLO",
  "STEM_UNSOLO",
  "ALL_SOURCES",
  "FULL_MIX",
  "REVEAL_START",
  "REVEAL_COMPLETE",
]);

export function normalizeAnalyticsEventId(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 96 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error("Invalid analytics event ID.");
  }
  return value;
}

export function normalizeAnalyticsSessionId(value: unknown) {
  if (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return value;
  }
  return randomUUID();
}

export function normalizeAnalyticsPositionMs(value: unknown) {
  if (value == null) return null;
  const position = Number(value);
  if (
    !Number.isSafeInteger(position) ||
    position < 0 ||
    position > 24 * 60 * 60 * 1000
  ) {
    throw new Error("Invalid analytics playback position.");
  }
  return position;
}

export async function recordSystemAnalyticsEvent(input: {
  tenantId: string;
  type: "CHECKOUT_STARTED" | "PURCHASE_COMPLETED";
  orderId: string;
  sessionId?: string | null;
}) {
  const clientEventId =
    "system:" + input.type.toLowerCase() + ":" + input.orderId;

  return db.analyticsEvent.upsert({
    where: {
      tenantId_clientEventId: {
        tenantId: input.tenantId,
        clientEventId,
      },
    },
    update: {
      sessionId: input.sessionId ?? undefined,
    },
    create: {
      tenantId: input.tenantId,
      type: input.type,
      orderId: input.orderId,
      sessionId: input.sessionId ?? null,
      clientEventId,
    },
  });
}

export async function recordPurchaseAnalytics(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, tenantId: true },
  });
  if (!order) return;

  const checkout = await db.analyticsEvent.findFirst({
    where: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "CHECKOUT_STARTED",
    },
    select: { sessionId: true },
  });

  await recordSystemAnalyticsEvent({
    tenantId: order.tenantId,
    type: "PURCHASE_COMPLETED",
    orderId: order.id,
    sessionId: checkout?.sessionId ?? null,
  });
}

type AnalyticsDb = PrismaClient | Prisma.TransactionClient;

export async function createPublicAnalyticsEvent(
  client: AnalyticsDb,
  input: {
    tenantId: string;
    type: AnalyticsEventType;
    workId: string;
    stemGroupId?: string | null;
    sessionId: string;
    clientEventId: string;
    positionMs?: number | null;
  },
) {
  if (!PUBLIC_ANALYTICS_TYPES.has(input.type)) {
    throw new Error("Analytics event type is not accepted from public clients.");
  }

  try {
    return await client.analyticsEvent.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        workId: input.workId,
        stemGroupId: input.stemGroupId ?? null,
        sessionId: input.sessionId,
        clientEventId: input.clientEventId,
        positionMs: input.positionMs ?? null,
      },
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") return null;
    throw error;
  }
}
