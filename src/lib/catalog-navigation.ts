export type CollectionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CollectionDraft = {
  title: unknown;
  slug?: unknown;
  description?: unknown;
  status?: unknown;
  orderedWorkIds?: unknown;
};

export function catalogSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeCatalogSearch(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function normalizeCollectionDraft(input: CollectionDraft) {
  const title =
    typeof input.title === "string" ? input.title.trim().slice(0, 180) : "";
  if (!title) throw new Error("Collection title is required.");

  const slug = catalogSlug(
    typeof input.slug === "string" && input.slug.trim() ? input.slug : title,
  );
  if (!slug) throw new Error("Collection slug is required.");

  const status = String(input.status ?? "DRAFT");
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
    throw new Error("Unsupported Collection status.");
  }

  const orderedWorkIds = Array.isArray(input.orderedWorkIds)
    ? [
        ...new Set(
          input.orderedWorkIds.filter(
            (id): id is string => typeof id === "string" && Boolean(id.trim()),
          ),
        ),
      ]
    : [];

  return {
    title,
    slug,
    description:
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim().slice(0, 12_000)
        : null,
    status: status as CollectionStatus,
    orderedWorkIds,
  };
}

export function collectionNeighborIndexes(length: number, index: number) {
  if (length <= 1 || index < 0 || index >= length) {
    return { previous: null, next: null };
  }

  return {
    previous: index === 0 ? length - 1 : index - 1,
    next: index === length - 1 ? 0 : index + 1,
  };
}
