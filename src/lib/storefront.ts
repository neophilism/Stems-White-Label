import { db } from "@/lib/db";

export async function getStorefrontHome(tenantId: string) {
  const [featuredWork, collections, recentWorks] = await Promise.all([
    db.work.findFirst({
      where: { tenantId, status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        primaryArtist: true,
        stemGroups: {
          orderBy: { position: "asc" },
          select: { id: true, label: true },
        },
      },
    }),
    db.collection.findMany({
      where: { tenantId, status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        _count: {
          select: { works: true },
        },
      },
    }),
    db.work.findMany({
      where: { tenantId, status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        primaryArtist: true,
        stemGroups: {
          orderBy: { position: "asc" },
          select: { id: true, label: true },
        },
      },
    }),
  ]);

  return { featuredWork, collections, recentWorks };
}

export async function getPublishedCollection(tenantId: string, slug: string) {
  return db.collection.findFirst({
    where: {
      tenantId,
      slug,
      status: "PUBLISHED",
    },
    include: {
      works: {
        where: {
          work: { status: "PUBLISHED" },
        },
        orderBy: { position: "asc" },
        include: {
          work: {
            include: {
              primaryArtist: true,
              stemGroups: {
                orderBy: { position: "asc" },
                select: { id: true, label: true },
              },
            },
          },
        },
      },
    },
  });
}


export async function getPublishedWork(tenantId: string, slug: string) {
  return db.work.findFirst({
    where: {
      tenantId,
      slug,
      status: "PUBLISHED",
    },
    include: {
      primaryArtist: true,
      credits: {
        orderBy: { position: "asc" },
      },
      sections: {
        orderBy: { position: "asc" },
      },
      revealSequences: {
        where: { isPublished: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      stemGroups: {
        orderBy: { position: "asc" },
        include: {
          children: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              label: true,
            },
          },
          audioAssets: {
            where: { status: "READY" },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      audioAssets: {
        where: { status: "READY" },
        orderBy: { createdAt: "asc" },
      },
      collections: {
        where: {
          collection: { status: "PUBLISHED" },
        },
        orderBy: { position: "asc" },
        include: {
          collection: true,
        },
      },
    },
  });
}

export function formatTechnicalSpec(asset: {
  sampleRateHz?: number | null;
  bitDepth?: number | null;
  channels?: number | null;
  mimeType?: string | null;
}) {
  const parts: string[] = [];

  if (asset.sampleRateHz) {
    const khz = asset.sampleRateHz / 1000;
    parts.push(
      Number.isInteger(khz) ? String(khz) + " kHz" : khz.toFixed(1) + " kHz",
    );
  }

  if (asset.bitDepth) {
    parts.push(String(asset.bitDepth) + "-bit");
  }

  if (asset.channels) {
    parts.push(
      asset.channels === 1
        ? "Mono"
        : asset.channels === 2
          ? "Stereo"
          : String(asset.channels) + " channels",
    );
  }

  if (asset.mimeType) {
    parts.push(asset.mimeType.replace(/^audio\//, "").toUpperCase());
  }

  return parts.join(" · ");
}

export function formatDuration(durationMs: number | null | undefined) {
  if (!durationMs || durationMs < 0) return null;

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes + ":" + String(seconds).padStart(2, "0");
}

export function titleMonogram(title: string) {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  if (words.length === 0) return "UR";

  return words.map((word) => word[0]?.toUpperCase()).join("");
}

export function stemSummary(labels: string[], limit = 4) {
  if (labels.length === 0) return "Source groups available";

  const visible = labels.slice(0, limit);
  const suffix = labels.length > limit ? " +" + (labels.length - limit) : "";

  return visible.join(" · ") + suffix;
}
