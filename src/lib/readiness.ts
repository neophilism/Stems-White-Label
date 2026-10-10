import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const HEALTH_TIMEOUT_MS = 3000;

/** Bounded, non-sensitive database readiness test for hosting and Engine Room. */
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
