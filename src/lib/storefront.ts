import { signedArtworkPath } from "@/lib/artwork";
import {
  collectionNeighborIndexes,
  normalizeCatalogSearch,
} from "@/lib/catalog-navigation";
import { db } from "@/lib/db";

export async function getStorefrontHome(tenantId: string) {
  const [featuredWork, collections, recentWorks] = await Promise.all([
    db.work.findFirst({
      where: { tenantId, status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        primaryArtist: true,
        artwork: { select: { id: true, status: true } },
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
        artwork: { select: { id: true, status: true } },
        stemGroups: {
          orderBy: { position: "asc" },
          select: { id: true, label: true },
        },
      },
    }),
  ]);

  const decorateWork = <T extends { artwork?: { id: string; status: string } | null }>(
    work: T,
  ) => ({
    ...work,
    artworkUrl:
      work.artwork?.status === "READY" ? signedArtworkPath(work.artwork.id) : null,
  });

  return {
    featuredWork: featuredWork ? decorateWork(featuredWork) : null,
    collections,
    recentWorks: recentWorks.map(decorateWork),
  };
}

export async function getPublishedCollection(tenantId: string, slug: string) {
  const collection = await db.collection.findFirst({
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
              artwork: { select: { id: true, status: true } },
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

  if (!collection) return null;

  return {
    ...collection,
    works: collection.works.map((entry) => ({
      ...entry,
      work: {
        ...entry.work,
        artworkUrl:
          entry.work.artwork?.status === "READY"
            ? signedArtworkPath(entry.work.artwork.id)
            : null,
      },
    })),
  };
}


export async function getPublishedWork(tenantId: string, slug: string) {
  const work = await db.work.findFirst({
    where: {
      tenantId,
      slug,
      status: "PUBLISHED",
    },
    include: {
      primaryArtist: true,
      artwork: { select: { id: true, status: true } },
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
            orderBy: { createdAt: "desc" },
          },
        },
      },
      audioAssets: {
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
      },
      licenseProducts: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          selectedStems: {
            include: {
              stemGroup: { select: { id: true, label: true } },
            },
          },
          versions: {
            where: { retiredAt: null },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
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

  if (!work) return null;

  return {
    ...work,
    artworkUrl:
      work.artwork?.status === "READY" ? signedArtworkPath(work.artwork.id) : null,
  };
}


export async function getPublishedCollections(tenantId: string) {
  const collections = await db.collection.findMany({
    where: { tenantId, status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          works: {
            where: { work: { status: "PUBLISHED" } },
          },
        },
      },
      works: {
        where: { work: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        take: 4,
        include: {
          work: {
            include: {
              artwork: { select: { id: true, status: true } },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => ({
    ...collection,
    publishedWorkCount: collection._count.works,
    previewWorks: collection.works.map((entry) => ({
      id: entry.work.id,
      slug: entry.work.slug,
      title: entry.work.title,
      artworkUrl:
        entry.work.artwork?.status === "READY"
          ? signedArtworkPath(entry.work.artwork.id)
          : null,
    })),
  }));
}

export async function searchPublishedCatalog(
  tenantId: string,
  input: { q?: unknown; collectionSlug?: unknown },
) {
  const q = normalizeCatalogSearch(input.q);
  const collectionSlug =
    typeof input.collectionSlug === "string"
      ? input.collectionSlug.trim().slice(0, 120)
      : "";

  const collection = collectionSlug
    ? await db.collection.findFirst({
        where: {
          tenantId,
          slug: collectionSlug,
          status: "PUBLISHED",
        },
        select: { id: true, slug: true, title: true },
      })
    : null;

  const works = await db.work.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      ...(collection
        ? { collections: { some: { collectionId: collection.id } } }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { subtitle: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { musicalKey: { contains: q, mode: "insensitive" } },
              {
                credits: {
                  some: { displayName: { contains: q, mode: "insensitive" } },
                },
              },
              {
                stemGroups: {
                  some: { label: { contains: q, mode: "insensitive" } },
                },
              },
              {
                collections: {
                  some: {
                    collection: {
                      status: "PUBLISHED",
                      title: { contains: q, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 60,
    include: {
      primaryArtist: true,
      artwork: { select: { id: true, status: true } },
      stemGroups: {
        orderBy: { position: "asc" },
        select: { id: true, label: true },
      },
      collections: {
        where: { collection: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        include: {
          collection: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });

  return {
    q,
    collection,
    works: works.map((work) => ({
      ...work,
      artworkUrl:
        work.artwork?.status === "READY"
          ? signedArtworkPath(work.artwork.id)
          : null,
    })),
  };
}

export async function getCollectionNeighbors(
  tenantId: string,
  collectionId: string,
) {
  const collections = await db.collection.findMany({
    where: { tenantId, status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, slug: true, title: true },
  });

  const index = collections.findIndex((collection) => collection.id === collectionId);
  const indexes = collectionNeighborIndexes(collections.length, index);

  return {
    previous:
      indexes.previous === null ? null : (collections[indexes.previous] ?? null),
    next: indexes.next === null ? null : (collections[indexes.next] ?? null),
  };
}

export async function getRelatedPublishedWorks(
  tenantId: string,
  workId: string,
  collectionIds: string[],
  limit = 3,
) {
  if (collectionIds.length === 0) return [];

  const works = await db.work.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      id: { not: workId },
      collections: {
        some: { collectionId: { in: collectionIds } },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      primaryArtist: true,
      artwork: { select: { id: true, status: true } },
      stemGroups: {
        orderBy: { position: "asc" },
        select: { id: true, label: true },
      },
    },
  });

  return works.map((work) => ({
    ...work,
    artworkUrl:
      work.artwork?.status === "READY"
        ? signedArtworkPath(work.artwork.id)
        : null,
  }));
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
