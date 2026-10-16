import Link from "next/link";

import { BillingManager } from "@/components/admin/billing-manager";
import { requireTenantPermission } from "@/lib/access";

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const [{ tenant }, params] = await Promise.all([
    requireTenantPermission("tenant.manage"),
    searchParams,
  ]);

  const checkoutResult =
    params.checkout === "success" || params.checkout === "canceled"
      ? params.checkout
      : null;

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin">
        ← Tenant administration
      </Link>

      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">SaaS billing</p>
          <h1>{tenant.name}</h1>
          <p>
            Manage the platform subscription, trials, plan changes, usage limits,
            invoices, and billing details independently from the tenant&apos;s
            Merchant payments merchant account.
          </p>
        </div>
      </header>

      <BillingManager checkoutResult={checkoutResult} />
    </main>
  );
}
