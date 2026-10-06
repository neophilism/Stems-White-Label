import Link from "next/link";

import { requireTenantPermission } from "@/lib/access";
import { db } from "@/lib/db";

export default async function CatalogAdminPage() {
  const { tenant } = await requireTenantPermission("catalog.read");

  const [works, artistCount, collectionCount, stemGroupCount] = await Promise.all([
    db.work.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { stemGroups: true, audioAssets: true } },
      },
    }),
    db.artist.count({ where: { tenantId: tenant.id } }),
    db.collection.count({ where: { tenantId: tenant.id } }),
    db.stemGroup.count({ where: { work: { tenantId: tenant.id } } }),
  ]);

  return (
    <main className="cms-shell">
      <header className="cms-dashboard-header">
        <div>
          <p className="eyebrow">Catalog CMS</p>
          <h1>{tenant.name}</h1>
          <p>Build, process, preview, and publish source-material Works without developer intervention.</p>
        </div>
        <Link className="cms-primary-button" href="/admin/catalog/works/new">
          + New Work
        </Link>
      </header>

      <div className="cms-metric-grid">
        <div><span>Works</span><strong>{works.length}</strong></div>
        <div><span>Artists</span><strong>{artistCount}</strong></div>
        <div><span>Collections</span><strong>{collectionCount}</strong></div>
        <div><span>Source groups</span><strong>{stemGroupCount}</strong></div>
      </div>

      <section className="cms-catalog-list">
        <div className="cms-catalog-list__head">
          <span>Work</span>
          <span>Status</span>
          <span>Sources</span>
          <span>Updated</span>
          <span />
        </div>
        {works.length ? (
          works.map((work) => (
            <article className="cms-catalog-row" key={work.id}>
              <div>
                <strong>{work.title}</strong>
                <span>{work.slug}</span>
              </div>
              <span className={"cms-status cms-status--" + work.status.toLowerCase()}>
                {work.status}
              </span>
              <span>{work._count.stemGroups} groups · {work._count.audioAssets} audio assets</span>
              <span>{work.updatedAt.toLocaleDateString()}</span>
              <Link href={"/admin/catalog/works/" + work.id}>Edit →</Link>
            </article>
          ))
        ) : (
          <div className="cms-empty-state">
            <h2>No Works yet.</h2>
            <p>Create the first Work and build its source cabinet.</p>
            <Link className="cms-primary-button" href="/admin/catalog/works/new">
              Create first Work
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
