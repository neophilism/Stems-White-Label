import { requireTenantPermission } from "@/lib/access";
import { db } from "@/lib/db";

export default async function CatalogAdminPage() {
  const { tenant } = await requireTenantPermission("catalog.read");

  const [artistCount, collectionCount, workCount, stemGroupCount] =
    await Promise.all([
      db.artist.count({ where: { tenantId: tenant.id } }),
      db.collection.count({ where: { tenantId: tenant.id } }),
      db.work.count({ where: { tenantId: tenant.id } }),
      db.stemGroup.count({ where: { work: { tenantId: tenant.id } } }),
    ]);

  const metrics = [
    ["Artists", artistCount],
    ["Collections", collectionCount],
    ["Works", workCount],
    ["Stem groups", stemGroupCount],
  ] as const;

  return (
    <main className="shell" style={{ padding: "56px 0" }}>
      <p className="eyebrow">Catalog foundation</p>
      <h1 style={{ fontSize: "3rem", marginBottom: 32 }}>{tenant.name}</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {metrics.map(([label, value]) => (
          <section className="card" key={label}>
            <p className="eyebrow">{label}</p>
            <strong style={{ fontSize: "2.5rem" }}>{value}</strong>
          </section>
        ))}
      </div>
      <p style={{ color: "var(--muted)", marginTop: 32, maxWidth: 720 }}>
        Stem groups are creator-defined musical sections. They can represent
        drums, vocals, Horn Section 1, Horn Section 2, an orchestra bus, or any
        other meaningful source grouping without a fixed instrument taxonomy.
      </p>
    </main>
  );
}
