import Link from "next/link";

import { CollectionCurator } from "@/components/admin/collection-curator";
import { requireTenantPermission } from "@/lib/access";

export default async function CollectionCuratorPage() {
  const { tenant } = await requireTenantPermission("catalog.write");

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin/catalog">
        ← Catalog dashboard
      </Link>
      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">Collection curator</p>
          <h1>{tenant.name}</h1>
          <p>
            Create the archive rooms and author the exact sequence in which
            published Works appear inside each one.
          </p>
        </div>
      </header>
      <CollectionCurator />
    </main>
  );
}
