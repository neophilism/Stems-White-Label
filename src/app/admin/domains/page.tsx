import Link from "next/link";

import { DomainManager } from "@/components/admin/domain-manager";
import { requireTenantPermission } from "@/lib/access";

export default async function DomainsPage() {
  const { tenant } = await requireTenantPermission("tenant.manage");

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin">
        ← Tenant administration
      </Link>

      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">Custom domains</p>
          <h1>{tenant.name}</h1>
          <p>
            Register a branded hostname, prove DNS ownership, verify that it
            routes only to this platform, and confirm a valid HTTPS certificate
            before making it primary.
          </p>
        </div>
      </header>

      <DomainManager />
    </main>
  );
}
