
import Link from "next/link";

import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { requireTenantPermission } from "@/lib/access";
import {
  ANALYTICS_DAY_OPTIONS,
  getTenantAnalyticsReport,
  normalizeAnalyticsDays,
} from "@/lib/analytics-report";

type PageProps = {
  searchParams: Promise<{ days?: string }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const [{ tenant }, params] = await Promise.all([
    requireTenantPermission("analytics.read"),
    searchParams,
  ]);
  const days = normalizeAnalyticsDays(params.days);
  const report = await getTenantAnalyticsReport(tenant.id, days);

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin">
        ← Tenant administration
      </Link>

      <header className="cms-dashboard-header analytics-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>{tenant.name}</h1>
          <p>
            Engagement, listening-room behavior, conversion, and paid-order
            performance for this tenant.
          </p>
        </div>

        <nav className="analytics-range" aria-label="Analytics period">
          {ANALYTICS_DAY_OPTIONS.map((option) => (
            <Link
              className={option === days ? "analytics-range__active" : ""}
              href={"/admin/analytics?days=" + option}
              key={option}
            >
              {option === 365 ? "1Y" : option + "D"}
            </Link>
          ))}
        </nav>
      </header>

      <AnalyticsDashboard report={report} />
    </main>
  );
}
