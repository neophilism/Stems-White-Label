import type {
  ThemeDensity,
  ThemeFooterStyle,
  ThemeHeroStyle,
  ThemeNavStyle,
  ThemePreset,
  ThemeTypography,
} from "@prisma/client";

import { db } from "@/lib/db";

type ThemeTokens = {
  preset: ThemePreset;
  displayTypography: ThemeTypography;
  bodyTypography: ThemeTypography;
  heroStyle: ThemeHeroStyle;
  navStyle: ThemeNavStyle;
  footerStyle: ThemeFooterStyle;
  density: ThemeDensity;
  background: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkSoft: string;
  muted: string;
  accent: string;
  accentSoft: string;
  cornerRadiusPx: number;
  artworkAspect: string;
  motionEnabled: boolean;
  logoText: string | null;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  footerStatement: string | null;
};

const PRESETS: Record<Exclude<ThemePreset, "CUSTOM">, ThemeTokens> = {
  UNSEALED: {
    preset: "UNSEALED",
    displayTypography: "EDITORIAL",
    bodyTypography: "MODERN",
    heroStyle: "DISPLAY_CASE",
    navStyle: "BORDERED",
    footerStyle: "EDITORIAL",
    density: "AIRY",
    background: "#070706",
    surface: "#0e0e0c",
    surfaceRaised: "#14130f",
    ink: "#f2eee4",
    inkSoft: "#cbc4b6",
    muted: "#918a7e",
    accent: "#b9a16f",
    accentSoft: "#766746",
    cornerRadiusPx: 0,
    artworkAspect: "1 / 1",
    motionEnabled: true,
    logoText: "UR",
    heroEyebrow: "Unsealed source archive",
    heroHeadline: "The record is not a file.",
    heroSubheadline: "It is a construction.",
    footerStatement: "Masters, sections, and source material presented as works in their own right.",
  },
  ATELIER: {
    preset: "ATELIER",
    displayTypography: "CLASSIC",
    bodyTypography: "HUMANIST",
    heroStyle: "SPLIT",
    navStyle: "MINIMAL",
    footerStyle: "EDITORIAL",
    density: "AIRY",
    background: "#f4f0e8",
    surface: "#ebe5da",
    surfaceRaised: "#fffdf8",
    ink: "#1c1a17",
    inkSoft: "#4e4942",
    muted: "#7b7469",
    accent: "#8b5e3c",
    accentSoft: "#b89578",
    cornerRadiusPx: 2,
    artworkAspect: "4 / 5",
    motionEnabled: true,
    logoText: "AT",
    heroEyebrow: "Artist atelier",
    heroHeadline: "Source material,",
    heroSubheadline: "kept close to the hand.",
    footerStatement: "A working archive of finished recordings and the materials beneath them.",
  },
  ARCHIVE: {
    preset: "ARCHIVE",
    displayTypography: "CLASSIC",
    bodyTypography: "MONO",
    heroStyle: "TYPOGRAPHIC",
    navStyle: "BORDERED",
    footerStyle: "COMPACT",
    density: "BALANCED",
    background: "#11110f",
    surface: "#171714",
    surfaceRaised: "#1d1d19",
    ink: "#e9e5da",
    inkSoft: "#b9b4a8",
    muted: "#817d73",
    accent: "#a99a76",
    accentSoft: "#6d654f",
    cornerRadiusPx: 0,
    artworkAspect: "1 / 1",
    motionEnabled: false,
    logoText: "AR",
    heroEyebrow: "Recorded source archive",
    heroHeadline: "Catalog the work.",
    heroSubheadline: "Preserve the construction.",
    footerStatement: "An indexed archive of works, sources, provenance, and rights.",
  },
  MINIMAL: {
    preset: "MINIMAL",
    displayTypography: "MODERN",
    bodyTypography: "MODERN",
    heroStyle: "MINIMAL",
    navStyle: "MINIMAL",
    footerStyle: "MINIMAL",
    density: "AIRY",
    background: "#ffffff",
    surface: "#f5f5f3",
    surfaceRaised: "#ffffff",
    ink: "#111111",
    inkSoft: "#343434",
    muted: "#727272",
    accent: "#111111",
    accentSoft: "#a7a7a7",
    cornerRadiusPx: 0,
    artworkAspect: "1 / 1",
    motionEnabled: false,
    logoText: "ST",
    heroEyebrow: "Source material",
    heroHeadline: "The work,",
    heroSubheadline: "opened carefully.",
    footerStatement: "A direct view into the recordings and their source materials.",
  },
  BRUTALIST: {
    preset: "BRUTALIST",
    displayTypography: "MONO",
    bodyTypography: "MONO",
    heroStyle: "TYPOGRAPHIC",
    navStyle: "BORDERED",
    footerStyle: "COMPACT",
    density: "COMPACT",
    background: "#f2f200",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    ink: "#000000",
    inkSoft: "#111111",
    muted: "#444444",
    accent: "#ff3b00",
    accentSoft: "#000000",
    cornerRadiusPx: 0,
    artworkAspect: "1 / 1",
    motionEnabled: false,
    logoText: "SRC",
    heroEyebrow: "SOURCE / MASTER / STEM",
    heroHeadline: "OPEN THE RECORD.",
    heroSubheadline: "NO MARKETPLACE.",
    footerStatement: "SOURCE MATERIAL / RIGHTS / PROVENANCE.",
  },
  GALLERY: {
    preset: "GALLERY",
    displayTypography: "EDITORIAL",
    bodyTypography: "MODERN",
    heroStyle: "IMMERSIVE",
    navStyle: "FLOATING",
    footerStyle: "MINIMAL",
    density: "AIRY",
    background: "#f7f6f2",
    surface: "#eeece5",
    surfaceRaised: "#ffffff",
    ink: "#171713",
    inkSoft: "#46443e",
    muted: "#7d786d",
    accent: "#6e6043",
    accentSoft: "#aaa085",
    cornerRadiusPx: 0,
    artworkAspect: "4 / 5",
    motionEnabled: true,
    logoText: "GL",
    heroEyebrow: "Source gallery",
    heroHeadline: "Every recording",
    heroSubheadline: "gets its own room.",
    footerStatement: "Works, sources, and rights presented with gallery discipline.",
  },
  CINEMATIC: {
    preset: "CINEMATIC",
    displayTypography: "EDITORIAL",
    bodyTypography: "MODERN",
    heroStyle: "IMMERSIVE",
    navStyle: "FLOATING",
    footerStyle: "EDITORIAL",
    density: "BALANCED",
    background: "#05060a",
    surface: "#0b0e16",
    surfaceRaised: "#121725",
    ink: "#f3f4f7",
    inkSoft: "#c0c5d1",
    muted: "#747b8c",
    accent: "#c5a46b",
    accentSoft: "#65553d",
    cornerRadiusPx: 6,
    artworkAspect: "16 / 10",
    motionEnabled: true,
    logoText: "CN",
    heroEyebrow: "Source cinema",
    heroHeadline: "Enter the recording.",
    heroSubheadline: "Then move beneath it.",
    footerStatement: "An immersive archive of recordings, sections, and source architecture.",
  },
};

