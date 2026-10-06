import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { WorkCard } from "@/components/storefront/work-card";
import {
  getPublishedCollections,
  searchPublishedCatalog,
} from "@/lib/storefront";
import { getCurrentTenant } from "@/lib/tenant";

type ArchivePageProps = {
  searchParams: Promise<{ q?: string; collection?: string }>;
};

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const params = await searchParams;
  const [catalog, collections] = await Promise.all([
    searchPublishedCatalog(tenant.id, {
      q: params.q,
      collectionSlug: params.collection,
    }),
    getPublishedCollections(tenant.id),
  ]);

  const hasFilters = Boolean(catalog.q || catalog.collection);

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell archive-page">
        <header className="archive-page__hero">
          <p className="micro-label">Archive</p>
          <h1>Find a work without flattening the catalog.</h1>
          <p>
            Search is a way into the archive, not the organizing principle.
            Collections remain the primary rooms; this index simply helps locate
            a title, collaborator, source group, or known body of work.
          </p>
        </header>

        <form className="archive-search" action="/archive" method="get">
          <label className="archive-search__query">
            <span>Search the archive</span>
            <input
              defaultValue={catalog.q}
              name="q"
              placeholder="Title, credit, source group, Collection…"
              type="search"
            />
          </label>

          <label>
            <span>Collection</span>
            <select
              defaultValue={catalog.collection?.slug ?? ""}
              name="collection"
            >
              <option value="">All rooms</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.slug}>
                  {collection.title}
                </option>
              ))}
            </select>
          </label>

          <button className="purchase-button" type="submit">
            Search
          </button>

          {hasFilters ? (
            <Link className="archive-search__clear" href="/archive">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="archive-page__summary">
          <p className="micro-label">
            {hasFilters ? "Filtered archive" : "Published works"}
          </p>
          <p>
            {catalog.works.length} {catalog.works.length === 1 ? "Work" : "Works"}
            {catalog.collection ? " in " + catalog.collection.title : ""}
            {catalog.q ? ' matching “' + catalog.q + '”' : ""}
          </p>
        </div>

        {catalog.works.length ? (
          <section className="work-grid archive-work-grid" aria-label="Archive Works">
            {catalog.works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </section>
        ) : (
          <section className="archive-empty">
            <p className="micro-label">No match</p>
            <h2>No published Work fits that route through the archive.</h2>
            <p>
              Try a broader phrase, remove the Collection filter, or enter one of
              the curated rooms instead.
            </p>
            <Link className="text-link" href="/collections">
              Browse Collections →
            </Link>
          </section>
        )}
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
