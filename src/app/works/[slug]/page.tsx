import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkPanel } from "@/components/storefront/artwork-panel";
import { LicenseOptions } from "@/components/storefront/license-options";
import { ListeningRoom } from "@/components/storefront/listening-room";
import { NarrativeSections } from "@/components/storefront/narrative-sections";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SourceCabinet } from "@/components/storefront/source-cabinet";
import { WorkLedger } from "@/components/storefront/work-ledger";
import { WorkCard } from "@/components/storefront/work-card";
import { WorkMetadata } from "@/components/storefront/work-metadata";
import { WorkViewTracker } from "@/components/storefront/work-view-tracker";
import {
  getPublishedWork,
  getRelatedPublishedWorks,
} from "@/lib/storefront";
import { getCurrentTenant } from "@/lib/tenant";

type WorkPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: WorkPageProps): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (!tenant) return {};

  const { slug } = await params;
  const work = await getPublishedWork(tenant.id, slug);

  if (!work) return {};

  return {
    title: work.title,
    description:
      work.description ??
      "Source material, credits, provenance, and musical architecture for " +
        work.title +
        ".",
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const { slug } = await params;
  const work = await getPublishedWork(tenant.id, slug);
  if (!work) notFound();

  const stemLabels = work.stemGroups.map((stem) => stem.label);
  const hasFullMix = work.audioAssets.some(
    (asset) =>
      asset.kind === "PREVIEW" &&
      asset.stemGroupId === null &&
      Boolean(asset.storageKey),
  );
  const playerSourceGroups = work.stemGroups.map((stem) => ({
    id: stem.id,
    label: stem.label,
    hasPreview: stem.audioAssets.some(
      (asset) => asset.kind === "PREVIEW" && Boolean(asset.storageKey),
    ),
  }));
  const revealSequence = work.revealSequences[0] ?? null;
  const relatedWorks = await getRelatedPublishedWorks(
    tenant.id,
    work.id,
    work.collections.map((entry) => entry.collection.id),
  );

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <WorkViewTracker workSlug={work.slug} />
      <main className="work-page">
        <div className="storefront-shell">
          <Link className="text-link work-page__back" href="/#archive">
            ← Return to archive
          </Link>

          <header className="work-page__hero">
            <div className="work-page__hero-copy">
              <p className="micro-label">Source work</p>
              <p className="work-credit">
                {work.primaryArtist?.displayName ??
                  work.primaryArtist?.name ??
                  tenant.name}
              </p>
              <h1>{work.title}</h1>
              {work.subtitle ? (
                <p className="work-page__subtitle">{work.subtitle}</p>
              ) : null}
              <WorkMetadata
                bpm={work.bpm}
                durationMs={work.durationMs}
                musicalKey={work.musicalKey}
                stemLabels={stemLabels}
              />
              {work.description ? (
                <p className="work-page__description">{work.description}</p>
              ) : null}
              {work.stemGroups.length > 0 ? (
                <a className="text-link" href="#source-material">
                  Examine source groups <span aria-hidden="true">↓</span>
                </a>
              ) : null}
            </div>

            <ArtworkPanel
              title={work.title}
              catalogNumber={work.catalogNumber}
              artworkUrl={work.artworkUrl}
              size="hero"
            />
          </header>

          <ListeningRoom
            durationMs={work.durationMs}
            hasFullMix={hasFullMix}
            revealSequenceName={revealSequence?.name ?? null}
            sourceGroups={playerSourceGroups}
            workSlug={work.slug}
          />

          <NarrativeSections sections={work.sections} />

          <SourceCabinet stemGroups={work.stemGroups} />

          <LicenseOptions products={work.licenseProducts} />

          <WorkLedger
            audioAssets={work.audioAssets}
            bpm={work.bpm}
            catalogNumber={work.catalogNumber}
            collections={work.collections}
            credits={work.credits}
            durationMs={work.durationMs}
            musicalKey={work.musicalKey}
            publishedAt={work.publishedAt}
          />

          {relatedWorks.length ? (
            <section className="related-works">
              <div className="section-heading">
                <div>
                  <p className="micro-label">Continue through the archive</p>
                  <h2>Related by Collection.</h2>
                </div>
                <p>
                  These Works share one or more creator-curated rooms with the
                  current recording. This is editorial proximity, not an
                  algorithmic recommendation feed.
                </p>
              </div>
              <div className="work-grid">
                {relatedWorks.map((related) => (
                  <WorkCard key={related.id} work={related} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="work-page__closing">
            <p className="micro-label">{tenant.name} source archive</p>
            <h2>The finished record is one view of the material.</h2>
            <p>
              This archive preserves another: the musical architecture from
              which the record was built.
            </p>
            <Link className="text-link" href="/archive">
              Continue through the archive <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
