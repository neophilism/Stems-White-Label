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
