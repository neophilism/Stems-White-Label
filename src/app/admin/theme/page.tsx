import Link from "next/link";

import { ThemeEditor } from "@/components/admin/theme-editor";
import { requireTenantPermission } from "@/lib/access";

export default async function ThemePage() {
  const { tenant } = await requireTenantPermission("catalog.write");

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin">
        ← Tenant administration
      </Link>
      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">White-label theme engine</p>
          <h1>{tenant.name}</h1>
          <p>
            Control the public identity without changing the catalog, commerce,
            playback, or delivery architecture underneath it.
          </p>
        </div>
      </header>
      <ThemeEditor />
    </main>
  );
}
