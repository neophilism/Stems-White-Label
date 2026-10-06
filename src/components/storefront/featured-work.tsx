import Link from "next/link";

import { ArtworkPanel } from "@/components/storefront/artwork-panel";
import { WorkMetadata } from "@/components/storefront/work-metadata";

type FeaturedWorkProps = {
  work:
    | {
        slug: string;
        title: string;
        subtitle: string | null;
        description: string | null;
        catalogNumber: string | null;
        bpm: { toString(): string } | null;
        musicalKey: string | null;
        durationMs: number | null;
        primaryArtist: { displayName: string | null; name: string } | null;
        stemGroups: Array<{ id: string; label: string }>;
        artworkUrl?: string | null;
      }
    | null;
};

export function FeaturedWork({ work }: FeaturedWorkProps) {
  if (!work) {
    return (
      <section className="featured-work featured-work--empty" id="archive">
        <div className="featured-work__copy">
          <p className="micro-label">Archive / No. 00</p>
          <h2>The cabinet is ready.</h2>
          <p>
            No source works are published yet. The storefront is prepared to
            present the first release without changing the visual system.
          </p>
        </div>
        <ArtworkPanel title="Unsealed Records" size="hero" />
      </section>
    );
  }

  const stemLabels = work.stemGroups.map((stem) => stem.label);

  return (
    <section className="featured-work" id="archive">
      <div className="featured-work__copy">
        <p className="micro-label">Featured source work</p>
        <p className="work-credit">
          {work.primaryArtist?.displayName ??
            work.primaryArtist?.name ??
            "Unsealed Records"}
        </p>
        <h2>{work.title}</h2>
        {work.subtitle ? <p className="featured-work__subtitle">{work.subtitle}</p> : null}
        <WorkMetadata
          bpm={work.bpm}
          durationMs={work.durationMs}
          musicalKey={work.musicalKey}
          stemLabels={stemLabels}
        />
        {work.description ? (
          <p className="featured-work__description">{work.description}</p>
        ) : (
          <p className="featured-work__description">
            Enter the source architecture of the recording: not as a commodity
            listing, but as a composed set of musical materials.
          </p>
        )}
        <Link className="text-link" href={"/works/" + work.slug}>
          Enter the work <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <Link
        className="featured-work__artwork-link"
        href={"/works/" + work.slug}
        aria-label={"Open " + work.title}
      >
        <ArtworkPanel
          title={work.title}
          catalogNumber={work.catalogNumber}
          artworkUrl={work.artworkUrl}
          size="hero"
        />
      </Link>
    </section>
  );
}
