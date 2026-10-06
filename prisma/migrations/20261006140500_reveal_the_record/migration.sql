CREATE TYPE "RevealStepAction" AS ENUM (
  'ADD_SOURCE',
  'REMOVE_SOURCE',
  'ALL_SOURCES',
  'FULL_MIX',
  'SILENCE'
);

CREATE TABLE "RevealSequence" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevealSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevealStep" (
  "id" TEXT NOT NULL,
  "sequenceId" TEXT NOT NULL,
  "stemGroupId" TEXT,
  "atMs" INTEGER NOT NULL,
  "action" "RevealStepAction" NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevealStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevealSequence_workId_isPublished_position_idx"
  ON "RevealSequence"("workId", "isPublished", "position");

CREATE INDEX "RevealStep_sequenceId_atMs_idx"
  ON "RevealStep"("sequenceId", "atMs");

CREATE INDEX "RevealStep_stemGroupId_idx"
  ON "RevealStep"("stemGroupId");

ALTER TABLE "RevealSequence"
  ADD CONSTRAINT "RevealSequence_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevealStep"
  ADD CONSTRAINT "RevealStep_sequenceId_fkey"
  FOREIGN KEY ("sequenceId") REFERENCES "RevealSequence"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevealStep"
  ADD CONSTRAINT "RevealStep_stemGroupId_fkey"
  FOREIGN KEY ("stemGroupId") REFERENCES "StemGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
