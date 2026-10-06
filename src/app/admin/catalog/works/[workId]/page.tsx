import Link from "next/link";
import { notFound } from "next/navigation";

import { CatalogWorkEditor } from "@/components/admin/catalog-work-editor";
import { requireTenantPermission } from "@/lib/access";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ workId: string }> };

export default async function WorkEditorPage({ params }: PageProps) {
  const { tenant } = await requireTenantPermission("catalog.write");
  const { workId } = await params;

  const exists = await db.work.count({
    where: { id: workId, tenantId: tenant.id },
  });
  if (!exists) notFound();

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href="/admin/catalog">← Catalog</Link>
      <CatalogWorkEditor workId={workId} />
    </main>
  );
}
