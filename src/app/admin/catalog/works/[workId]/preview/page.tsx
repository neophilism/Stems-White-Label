import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkPanel } from "@/components/storefront/artwork-panel";
import { NarrativeSections } from "@/components/storefront/narrative-sections";
import { SourceCabinet } from "@/components/storefront/source-cabinet";
import { WorkLedger } from "@/components/storefront/work-ledger";
import { WorkMetadata } from "@/components/storefront/work-metadata";
import { requireTenantPermission } from "@/lib/access";
import { signedArtworkPath } from "@/lib/artwork";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ workId: string }> };

export default async function DraftWorkPreviewPage({ params }: PageProps) {
  const { tenant } = await requireTenantPermission("catalog.read");
  const { workId } = await params;

  const work = await db.work.findFirst({
    where: { id: workId, tenantId: tenant.id },
    include: {
      primaryArtist: true,
      artwork: true,
      credits: { orderBy: { position: "asc" } },
      sections: { orderBy: { position: "asc" } },
      stemGroups: {
        orderBy: { position: "asc" },
        include: {
          children: {
            orderBy: { position: "asc" },
            select: { id: true, label: true },
          },
          audioAssets: {
            where: { status: "READY" },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      audioAssets: {
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
      },
      collections: {
        orderBy: { position: "asc" },
        include: { collection: true },
      },
    },
  });

  if (!work) notFound();

  const artworkUrl =
    work.artwork?.status === "READY" ? signedArtworkPath(work.artwork.id) : null;
  const stemLabels = work.stemGroups.map((stem) => stem.label);

  return (
    <main className="work-page">
      <div className="cms-preview-banner">
        <div>
          <strong>CMS Preview</strong>
          <span>{work.status} · not a public storefront route</span>
        </div>
        <Link href={"/admin/catalog/works/" + work.id}>Return to editor →</Link>
      </div>

      <div className="storefront-shell">
        <header className="work-page__hero">
          <div className="work-page__hero-copy">
            <p className="micro-label">Source work preview</p>
            <p className="work-credit">
              {work.primaryArtist?.displayName ??
                work.primaryArtist?.name ??
                tenant.name}
            </p>
            <h1>{work.title}</h1>
            {work.subtitle ? <p className="work-page__subtitle">{work.subtitle}</p> : null}
            <WorkMetadata
              bpm={work.bpm}
              durationMs={work.durationMs}
              musicalKey={work.musicalKey}
              stemLabels={stemLabels}
            />
            {work.description ? (
              <p className="work-page__description">{work.description}</p>
            ) : null}
          </div>

          <ArtworkPanel
            artworkUrl={artworkUrl}
            catalogNumber={work.catalogNumber}
            size="hero"
            title={work.title}
          />
        </header>

        <section className="cms-preview-listening">
          <p className="micro-label">Listening room</p>
          <h2>Interactive audio is validated after publication.</h2>
          <p>
            This authenticated preview renders the public editorial presentation
            without exposing unpublished preview audio through public player routes.
          </p>
        </section>

        <NarrativeSections sections={work.sections} />
        <SourceCabinet stemGroups={work.stemGroups} />
        <WorkLedger
          audioAssets={work.audioAssets}
          bpm={work.bpm}
          catalogNumber={work.catalogNumber}
          collections={work.collections.filter(
            (entry) => entry.collection.status === "PUBLISHED",
          )}
          credits={work.credits}
          durationMs={work.durationMs}
          musicalKey={work.musicalKey}
          publishedAt={work.publishedAt}
        />
      </div>
    </main>
  );
}
