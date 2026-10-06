import { formatTechnicalSpec } from "@/lib/storefront";

type SourceCabinetProps = {
  stemGroups: Array<{
    id: string;
    label: string;
    description: string | null;
    children: Array<{ id: string; label: string }>;
    audioAssets: Array<{
      id: string;
      label: string | null;
      fileName: string;
      sampleRateHz: number | null;
      bitDepth: number | null;
      channels: number | null;
      mimeType: string | null;
    }>;
  }>;
};

export function SourceCabinet({ stemGroups }: SourceCabinetProps) {
  if (stemGroups.length === 0) {
    return null;
  }

  return (
    <section className="work-section source-cabinet" id="source-material">
      <div className="work-section__heading">
        <p className="micro-label">Source material</p>
        <h2>The cabinet</h2>
        <p>
          Musical sections are presented as the creator defined them. A source
          group may be a single part, a section, a bus, or an entire ensemble.
        </p>
      </div>

      <div className="source-cabinet__list">
        {stemGroups.map((stem, index) => {
          const primaryAsset = stem.audioAssets[0];
          const technical = primaryAsset
            ? formatTechnicalSpec(primaryAsset)
            : "";

          return (
            <article className="source-drawer" key={stem.id}>
              <div className="source-drawer__index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="source-drawer__body">
                <h3>{stem.label}</h3>
                {stem.description ? <p>{stem.description}</p> : null}
                {stem.children.length > 0 ? (
                  <p className="source-drawer__children">
                    {stem.children.map((child) => child.label).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="source-drawer__technical">
                {technical ? <span>{technical}</span> : null}
                <span>
                  {stem.audioAssets.length > 0
                    ? stem.audioAssets.length +
                      (stem.audioAssets.length === 1 ? " source asset" : " source assets")
                    : "Source group"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
