import { notFound } from "next/navigation";

import { CollectionCard } from "@/components/storefront/collection-card";
import { FeaturedWork } from "@/components/storefront/featured-work";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { WorkCard } from "@/components/storefront/work-card";
import { getStorefrontHome } from "@/lib/storefront";
import { getCurrentTenant } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) notFound();

  const { featuredWork, collections, recentWorks } = await getStorefrontHome(
    tenant.id,
  );

  const secondaryWorks = featuredWork
    ? recentWorks.filter((work) => work.id !== featuredWork.id)
    : recentWorks;

  return (
    <>
      <SiteHeader tenantName={tenant.name} />

      <main>
        <section className="hero storefront-shell">
          <div className="hero__copy">
            <p className="micro-label">Unsealed source archive</p>
            <h1>
              The record is not a file.
              <span>It is a construction.</span>
            </h1>
            <p className="hero__lede">
              Enter the masters, sections, and source materials behind the work.
              Each recording is presented on its own terms, with its musical
              architecture intact.
            </p>
            <a className="text-link" href="#archive">
              Enter the archive <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="display-case" aria-hidden="true">
            <div className="display-case__glass">
              <span className="display-case__index">UR / SOURCE</span>
              <div className="display-case__object">
                <span>MASTER</span>
                <span>SECTIONS</span>
                <span>PROVENANCE</span>
              </div>
              <span className="display-case__caption">
                MUSIC / DISASSEMBLED WITHOUT BEING DIMINISHED
              </span>
            </div>
          </div>
        </section>

        <div className="storefront-shell">
          <FeaturedWork work={featuredWork} />

          {secondaryWorks.length > 0 ? (
            <section className="section-block" aria-labelledby="selected-heading">
              <div className="section-heading">
                <div>
                  <p className="micro-label">Selected works</p>
                  <h2 id="selected-heading">Inside the archive</h2>
                </div>
                <p>
                  Source material presented with the same care as the finished
                  recording.
                </p>
              </div>
              <div className="work-grid">
                {secondaryWorks.map((work) => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            </section>
          ) : null}

          <section
            className="section-block section-block--collections"
            id="collections"
            aria-labelledby="collections-heading"
          >
            <div className="section-heading">
              <div>
                <p className="micro-label">Collections</p>
                <h2 id="collections-heading">Rooms in the archive</h2>
              </div>
              <p>
                Albums, sessions, and curated bodies of source material remain
                distinct rather than collapsing into an endless product grid.
              </p>
            </div>

            {collections.length > 0 ? (
              <div className="collection-list">
                {collections.map((collection, index) => (
                  <CollectionCard
                    collection={collection}
                    index={index}
                    key={collection.id}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-collection-state">
                <span className="empty-collection-state__mark">UR</span>
                <div>
                  <p className="micro-label">Collection room</p>
                  <h3>No published collections</h3>
                  <p>
                    Published collections will occupy this space without
                    changing the storefront structure.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="manifesto" id="licensing">
            <p className="micro-label">Licensing philosophy</p>
            <div className="manifesto__grid">
              <h2>
                Acquire source material without stripping the work of its
                identity.
              </h2>
              <div className="manifesto__body">
                <p>
                  Every source package belongs to a specific recording. Rights,
                  provenance, technical details, and included materials stay
                  attached to that work rather than being reduced to a generic
                  marketplace SKU.
                </p>
                <p>
                  Licensing terms are work-specific and explicit. The storefront
                  is designed around the creator&apos;s catalog—not around
                  comparison shopping between unrelated sellers.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