const DISPLAY_STACKS: Record<ThemeTypography, string> = {
  EDITORIAL: '"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,"Times New Roman",serif',
  CLASSIC: 'Didot,"Bodoni MT","Times New Roman",serif',
  MODERN: 'Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  HUMANIST: '"Gill Sans","Trebuchet MS",Calibri,ui-sans-serif,sans-serif',
  MONO: '"SFMono-Regular",Consolas,"Liberation Mono",monospace',
};

export type ThemeDraft = Partial<ThemeTokens> & {
  preset?: ThemePreset;
};

function color(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    throw new Error("Theme colors must use six-digit hex values.");
  }
  return normalized;
}

function text(value: unknown, max: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Theme text must be a string.");
  return value.trim().slice(0, max) || null;
}

export function getThemePreset(preset: ThemePreset): ThemeTokens {
  if (preset === "CUSTOM") return PRESETS.UNSEALED;
  return structuredClone(PRESETS[preset]);
}

export function normalizeThemeDraft(input: ThemeDraft, current?: ThemeTokens): ThemeTokens {
  const requestedPreset = input.preset ?? current?.preset ?? "UNSEALED";
  const base =
    requestedPreset === "CUSTOM"
      ? current ?? PRESETS.UNSEALED
      : getThemePreset(requestedPreset);

  const pick = <T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
    label: string,
  ): T => {
    if (value == null) return fallback;
    if (typeof value !== "string" || !allowed.includes(value as T)) {
      throw new Error("Unsupported " + label + ".");
    }
    return value as T;
  };

  const radius =
    input.cornerRadiusPx == null ? base.cornerRadiusPx : Number(input.cornerRadiusPx);
  if (!Number.isSafeInteger(radius) || radius < 0 || radius > 40) {
    throw new Error("Corner radius must be an integer from 0 to 40.");
  }

  const artworkAspect =
    typeof input.artworkAspect === "string" ? input.artworkAspect.trim() : base.artworkAspect;
  if (!["1 / 1", "4 / 5", "3 / 4", "16 / 10", "16 / 9"].includes(artworkAspect)) {
    throw new Error("Unsupported artwork aspect ratio.");
  }

  const resolved: ThemeTokens = {
    preset: requestedPreset,
    displayTypography: pick(input.displayTypography, ["EDITORIAL","CLASSIC","MODERN","HUMANIST","MONO"] as const, base.displayTypography, "display typography"),
    bodyTypography: pick(input.bodyTypography, ["EDITORIAL","CLASSIC","MODERN","HUMANIST","MONO"] as const, base.bodyTypography, "body typography"),
    heroStyle: pick(input.heroStyle, ["DISPLAY_CASE","TYPOGRAPHIC","SPLIT","IMMERSIVE","MINIMAL"] as const, base.heroStyle, "hero style"),
    navStyle: pick(input.navStyle, ["BORDERED","FLOATING","MINIMAL"] as const, base.navStyle, "navigation style"),
    footerStyle: pick(input.footerStyle, ["EDITORIAL","COMPACT","MINIMAL"] as const, base.footerStyle, "footer style"),
    density: pick(input.density, ["AIRY","BALANCED","COMPACT"] as const, base.density, "density"),
    background: color(input.background, base.background),
    surface: color(input.surface, base.surface),
    surfaceRaised: color(input.surfaceRaised, base.surfaceRaised),
    ink: color(input.ink, base.ink),
    inkSoft: color(input.inkSoft, base.inkSoft),
    muted: color(input.muted, base.muted),
    accent: color(input.accent, base.accent),
    accentSoft: color(input.accentSoft, base.accentSoft),
    cornerRadiusPx: radius,
    artworkAspect,
    motionEnabled: input.motionEnabled == null ? base.motionEnabled : Boolean(input.motionEnabled),
    logoText: text(input.logoText, 16) ?? base.logoText,
    heroEyebrow: text(input.heroEyebrow, 120) ?? base.heroEyebrow,
    heroHeadline: text(input.heroHeadline, 180) ?? base.heroHeadline,
    heroSubheadline: text(input.heroSubheadline, 180) ?? base.heroSubheadline,
    footerStatement: text(input.footerStatement, 600) ?? base.footerStatement,
  };

  const isManualOverride =
    requestedPreset !== "CUSTOM" &&
    Object.keys(input).some((key) => key !== "preset");
  if (isManualOverride) resolved.preset = "CUSTOM";

  return resolved;
}

