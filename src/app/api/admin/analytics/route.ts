
import { NextResponse } from "next/server";

import { getTenantApiAccess } from "@/lib/access";
import {
  getTenantAnalyticsReport,
  normalizeAnalyticsDays,
} from "@/lib/analytics-report";

export async function GET(request: Request) {
  const access = await getTenantApiAccess("analytics.read");
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const days = normalizeAnalyticsDays(
    new URL(request.url).searchParams.get("days"),
  );
  const report = await getTenantAnalyticsReport(access.tenant.id, days);

  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
