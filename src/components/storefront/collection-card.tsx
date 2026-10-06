import Link from "next/link";

type CollectionCardProps = {
  collection: {
    slug: string;
    title: string;
    description: string | null;
    _count: { works: number };
  };
  index: number;
};

export function CollectionCard({ collection, index }: CollectionCardProps) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <Link className="collection-card" href={"/collections/" + collection.slug}>
      <span className="collection-card__number">{number}</span>
      <div className="collection-card__content">
        <p className="micro-label">
          Collection · {collection._count.works}{" "}
          {collection._count.works === 1 ? "work" : "works"}
        </p>
        <h3>{collection.title}</h3>
        {collection.description ? <p>{collection.description}</p> : null}
      </div>
      <span className="collection-card__arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}
