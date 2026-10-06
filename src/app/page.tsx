import { getCurrentTenant } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  return (
    <main className="shell" style={{ padding: "72px 0" }}>
      <p className="eyebrow">White-label source material platform</p>
      <h1 style={{ fontSize: "clamp(3rem, 8vw, 7rem)", margin: "16px 0 24px" }}>
        {tenant?.name ?? "Stems White Label"}
      </h1>
      <p style={{ maxWidth: 660, color: "var(--muted)", lineHeight: 1.6 }}>
        Platform foundation active. Catalog, works, stem groups, licensing, and
        the luxury storefront experience arrive in the next milestones.
      </p>
    </main>
  );
}
