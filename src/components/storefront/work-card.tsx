import Link from "next/link";

import { ArtworkPanel } from "@/components/storefront/artwork-panel";
import { WorkMetadata } from "@/components/storefront/work-metadata";

type WorkCardProps = {
  work: {
    id: string;
    slug: string;
    title: string;
    catalogNumber: string | null;
    bpm: { toString(): string } | null;
    musicalKey: string | null;
    durationMs: number | null;
    primaryArtist: { displayName: string | null; name: string } | null;
    stemGroups: Array<{ id: string; label: string }>;
  };
};

export function WorkCard({ work }: WorkCardProps) {
  return (
    <article className="work-card">
      <Link
        className="work-card__artwork-link"
        href={"/works/" + work.slug}
        aria-label={"Open " + work.title}
      >
        <ArtworkPanel title={work.title} catalogNumber={work.catalogNumber} />
      </Link>
      <div className="work-card__body">
        <p className="micro-label">
          {work.primaryArtist?.displayName ??
            work.primaryArtist?.name ??
            "Source work"}
        </p>
        <h3>
          <Link href={"/works/" + work.slug}>{work.title}</Link>
        </h3>
        <WorkMetadata
          bpm={work.bpm}
          durationMs={work.durationMs}
          musicalKey={work.musicalKey}
          stemLabels={work.stemGroups.map((stem) => stem.label)}
        />
        <Link className="work-card__open" href={"/works/" + work.slug}>
          Enter work <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
