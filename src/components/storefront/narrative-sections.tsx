type NarrativeSectionsProps = {
  sections: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
  }>;
};

export function NarrativeSections({ sections }: NarrativeSectionsProps) {
  if (sections.length === 0) return null;

  return (
    <section className="work-narratives" aria-label="About this work">
      {sections.map((section, index) => (
        <article className="work-narrative" key={section.id}>
          <div>
            <p className="micro-label">
              {section.kind || "Work note"} / {String(index + 1).padStart(2, "0")}
            </p>
            <h2>{section.title}</h2>
          </div>
          <div className="work-narrative__body">
            {section.body.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
