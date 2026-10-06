import { ArtworkPanel } from "@/components/storefront/artwork-panel";
import { WorkMetadata } from "@/components/storefront/work-metadata";

type WorkCardProps = {
  work: {
    id: string;
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
      <ArtworkPanel title={work.title} catalogNumber={work.catalogNumber} />
      <div className="work-card__body">
        <p className="micro-label">
          {work.primaryArtist?.displayName ??
            work.primaryArtist?.name ??
            "Source work"}
        </p>
        <h3>{work.title}</h3>
        <WorkMetadata
          bpm={work.bpm}
          durationMs={work.durationMs}
          musicalKey={work.musicalKey}
          stemLabels={work.stemGroups.map((stem) => stem.label)}
        />
      </div>
    </article>
  );
}