export async function getResolvedTenantTheme(tenantId: string) {
  const stored = await db.tenantTheme.findUnique({
    where: { tenantId },
    include: {
      logoAsset: { select: { id: true, status: true } },
      faviconAsset: { select: { id: true, status: true } },
    },
  });

  const tokens = stored
    ? normalizeThemeDraft({
        preset: stored.preset,
        displayTypography: stored.displayTypography,
        bodyTypography: stored.bodyTypography,
        heroStyle: stored.heroStyle,
        navStyle: stored.navStyle,
        footerStyle: stored.footerStyle,
        density: stored.density,
        background: stored.background,
        surface: stored.surface,
        surfaceRaised: stored.surfaceRaised,
        ink: stored.ink,
        inkSoft: stored.inkSoft,
        muted: stored.muted,
        accent: stored.accent,
        accentSoft: stored.accentSoft,
        cornerRadiusPx: stored.cornerRadiusPx,
        artworkAspect: stored.artworkAspect,
        motionEnabled: stored.motionEnabled,
        logoText: stored.logoText,
        heroEyebrow: stored.heroEyebrow,
        heroHeadline: stored.heroHeadline,
        heroSubheadline: stored.heroSubheadline,
        footerStatement: stored.footerStatement,
      })
    : getThemePreset("UNSEALED");

  return {
    ...tokens,
    logoAssetId:
      stored?.logoAsset?.status === "READY" ? stored.logoAsset.id : null,
    faviconAssetId:
      stored?.faviconAsset?.status === "READY" ? stored.faviconAsset.id : null,
  };
}

export function themeCssVariables(theme: Awaited<ReturnType<typeof getResolvedTenantTheme>>) {
  const spacing =
    theme.density === "AIRY" ? "1" : theme.density === "COMPACT" ? "0.72" : "0.86";

  return {
    "--background": theme.background,
    "--surface": theme.surface,
    "--surface-raised": theme.surfaceRaised,
    "--ink": theme.ink,
    "--ink-soft": theme.inkSoft,
    "--muted": theme.muted,
    "--metal": theme.accent,
    "--metal-soft": theme.accentSoft,
    "--theme-radius": String(theme.cornerRadiusPx) + "px",
    "--artwork-aspect": theme.artworkAspect,
    "--theme-spacing-scale": spacing,
    "--serif": DISPLAY_STACKS[theme.displayTypography],
    "--sans": DISPLAY_STACKS[theme.bodyTypography],
  } as Record<string, string>;
}

export function availableThemePresets() {
  return (Object.keys(PRESETS) as Array<Exclude<ThemePreset, "CUSTOM">>).map(
    (preset) => ({ preset, ...getThemePreset(preset) }),
  );
}
