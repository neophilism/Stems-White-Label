import Link from "next/link";

import { requireTenantPermission } from "@/lib/access";

export default async function AdminPage() {
  const { tenant, membership, session } =
    await requireTenantPermission("catalog.read");

  return (
    <main className="cms-shell cms-shell--narrow">
      <p className="eyebrow">Tenant administration</p>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 400, marginBottom: 16 }}>
        {tenant.name}
      </h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        Signed in as {session.user?.email ?? session.user?.name}. Role: {membership.role}.
      </p>

      <section className="cms-panel">
        <p className="eyebrow">Brand & presentation</p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "2.8rem", fontWeight: 400 }}>
          White-label theme
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Manage tenant logo, favicon, typography, palette, density, hero,
          navigation, footer treatment, and storefront theme presets.
        </p>
        <Link className="cms-primary-button" href="/admin/theme">
          Open Theme Engine
        </Link>
      </section>

      <section className="cms-panel">
        <p className="eyebrow">Catalog</p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "2.8rem", fontWeight: 400 }}>
          Source-material CMS
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Create Works, manage source groups, upload masters and stems, edit credits
          and editorial material, choreograph Reveal the Record, preview, and publish.
        </p>
        <Link className="cms-primary-button" href="/admin/catalog">
          Open Catalog CMS
        </Link>
      </section>
    </main>
  );
}
