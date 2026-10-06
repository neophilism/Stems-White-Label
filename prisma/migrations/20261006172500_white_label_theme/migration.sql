CREATE TYPE "ThemePreset" AS ENUM ('UNSEALED','ATELIER','ARCHIVE','MINIMAL','BRUTALIST','GALLERY','CINEMATIC','CUSTOM');
CREATE TYPE "ThemeTypography" AS ENUM ('EDITORIAL','CLASSIC','MODERN','HUMANIST','MONO');
CREATE TYPE "ThemeHeroStyle" AS ENUM ('DISPLAY_CASE','TYPOGRAPHIC','SPLIT','IMMERSIVE','MINIMAL');
CREATE TYPE "ThemeNavStyle" AS ENUM ('BORDERED','FLOATING','MINIMAL');
CREATE TYPE "ThemeFooterStyle" AS ENUM ('EDITORIAL','COMPACT','MINIMAL');
CREATE TYPE "ThemeDensity" AS ENUM ('AIRY','BALANCED','COMPACT');
CREATE TYPE "ThemeAssetKind" AS ENUM ('LOGO','FAVICON');
CREATE TYPE "ThemeAssetStatus" AS ENUM ('PENDING','READY','FAILED');

CREATE TABLE "TenantTheme" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "preset" "ThemePreset" NOT NULL DEFAULT 'UNSEALED',
  "displayTypography" "ThemeTypography" NOT NULL DEFAULT 'EDITORIAL',
  "bodyTypography" "ThemeTypography" NOT NULL DEFAULT 'MODERN',
  "heroStyle" "ThemeHeroStyle" NOT NULL DEFAULT 'DISPLAY_CASE',
  "navStyle" "ThemeNavStyle" NOT NULL DEFAULT 'BORDERED',
  "footerStyle" "ThemeFooterStyle" NOT NULL DEFAULT 'EDITORIAL',
  "density" "ThemeDensity" NOT NULL DEFAULT 'AIRY',
  "background" TEXT NOT NULL DEFAULT '#070706',
  "surface" TEXT NOT NULL DEFAULT '#0e0e0c',
  "surfaceRaised" TEXT NOT NULL DEFAULT '#14130f',
  "ink" TEXT NOT NULL DEFAULT '#f2eee4',
  "inkSoft" TEXT NOT NULL DEFAULT '#cbc4b6',
  "muted" TEXT NOT NULL DEFAULT '#918a7e',
  "accent" TEXT NOT NULL DEFAULT '#b9a16f',
  "accentSoft" TEXT NOT NULL DEFAULT '#766746',
  "cornerRadiusPx" INTEGER NOT NULL DEFAULT 0,
  "artworkAspect" TEXT NOT NULL DEFAULT '1 / 1',
  "motionEnabled" BOOLEAN NOT NULL DEFAULT true,
  "logoText" TEXT,
  "heroEyebrow" TEXT,
  "heroHeadline" TEXT,
  "heroSubheadline" TEXT,
  "footerStatement" TEXT,
  "logoAssetId" TEXT,
  "faviconAssetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantTheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThemeAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" "ThemeAssetKind" NOT NULL,
  "status" "ThemeAssetStatus" NOT NULL DEFAULT 'PENDING',
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThemeAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantTheme_tenantId_key" ON "TenantTheme"("tenantId");
CREATE UNIQUE INDEX "TenantTheme_logoAssetId_key" ON "TenantTheme"("logoAssetId");
CREATE UNIQUE INDEX "TenantTheme_faviconAssetId_key" ON "TenantTheme"("faviconAssetId");
CREATE UNIQUE INDEX "ThemeAsset_storageKey_key" ON "ThemeAsset"("storageKey");
CREATE INDEX "ThemeAsset_tenantId_kind_status_idx" ON "ThemeAsset"("tenantId","kind","status");

ALTER TABLE "TenantTheme" ADD CONSTRAINT "TenantTheme_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantTheme" ADD CONSTRAINT "TenantTheme_logoAssetId_fkey"
  FOREIGN KEY ("logoAssetId") REFERENCES "ThemeAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantTheme" ADD CONSTRAINT "TenantTheme_faviconAssetId_fkey"
  FOREIGN KEY ("faviconAssetId") REFERENCES "ThemeAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThemeAsset" ADD CONSTRAINT "ThemeAsset_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
