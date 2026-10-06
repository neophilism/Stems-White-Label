import { titleMonogram } from "@/lib/storefront";

type ArtworkPanelProps = {
  title: string;
  catalogNumber?: string | null;
  size?: "hero" | "card";
  artworkUrl?: string | null;
};

export function ArtworkPanel({
  title,
  catalogNumber,
  size = "card",
  artworkUrl,
}: ArtworkPanelProps) {
  return (
    <div className={"artwork-panel artwork-panel--" + size}>
      {artworkUrl ? (
        <img
          className="artwork-panel__image"
          src={artworkUrl}
          alt={title + " cover artwork"}
        />
      ) : null}
      <div
        className={"artwork-panel__plate" + (artworkUrl ? " artwork-panel__plate--image" : "")}
        aria-hidden={artworkUrl ? "true" : undefined}
      >
        <span className="artwork-panel__serial">
          {catalogNumber ?? "UNSEALED / SOURCE"}
        </span>
        <span className="artwork-panel__monogram">{titleMonogram(title)}</span>
        <span className="artwork-panel__title">{title}</span>
        <span className="artwork-panel__rule" />
        <span className="artwork-panel__edition">SOURCE MATERIAL</span>
      </div>
    </div>
  );
}
