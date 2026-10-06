import Link from "next/link";

import { NewWorkForm } from "@/components/admin/new-work-form";
import { requireTenantPermission } from "@/lib/access";

export default async function NewWorkPage() {
  const { tenant } = await requireTenantPermission("catalog.write");

  return (
    <main className="cms-shell cms-shell--narrow">
      <Link className="text-link" href="/admin/catalog">← Catalog</Link>
      <header className="cms-page-header">
        <p className="eyebrow">New Work</p>
        <h1>Create a source-material Work</h1>
        <p>{tenant.name}</p>
      </header>
      <NewWorkForm />
    </main>
  );
}
