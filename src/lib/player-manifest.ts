import { db } from "@/lib/db";
import { signedPreviewPath } from "@/lib/audio-preview-access";

export type PlayerManifest = {
  workId: string;
  workSlug: string;
  title: string;
  durationMs: number | null;
  fullMix: PlayerTrack | null;
  stems: PlayerStemTrack[];
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

  return {
    workId: work.id,
    workSlug: work.slug,
    title: work.title,
    durationMs: work.durationMs,
    fullMix,
    stems,
  } satisfies PlayerManifest;
}
