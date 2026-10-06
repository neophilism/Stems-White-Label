CREATE TABLE "WorkSection" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkSection_workId_position_idx" ON "WorkSection"("workId", "position");

ALTER TABLE "WorkSection" ADD CONSTRAINT "WorkSection_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
