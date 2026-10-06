CREATE TYPE "WorkStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AudioAssetKind" AS ENUM ('MASTER', 'STEM', 'PREVIEW', 'OTHER');
CREATE TYPE "AudioAssetStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

CREATE TABLE "Artist" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "bio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Collection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Work" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "primaryArtistId" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "catalogNumber" TEXT,
  "bpm" DECIMAL(6,2),
  "musicalKey" TEXT,
  "durationMs" INTEGER,
  "status" "WorkStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkCredit" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "artistId" TEXT,
  "role" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkCredit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionWork" (
  "collectionId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionWork_pkey" PRIMARY KEY ("collectionId", "workId")
);

CREATE TABLE "StemGroup" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "parentId" TEXT,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StemGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudioAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "stemGroupId" TEXT,
  "kind" "AudioAssetKind" NOT NULL,
  "status" "AudioAssetStatus" NOT NULL DEFAULT 'PENDING',
  "label" TEXT,
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "sizeBytes" BIGINT,
  "durationMs" INTEGER,
  "sampleRateHz" INTEGER,
  "bitDepth" INTEGER,
  "channels" INTEGER,
  "checksumSha256" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Artist_tenantId_slug_key" ON "Artist"("tenantId", "slug");
CREATE INDEX "Artist_tenantId_idx" ON "Artist"("tenantId");
CREATE UNIQUE INDEX "Collection_tenantId_slug_key" ON "Collection"("tenantId", "slug");
CREATE INDEX "Collection_tenantId_status_idx" ON "Collection"("tenantId", "status");
CREATE UNIQUE INDEX "Work_tenantId_slug_key" ON "Work"("tenantId", "slug");
CREATE UNIQUE INDEX "Work_tenantId_catalogNumber_key" ON "Work"("tenantId", "catalogNumber");
CREATE INDEX "Work_tenantId_status_idx" ON "Work"("tenantId", "status");
CREATE INDEX "Work_primaryArtistId_idx" ON "Work"("primaryArtistId");
CREATE INDEX "WorkCredit_workId_position_idx" ON "WorkCredit"("workId", "position");
CREATE INDEX "WorkCredit_artistId_idx" ON "WorkCredit"("artistId");
CREATE INDEX "CollectionWork_collectionId_position_idx" ON "CollectionWork"("collectionId", "position");
CREATE INDEX "CollectionWork_workId_idx" ON "CollectionWork"("workId");
CREATE UNIQUE INDEX "StemGroup_workId_slug_key" ON "StemGroup"("workId", "slug");
CREATE INDEX "StemGroup_workId_position_idx" ON "StemGroup"("workId", "position");
CREATE INDEX "StemGroup_parentId_idx" ON "StemGroup"("parentId");
CREATE UNIQUE INDEX "AudioAsset_tenantId_storageKey_key" ON "AudioAsset"("tenantId", "storageKey");
CREATE INDEX "AudioAsset_tenantId_kind_status_idx" ON "AudioAsset"("tenantId", "kind", "status");
CREATE INDEX "AudioAsset_workId_idx" ON "AudioAsset"("workId");
CREATE INDEX "AudioAsset_stemGroupId_idx" ON "AudioAsset"("stemGroupId");

ALTER TABLE "Artist" ADD CONSTRAINT "Artist_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Work" ADD CONSTRAINT "Work_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Work" ADD CONSTRAINT "Work_primaryArtistId_fkey"
  FOREIGN KEY ("primaryArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkCredit" ADD CONSTRAINT "WorkCredit_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkCredit" ADD CONSTRAINT "WorkCredit_artistId_fkey"
  FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollectionWork" ADD CONSTRAINT "CollectionWork_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionWork" ADD CONSTRAINT "CollectionWork_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StemGroup" ADD CONSTRAINT "StemGroup_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StemGroup" ADD CONSTRAINT "StemGroup_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "StemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_stemGroupId_fkey"
  FOREIGN KEY ("stemGroupId") REFERENCES "StemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
