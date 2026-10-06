import Link from "next/link";

import { requireTenantPermission } from "@/lib/access";

export default async function AdminPage() {
  const { tenant, membership, session } =
    await requireTenantPermission("catalog.read");

  return (
    <main className="shell" style={{ padding: "56px 0" }}>
      <p className="eyebrow">Tenant administration</p>
      <h1 style={{ fontSize: "3rem", marginBottom: 32 }}>{tenant.name}</h1>
      <section className="card">
        <p>
          Signed in as <strong>{session.user?.email ?? session.user?.name}</strong>
        </p>
        <p>
          Role: <strong>{membership.role}</strong>
        </p>
        <p style={{ color: "var(--muted)" }}>
          The core catalog domain is active. Publishing and editing interfaces
          arrive in later milestones.
        </p>
        <Link href="/admin/catalog">View catalog foundation</Link>
      </section>
    </main>
  );
}
