import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { WorkCard } from "@/components/storefront/work-card";
import { getPublishedCollection } from "@/lib/storefront";
import { getCurrentTenant } from "@/lib/tenant";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CollectionPage({ params }: CollectionPageProps) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const { slug } = await params;
  const collection = await getPublishedCollection(tenant.id, slug);
  if (!collection) notFound();

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell collection-page">
        <Link className="text-link collection-page__back" href="/#collections">
          ← Return to archive
        </Link>

        <header className="collection-page__hero">
          <p className="micro-label">Collection</p>
          <h1>{collection.title}</h1>
          {collection.description ? <p>{collection.description}</p> : null}
          <div className="collection-page__rule">
            <span>{collection.works.length} works</span>
            <span>Unsealed source archive</span>
          </div>
        </header>

        {collection.works.length > 0 ? (
          <section className="work-grid work-grid--collection">
            {collection.works.map(({ work }) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </section>
        ) : (
          <section className="empty-collection-state">
            <span className="empty-collection-state__mark">UR</span>
            <div>
              <p className="micro-label">Collection room</p>
              <h2>No published works in this collection</h2>
            </div>
          </section>
        )}
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
