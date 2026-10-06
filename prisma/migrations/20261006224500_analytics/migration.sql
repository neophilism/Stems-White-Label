CREATE TYPE "AnalyticsEventType" AS ENUM (
  'WORK_VIEW',
  'PLAYER_PLAY',
  'PLAYER_PAUSE',
  'STEM_MUTE',
  'STEM_UNMUTE',
  'STEM_SOLO',
  'STEM_UNSOLO',
  'ALL_SOURCES',
  'FULL_MIX',
  'REVEAL_START',
  'REVEAL_COMPLETE',
  'CHECKOUT_STARTED',
  'PURCHASE_COMPLETED'
);

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "AnalyticsEventType" NOT NULL,
  "workId" TEXT,
  "stemGroupId" TEXT,
  "orderId" TEXT,
  "sessionId" VARCHAR(64),
  "clientEventId" VARCHAR(96),
  "positionMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsEvent_tenantId_clientEventId_key"
  ON "AnalyticsEvent"("tenantId","clientEventId");
CREATE INDEX "AnalyticsEvent_tenantId_type_createdAt_idx"
  ON "AnalyticsEvent"("tenantId","type","createdAt");
CREATE INDEX "AnalyticsEvent_tenantId_workId_type_createdAt_idx"
  ON "AnalyticsEvent"("tenantId","workId","type","createdAt");
CREATE INDEX "AnalyticsEvent_tenantId_stemGroupId_type_createdAt_idx"
  ON "AnalyticsEvent"("tenantId","stemGroupId","type","createdAt");
CREATE INDEX "AnalyticsEvent_tenantId_sessionId_createdAt_idx"
  ON "AnalyticsEvent"("tenantId","sessionId","createdAt");
CREATE INDEX "AnalyticsEvent_orderId_type_idx"
  ON "AnalyticsEvent"("orderId","type");

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_stemGroupId_fkey"
  FOREIGN KEY ("stemGroupId") REFERENCES "StemGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_positionMs_check"
  CHECK ("positionMs" IS NULL OR ("positionMs" >= 0 AND "positionMs" <= 86400000));
