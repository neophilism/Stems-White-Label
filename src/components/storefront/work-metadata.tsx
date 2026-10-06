import { formatDuration, stemSummary } from "@/lib/storefront";

type WorkMetadataProps = {
  bpm?: { toString(): string } | number | string | null;
  musicalKey?: string | null;
  durationMs?: number | null;
  stemLabels: string[];
};

export function WorkMetadata({
  bpm,
  musicalKey,
  durationMs,
  stemLabels,
}: WorkMetadataProps) {
  const duration = formatDuration(durationMs);
  const items = [
    bpm ? String(bpm) + " BPM" : null,
    musicalKey,
    duration,
    stemLabels.length ? stemLabels.length + " source groups" : null,
  ].filter(Boolean);

  return (
    <>
      {items.length > 0 ? (
        <ul className="metadata-row" aria-label="Work metadata">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <p className="stem-summary">{stemSummary(stemLabels)}</p>
    </>
  );
}
