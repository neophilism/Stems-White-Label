import {
  assertWorkStatusTransition,
  validateStemGroupDefinition,
  type WorkStatus,
} from "./catalog-domain";
import {
  validateRevealStep,
  type RevealAction,
} from "./reveal-state";

export type CatalogEditorStem = {
  id?: string;
  slug: string;
  label: string;
  description?: string | null;
  position?: number;
  isFeatured?: boolean;
};

export type CatalogEditorCredit = {
  id?: string;
  role: string;
  displayName: string;
  position?: number;
};

export type CatalogEditorSection = {
  id?: string;
  kind: string;
  title: string;
  body: string;
  position?: number;
};

export type CatalogEditorRevealStep = {
  id?: string;
  atMs: number;
  action: RevealAction;
  stemGroupId: string | null;
  caption?: string | null;
};

export type CatalogEditorReveal = {
  id?: string;
  name: string;
  description?: string | null;
  isPublished?: boolean;
  steps: CatalogEditorRevealStep[];
};

export function slugifyCatalogValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function normalizeWorkInput(input: {
  title?: unknown;
  slug?: unknown;
  subtitle?: unknown;
  description?: unknown;
  catalogNumber?: unknown;
  bpm?: unknown;
  musicalKey?: unknown;
  durationMs?: unknown;
  primaryArtistId?: unknown;
}) {
  const title =
    typeof input.title === "string" ? input.title.trim().slice(0, 180) : "";

  if (!title) {
    throw new Error("Work title is required.");
  }

  const requestedSlug =
    typeof input.slug === "string" && input.slug.trim()
      ? input.slug
      : title;
  const slug = slugifyCatalogValue(requestedSlug);

  if (!slug) {
    throw new Error("Work slug is required.");
  }

  const bpm =
    input.bpm === null || input.bpm === undefined || input.bpm === ""
      ? null
      : Number(input.bpm);

  if (bpm !== null && (!Number.isFinite(bpm) || bpm <= 0 || bpm > 999)) {
    throw new Error("BPM must be a positive number no greater than 999.");
  }

  const durationMs =
    input.durationMs === null ||
    input.durationMs === undefined ||
    input.durationMs === ""
      ? null
      : Number(input.durationMs);

  if (
    durationMs !== null &&
    (!Number.isSafeInteger(durationMs) || durationMs < 0)
  ) {
    throw new Error("Duration must be a non-negative integer in milliseconds.");
  }

  return {
    title,
    slug,
    subtitle: normalizeOptionalText(input.subtitle, 240),
    description: normalizeOptionalText(input.description, 20_000),
    catalogNumber: normalizeOptionalText(input.catalogNumber, 120),
    bpm,
    musicalKey: normalizeOptionalText(input.musicalKey, 64),
    durationMs,
    primaryArtistId:
      typeof input.primaryArtistId === "string" && input.primaryArtistId
        ? input.primaryArtistId
        : null,
  };
}

export function normalizeStemInputs(
  stems: ReadonlyArray<CatalogEditorStem>,
): CatalogEditorStem[] {
  const seen = new Set<string>();

  return stems.map((stem, index) => {
    const validated = validateStemGroupDefinition({
      slug: stem.slug || stem.label,
      label: stem.label,
      position: stem.position ?? index,
    });

    if (seen.has(validated.slug)) {
      throw new Error("Stem group slugs must be unique within a Work.");
    }
    seen.add(validated.slug);

    return {
      id: stem.id,
      slug: validated.slug,
      label: validated.label.slice(0, 180),
      description: normalizeOptionalText(stem.description, 4000),
      position: validated.position ?? index,
      isFeatured: Boolean(stem.isFeatured),
    };
  });
}

export function normalizeCredits(
  credits: ReadonlyArray<CatalogEditorCredit>,
): CatalogEditorCredit[] {
  return credits.map((credit, index) => {
    const role = credit.role.trim().slice(0, 120);
    const displayName = credit.displayName.trim().slice(0, 180);

    if (!role || !displayName) {
      throw new Error("Each credit requires both a role and display name.");
    }

    return {
      id: credit.id,
      role,
      displayName,
      position: credit.position ?? index,
    };
  });
}

export function normalizeSections(
  sections: ReadonlyArray<CatalogEditorSection>,
): CatalogEditorSection[] {
  return sections.map((section, index) => {
    const kind = section.kind.trim().slice(0, 120);
    const title = section.title.trim().slice(0, 240);
    const body = section.body.trim().slice(0, 40_000);

    if (!kind || !title || !body) {
      throw new Error("Editorial sections require kind, title, and body.");
    }

    return {
      id: section.id,
      kind,
      title,
      body,
      position: section.position ?? index,
    };
  });
}

export function normalizeReveal(
  reveal: CatalogEditorReveal | null,
): CatalogEditorReveal | null {
  if (!reveal) return null;

  const name = reveal.name.trim().slice(0, 180);
  if (!name) {
    throw new Error("Reveal sequence name is required.");
  }

  const steps = [...reveal.steps]
    .map((step) => {
      const normalized = {
        id: step.id,
        atMs: Number(step.atMs),
        action: step.action,
        stemGroupId: step.stemGroupId,
        caption: normalizeOptionalText(step.caption, 600),
      };
      validateRevealStep(normalized);
      return normalized;
    })
    .sort((a, b) => a.atMs - b.atMs);

  return {
    id: reveal.id,
    name,
    description: normalizeOptionalText(reveal.description, 4000),
    isPublished: Boolean(reveal.isPublished),
    steps,
  };
}

export function validatePublishReadiness(input: {
  currentStatus: WorkStatus;
  readyMasterCount: number;
  processingSourceCount: number;
  failedSourceCount: number;
}) {
  assertWorkStatusTransition(input.currentStatus, "PUBLISHED");

  if (input.processingSourceCount > 0) {
    throw new Error("Source audio is still processing.");
  }

  if (input.failedSourceCount > 0) {
    throw new Error("One or more source audio files failed processing.");
  }

  if (input.readyMasterCount < 1) {
    throw new Error("A ready master source is required before publishing.");
  }
}
