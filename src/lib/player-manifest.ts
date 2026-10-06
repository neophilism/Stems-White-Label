import { db } from "@/lib/db";
import { signedPreviewPath } from "@/lib/audio-preview-access";
import type { RevealAction } from "@/lib/reveal-state";

export type PlayerManifest = {
  workId: string;
  workSlug: string;
  title: string;
  durationMs: number | null;
  fullMix: PlayerTrack | null;
  stems: PlayerStemTrack[];
  revealSequence: PlayerRevealSequence | null;
};

export type PlayerRevealStep = {
  atMs: number;
  action: RevealAction;
  stemGroupId: string | null;
  caption: string | null;
};

export type PlayerRevealSequence = {
  id: string;
  name: string;
  description: string | null;
  steps: PlayerRevealStep[];
};

export type PlayerTrack = {
  assetId: string;
  label: string;
  url: string;
  durationMs: number | null;
};

export type PlayerStemTrack = PlayerTrack & {
  stemGroupId: string;
};

export async function buildPlayerManifest(tenantId: string, workSlug: string) {
  const work = await db.work.findFirst({
    where: {
      tenantId,
      slug: workSlug,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      durationMs: true,
      audioAssets: {
        where: {
          kind: "PREVIEW",
          status: "READY",
          storageKey: { not: null },
          stemGroupId: null,
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          label: true,
          durationMs: true,
        },
      },
      revealSequences: {
        where: { isPublished: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          name: true,
          description: true,
          steps: {
            orderBy: [{ atMs: "asc" }, { createdAt: "asc" }],
            select: {
              atMs: true,
              action: true,
              stemGroupId: true,
              caption: true,
            },
          },
        },
      },
      stemGroups: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          label: true,
          audioAssets: {
            where: {
              kind: "PREVIEW",
              status: "READY",
              storageKey: { not: null },
            },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              id: true,
              label: true,
              durationMs: true,
            },
          },
        },
      },
    },
  });

  if (!work) return null;

  const master = work.audioAssets[0];

  const fullMix: PlayerTrack | null = master
    ? {
        assetId: master.id,
        label: master.label || "Full Mix",
        url: signedPreviewPath(master.id),
        durationMs: master.durationMs,
      }
    : null;

  const stems: PlayerStemTrack[] = work.stemGroups.flatMap((stem) => {
    const preview = stem.audioAssets[0];
    if (!preview) return [];

    return [
      {
        stemGroupId: stem.id,
        assetId: preview.id,
        label: stem.label,
        url: signedPreviewPath(preview.id),
        durationMs: preview.durationMs,
      },
    ];
  });

  const playableStemIds = new Set(stems.map((stem) => stem.stemGroupId));
  const reveal = work.revealSequences[0];

  const revealSequence: PlayerRevealSequence | null = reveal
    ? {
        id: reveal.id,
        name: reveal.name,
        description: reveal.description,
        steps: reveal.steps.flatMap((step) => {
          const requiresStem =
            step.action === "ADD_SOURCE" ||
            step.action === "REMOVE_SOURCE";

          if (requiresStem) {
            if (!step.stemGroupId || !playableStemIds.has(step.stemGroupId)) {
              return [];
            }
          } else if (step.stemGroupId) {
            return [];
          }

          if (step.action === "FULL_MIX" && !fullMix) {
            return [];
          }

          return [
            {
              atMs: step.atMs,
              action: step.action as RevealAction,
              stemGroupId: step.stemGroupId,
              caption: step.caption,
            },
          ];
        }),
      }
    : null;

  return {
    workId: work.id,
    workSlug: work.slug,
    title: work.title,
    durationMs: work.durationMs,
    fullMix,
    stems,
    revealSequence,
  } satisfies PlayerManifest;
}
