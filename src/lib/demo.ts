import { db } from "@/lib/db";

export const DEMO_THEMES = [
  {
    key: "atelier",
    name: "Atelier",
    description: "Warm editorial presentation with restrained metallic accents.",
    vars: {
      background: "#0d0b09",
      surface: "#17130f",
      ink: "#f5efe4",
      muted: "#9b8f7f",
      accent: "#c6a86b",
    },
  },
  {
    key: "gallery",
    name: "Gallery",
    description: "Quiet museum-like contrast for archival source material.",
    vars: {
      background: "#f0ede5",
      surface: "#faf8f2",
      ink: "#181715",
      muted: "#706c65",
      accent: "#7c6744",
    },
  },
  {
    key: "brutalist",
    name: "Brutalist",
    description: "High-contrast, direct presentation for aggressive artist brands.",
    vars: {
      background: "#050505",
      surface: "#111111",
      ink: "#ffffff",
      muted: "#a5a5a5",
      accent: "#e4ff45",
    },
  },
] as const;

export const DEMO_PRICING = [
  {
    name: "Studio",
    price: "$49",
    cadence: "/ month",
    description: "For independent artists presenting a focused source catalog.",
    features: ["10 Works", "25 GB tracked storage", "1 custom domain", "3 team members"],
    featured: false,
  },
  {
    name: "Label",
    price: "$149",
    cadence: "/ month",
    description: "For labels and established creators operating a larger catalog.",
    features: ["100 Works", "250 GB tracked storage", "5 custom domains", "15 team members", "Full white label"],
    featured: true,
  },
  {
    name: "House",
    price: "Custom",
    cadence: "",
    description: "For larger catalogs, archives, and multi-brand deployments.",
    features: ["Custom limits", "Priority onboarding", "Custom rollout support", "Platform-scale operations"],
    featured: false,
  },
] as const;

export const DEMO_FEATURES = [
  {
    eyebrow: "01 · Presentation",
    title: "Source material as an object of value",
    body: "A bespoke storefront presents each Work, its provenance, construction, and source groups without marketplace clutter.",
  },
  {
    eyebrow: "02 · Listening",
    title: "Reveal how the record was made",
    body: "The synchronized multitrack player and Reveal the Record choreography let listeners explore the construction without exposing archival originals.",
  },
  {
    eyebrow: "03 · Commerce",
    title: "Licensing with frozen legal history",
    body: "Versioned terms, Stripe Checkout, immutable order snapshots, secure delivery, and a persistent customer library form one controlled commerce path.",
  },
  {
    eyebrow: "04 · White label",
    title: "One engine, distinct artist identities",
    body: "Themes, domains, tenant roles, Stripe Connect, SaaS billing, analytics, and operator controls let the platform serve many branded storefronts.",
  },
] as const;

type DemoEnv = Record<string, string | undefined>;

export function demoModeEnabled(env: DemoEnv = process.env) {
  return env.DEMO_MODE === "true";
}

export function demoTenantSlug(env: DemoEnv = process.env) {
  return env.DEMO_TENANT_SLUG?.trim() || "stems-demo";
}

export async function getDemoExperience() {
  const tenant = await db.tenant.findUnique({
    where: { slug: demoTenantSlug() },
    include: {
      theme: true,
      collections: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        include: {
          works: {
            orderBy: { position: "asc" },
            include: {
              work: {
                include: {
                  primaryArtist: true,
                  stemGroups: { orderBy: { position: "asc" } },
                  licenseProducts: {
                    where: { isActive: true },
                    orderBy: { position: "asc" },
                    include: {
                      versions: {
                        where: { retiredAt: null },
                        orderBy: { version: "desc" },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tenant) return null;

  return {
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      theme: tenant.theme
        ? {
            heroEyebrow: tenant.theme.heroEyebrow,
            heroHeadline: tenant.theme.heroHeadline,
            heroSubheadline: tenant.theme.heroSubheadline,
            footerStatement: tenant.theme.footerStatement,
          }
        : null,
    },
    collections: tenant.collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      works: collection.works.map(({ work }) => ({
        id: work.id,
        slug: work.slug,
        title: work.title,
        subtitle: work.subtitle,
        artist: work.primaryArtist?.displayName ?? work.primaryArtist?.name ?? null,
        stemGroups: work.stemGroups.map((group) => group.label),
        licenses: work.licenseProducts.flatMap((product) =>
          product.versions.map((version) => ({
            name: product.name,
            priceCents: version.priceCents,
            currency: version.currency,
          })),
        ),
      })),
    })),
  };
}
