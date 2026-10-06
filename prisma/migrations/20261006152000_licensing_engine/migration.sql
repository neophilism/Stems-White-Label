CREATE TYPE "LicenseScope" AS ENUM ('WORK', 'SELECTED_STEMS', 'ALL_STEMS');

CREATE TABLE "LicenseProduct" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  "scope" "LicenseScope" NOT NULL DEFAULT 'ALL_STEMS',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LicenseProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseVersion" (
  "id" TEXT NOT NULL,
  "licenseProductId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "termsText" TEXT NOT NULL,
  "attributionRequired" BOOLEAN NOT NULL DEFAULT false,
  "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT true,
  "derivativesAllowed" BOOLEAN NOT NULL DEFAULT true,
  "redistributionAllowed" BOOLEAN NOT NULL DEFAULT false,
  "seatLimit" INTEGER,
  "projectLimit" INTEGER,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LicenseVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseProductStem" (
  "licenseProductId" TEXT NOT NULL,
  "stemGroupId" TEXT NOT NULL,
  CONSTRAINT "LicenseProductStem_pkey" PRIMARY KEY ("licenseProductId", "stemGroupId")
);

CREATE UNIQUE INDEX "LicenseProduct_workId_slug_key" ON "LicenseProduct"("workId","slug");
CREATE INDEX "LicenseProduct_tenantId_isActive_idx" ON "LicenseProduct"("tenantId","isActive");
CREATE INDEX "LicenseProduct_workId_isActive_position_idx" ON "LicenseProduct"("workId","isActive","position");
CREATE UNIQUE INDEX "LicenseVersion_licenseProductId_version_key" ON "LicenseVersion"("licenseProductId","version");
CREATE INDEX "LicenseVersion_licenseProductId_effectiveAt_idx" ON "LicenseVersion"("licenseProductId","effectiveAt");
CREATE INDEX "LicenseProductStem_stemGroupId_idx" ON "LicenseProductStem"("stemGroupId");

ALTER TABLE "LicenseProduct" ADD CONSTRAINT "LicenseProduct_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseProduct" ADD CONSTRAINT "LicenseProduct_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseVersion" ADD CONSTRAINT "LicenseVersion_licenseProductId_fkey"
  FOREIGN KEY ("licenseProductId") REFERENCES "LicenseProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseProductStem" ADD CONSTRAINT "LicenseProductStem_licenseProductId_fkey"
  FOREIGN KEY ("licenseProductId") REFERENCES "LicenseProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseProductStem" ADD CONSTRAINT "LicenseProductStem_stemGroupId_fkey"
  FOREIGN KEY ("stemGroupId") REFERENCES "StemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
