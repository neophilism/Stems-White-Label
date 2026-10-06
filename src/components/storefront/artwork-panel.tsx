import { titleMonogram } from "@/lib/storefront";

type ArtworkPanelProps = {
  title: string;
  catalogNumber?: string | null;
  size?: "hero" | "card";
};

export function ArtworkPanel({
  title,
  catalogNumber,
  size = "card",
}: ArtworkPanelProps) {
  return (
    <div className={"artwork-panel artwork-panel--" + size} aria-hidden="true">
      <div className="artwork-panel__plate">
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
