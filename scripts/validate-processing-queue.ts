import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import {
  claimNextProcessingJob,
  markProcessingJobFailed,
} from "../src/lib/processing-jobs";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: {
      name: "Queue Validation " + suffix,
      slug: "queue-validation-" + suffix,
    },
  });

  try {
    const work = await db.work.create({
      data: {
        tenantId: tenant.id,
        slug: "work-" + suffix,
        title: "Queue Validation Work",
        status: "PROCESSING",
      },
    });

    const asset = await db.audioAsset.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        kind: "MASTER",
        status: "PROCESSING",
        fileName: "validation.wav",
        storageKey:
          "tenants/" + tenant.id + "/works/" + work.id + "/validation.wav",
      },
    });

    const job = await db.processingJob.create({
      data: {
        tenantId: tenant.id,
        audioAssetId: asset.id,
        type: "PROCESS_AUDIO",
        status: "QUEUED",
      },
    });

    const claimed = await claimNextProcessingJob("ci-validation-worker");

    assert.ok(claimed);
    assert.equal(claimed.id, job.id);
    assert.equal(claimed.status, "RUNNING");
    assert.equal(claimed.attempts, 1);
    assert.equal(claimed.lockedBy, "ci-validation-worker");

    const retry = await markProcessingJobFailed({
      jobId: claimed.id,
      audioAssetId: asset.id,
      workId: work.id,
      attempts: claimed.attempts,
      maxAttempts: claimed.maxAttempts,
      error: new Error("intentional validation retry"),
    });

    assert.equal(retry.exhausted, false);

    const persisted = await db.processingJob.findUnique({
      where: { id: job.id },
    });

    assert.equal(persisted?.status, "QUEUED");
    assert.equal(persisted?.attempts, 1);
    assert.equal(persisted?.lockedBy, null);

    console.log("Processing queue integration validation passed.");
  } finally {
    await db.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
