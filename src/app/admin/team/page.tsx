import Link from "next/link";

import { TeamManager } from "@/components/admin/team-manager";
import { requireTenantPermission } from "@/lib/access";

export default async function TeamPage() {
  const { tenant } = await requireTenantPermission("members.manage");

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin">
        ← Tenant administration
      </Link>

      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">Team accounts</p>
          <h1>{tenant.name}</h1>
          <p>
            Invite staff, assign tenant-scoped roles, revoke access immediately,
            and review the immutable team-access history.
          </p>
        </div>
      </header>

      <TeamManager />
    </main>
  );
}
