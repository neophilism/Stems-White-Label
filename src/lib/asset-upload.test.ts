import assert from "node:assert/strict";
import test from "node:test";

import {
  previewStorageKey,
  sanitizeUploadFileName,
  sourceStorageKey,
  validateSourceUpload,
  waveformStorageKey,
} from "./asset-upload";

test("accepts section-level STEM uploads", () => {
  const result = validateSourceUpload({
    fileName: "Horn Section 1.wav",
    mimeType: "audio/wav",
    sizeBytes: 1024,
    kind: "STEM",
    stemGroupId: "horn-section-1",
  });

  assert.equal(result.fileName, "Horn Section 1.wav");
  assert.equal(result.stemGroupId, "horn-section-1");
});

test("requires STEM uploads to target a creator-defined source group", () => {
  assert.throws(() =>
    validateSourceUpload({
      fileName: "horns.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024,
      kind: "STEM",
    }),
  );
});

test("prevents a MASTER upload from being attached to a StemGroup", () => {
  assert.throws(() =>
    validateSourceUpload({
      fileName: "master.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024,
      kind: "MASTER",
      stemGroupId: "drums",
    }),
  );
});

test("sanitizes uploaded file names without flattening musical labels", () => {
  assert.equal(sanitizeUploadFileName("../../Horn Section #1.wav"), "Horn Section _1.wav");
});

test("derivative keys are deterministic and separate from originals", () => {
  assert.equal(
    sourceStorageKey({
      tenantId: "tenant-1",
      workId: "work-1",
      assetId: "asset-1",
      fileName: "master.wav",
    }),
    "tenants/tenant-1/works/work-1/originals/asset-1/master.wav",
  );

  assert.equal(
    previewStorageKey({
      tenantId: "tenant-1",
      workId: "work-1",
      sourceAssetId: "asset-1",
    }),
    "tenants/tenant-1/works/work-1/previews/asset-1.mp3",
  );

  assert.equal(
    waveformStorageKey({
      tenantId: "tenant-1",
      workId: "work-1",
      sourceAssetId: "asset-1",
    }),
    "tenants/tenant-1/works/work-1/waveforms/asset-1.json",
  );
});
