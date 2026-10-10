import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEALTH_TIMEOUT_MS = 3000;

export function GET() {
  return NextResponse.json(
    { ok: true, service: "stems-white-label" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}

/**
 * A separate readiness probe: a live HTTP listener alone does not mean that
 * the storefront can read catalog and fulfillment state from Postgres.
 * Do not reveal database connection strings, table names, or exception details.
 */
export async function readinessResponse(
  checkDatabase: () => Promise<unknown> = () => db.$queryRaw`SELECT 1`,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      checkDatabase(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timeout")), HEALTH_TIMEOUT_MS);
      }),
    ]);

    return NextResponse.json(
      { ok: true, service: "stems-white-label", dependencies: { database: "ready" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "stems-white-label", dependencies: { database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
