import Link from "next/link";
import { notFound } from "next/navigation";

import { LicenseEditor } from "@/components/admin/license-editor";
import { requireTenantPermission } from "@/lib/access";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ workId: string }> };

export default async function LicensingPage({ params }: PageProps) {
  const { tenant } = await requireTenantPermission("catalog.write");
  const { workId } = await params;
  const work = await db.work.findFirst({
    where: { id: workId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!work) notFound();

  return (
    <main className="cms-shell">
      <Link className="text-link cms-back-link" href={"/admin/catalog/works/" + workId}>← Work editor</Link>
      <LicenseEditor workId={workId} />
    </main>
  );
}
