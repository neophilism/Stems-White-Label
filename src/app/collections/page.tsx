import { notFound } from "next/navigation";

import { CollectionCard } from "@/components/storefront/collection-card";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getPublishedCollections } from "@/lib/storefront";
import { getCurrentTenant } from "@/lib/tenant";

export default async function CollectionsPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const collections = await getPublishedCollections(tenant.id);

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell collections-index">
        <header className="collections-index__hero">
          <p className="micro-label">Collections</p>
          <h1>Rooms in the source archive.</h1>
          <p>
            Albums, sessions, periods, collaborators, and other creator-defined
            bodies of work remain distinct. Each room has its own sequence and
            editorial logic.
          </p>
        </header>

        {collections.length ? (
          <div className="collection-list">
            {collections.map((collection, index) => (
              <CollectionCard
                collection={{
                  slug: collection.slug,
                  title: collection.title,
                  description: collection.description,
                  _count: { works: collection.publishedWorkCount },
                }}
                index={index}
                key={collection.id}
              />
            ))}
          </div>
        ) : (
          <section className="empty-collection-state">
            <span className="empty-collection-state__mark">UR</span>
            <div>
              <p className="micro-label">Collection rooms</p>
              <h2>No published Collections yet.</h2>
            </div>
          </section>
        )}
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
