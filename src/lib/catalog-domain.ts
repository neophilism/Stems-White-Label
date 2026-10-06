export type WorkStatus =
  | "DRAFT"
  | "PROCESSING"
  | "READY"
  | "PUBLISHED"
  | "ARCHIVED";

const transitions: Record<WorkStatus, ReadonlySet<WorkStatus>> = {
  DRAFT: new Set(["PROCESSING", "ARCHIVED"]),
  PROCESSING: new Set(["DRAFT", "READY", "ARCHIVED"]),
  READY: new Set(["DRAFT", "PROCESSING", "PUBLISHED", "ARCHIVED"]),
  PUBLISHED: new Set(["READY", "ARCHIVED"]),
  ARCHIVED: new Set(["DRAFT"]),
};

export function canTransitionWorkStatus(
  from: WorkStatus,
  to: WorkStatus,
): boolean {
  return from === to || transitions[from].has(to);
}

export function assertWorkStatusTransition(
  from: WorkStatus,
  to: WorkStatus,
): void {
  if (!canTransitionWorkStatus(from, to)) {
    throw new Error("Invalid work status transition: " + from + " -> " + to);
  }
}

export type StemGroupDefinition = {
  slug: string;
  label: string;
  parentId?: string | null;
  position?: number;
};

export function validateStemGroupDefinition(
  value: StemGroupDefinition,
): StemGroupDefinition {
  const slug = value.slug.trim().toLowerCase();
  const label = value.label.trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Stem group slug must be lowercase kebab-case.");
  }

  if (!label) {
    throw new Error("Stem group label is required.");
  }

  if (value.position !== undefined && value.position < 0) {
    throw new Error("Stem group position cannot be negative.");
  }

  return {
    ...value,
    slug,
    label,
  };
}
