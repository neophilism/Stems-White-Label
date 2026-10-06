import Link from "next/link";

import { formatDuration, formatTechnicalSpec } from "@/lib/storefront";

type WorkLedgerProps = {
  catalogNumber: string | null;
  bpm: { toString(): string } | null;
  musicalKey: string | null;
  durationMs: number | null;
  publishedAt: Date | null;
  credits: Array<{
    id: string;
    role: string;
    displayName: string;
  }>;
  audioAssets: Array<{
    id: string;
    kind: string;
    label: string | null;
    fileName: string;
    sampleRateHz: number | null;
    bitDepth: number | null;
    channels: number | null;
    mimeType: string | null;
  }>;
  collections: Array<{
    collection: {
      id: string;
      slug: string;
      title: string;
    };
  }>;
};

export function WorkLedger({
  catalogNumber,
  bpm,
  musicalKey,
  durationMs,
  publishedAt,
  credits,
  audioAssets,
  collections,
}: WorkLedgerProps) {
  const primaryAsset =
    audioAssets.find((asset) => asset.kind === "MASTER") ?? audioAssets[0];
  const technical = primaryAsset ? formatTechnicalSpec(primaryAsset) : null;
  const duration = formatDuration(durationMs);

  const facts = [
    ["Catalog", catalogNumber],
    ["Tempo", bpm ? String(bpm) + " BPM" : null],
    ["Key", musicalKey],
    ["Duration", duration],
    ["Master", technical],
    [
      "Published",
      publishedAt
        ? new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(publishedAt)
        : null,
    ],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (facts.length === 0 && credits.length === 0 && collections.length === 0) {
    return null;
  }

  return (
    <section className="work-ledger" aria-label="Work provenance">
      {facts.length > 0 ? (
        <div className="work-ledger__block">
          <p className="micro-label">Technical record</p>
          <dl className="fact-ledger">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {credits.length > 0 ? (
        <div className="work-ledger__block">
          <p className="micro-label">Credits</p>
          <dl className="credit-ledger">
            {credits.map((credit) => (
              <div key={credit.id}>
                <dt>{credit.role}</dt>
                <dd>{credit.displayName}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {collections.length > 0 ? (
        <div className="work-ledger__block">
          <p className="micro-label">In the archive</p>
          <div className="work-ledger__collections">
            {collections.map(({ collection }) => (
              <Link key={collection.id} href={"/collections/" + collection.slug}>
                {collection.title} ↗
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
