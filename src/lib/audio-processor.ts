import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

import {
  previewStorageKey,
  waveformStorageKey,
} from "@/lib/asset-upload";
import { db } from "@/lib/db";
import {
  generateWaveform,
  probeAudio,
  sha256File,
  transcodePreview,
} from "@/lib/media-processing";
import {
  downloadPrivateObjectToFile,
  putPrivateObject,
  uploadFileToPrivateStorage,
} from "@/lib/object-storage";

export async function processAudioAsset(audioAssetId: string) {
  const source = await db.audioAsset.findUnique({
    where: { id: audioAssetId },
  });

  if (
    !source ||
    (source.kind !== "MASTER" && source.kind !== "STEM") ||
    !source.storageKey
  ) {
    throw new Error(
      "Processing source is missing or is not an archival audio asset.",
    );
  }

  const extension = extname(source.fileName).slice(0, 12) || ".audio";
  const tempDirectory = await mkdtemp(join(tmpdir(), "stems-audio-"));
  const sourcePath = join(tempDirectory, "source" + extension);
  const previewPath = join(tempDirectory, "preview.mp3");

  try {
    await downloadPrivateObjectToFile(source.storageKey, sourcePath);

    const [metadata, checksumSha256] = await Promise.all([
      probeAudio(sourcePath),
      sha256File(sourcePath),
    ]);

    await transcodePreview(sourcePath, previewPath);
    const previewMetadata = await probeAudio(previewPath);
    const waveform = await generateWaveform(sourcePath);
    const waveformJson = JSON.stringify(waveform);

    const previewKey = previewStorageKey({
      tenantId: source.tenantId,
      workId: source.workId,
      sourceAssetId: source.id,
    });
    const waveformKey = waveformStorageKey({
      tenantId: source.tenantId,
      workId: source.workId,
      sourceAssetId: source.id,
    });

    await Promise.all([
      uploadFileToPrivateStorage({
        storageKey: previewKey,
        filePath: previewPath,
        contentType: "audio/mpeg",
      }),
      putPrivateObject({
        storageKey: waveformKey,
        body: Buffer.from(waveformJson, "utf8"),
        contentType: "application/json",
        contentLength: Buffer.byteLength(waveformJson),
      }),
    ]);

    const previewStat = await stat(previewPath);

    await db.$transaction(async (tx) => {
      await tx.audioAsset.update({
        where: { id: source.id },
        data: {
          status: "READY",
          durationMs: metadata.durationMs,
          sampleRateHz: metadata.sampleRateHz,
          bitDepth: metadata.bitDepth,
          channels: metadata.channels,
          checksumSha256,
        },
      });

      await tx.audioAsset.upsert({
        where: {
          sourceAssetId_kind: {
            sourceAssetId: source.id,
            kind: "PREVIEW",
          },
        },
        create: {
          tenantId: source.tenantId,
          workId: source.workId,
          stemGroupId: source.stemGroupId,
          sourceAssetId: source.id,
          kind: "PREVIEW",
          status: "READY",
          label: source.label ? source.label + " Preview" : null,
          fileName: source.id + ".mp3",
          storageKey: previewKey,
          waveformStorageKey: waveformKey,
          mimeType: "audio/mpeg",
          sizeBytes: BigInt(previewStat.size),
          durationMs: previewMetadata.durationMs,
          sampleRateHz: previewMetadata.sampleRateHz,
          bitDepth: previewMetadata.bitDepth,
          channels: previewMetadata.channels,
        },
        update: {
          stemGroupId: source.stemGroupId,
          status: "READY",
          label: source.label ? source.label + " Preview" : null,
          fileName: source.id + ".mp3",
          storageKey: previewKey,
          waveformStorageKey: waveformKey,
          mimeType: "audio/mpeg",
          sizeBytes: BigInt(previewStat.size),
          durationMs: previewMetadata.durationMs,
          sampleRateHz: previewMetadata.sampleRateHz,
          bitDepth: previewMetadata.bitDepth,
          channels: previewMetadata.channels,
        },
      });

      const incompleteSources = await tx.audioAsset.count({
        where: {
          workId: source.workId,
          kind: { in: ["MASTER", "STEM"] },
          status: { in: ["PENDING", "PROCESSING", "FAILED"] },
        },
      });

      if (incompleteSources === 0) {
        await tx.work.updateMany({
          where: {
            id: source.workId,
            status: "PROCESSING",
          },
          data: { status: "READY" },
        });
      }
    });

    return {
      sourceAssetId: source.id,
      previewStorageKey: previewKey,
      waveformStorageKey: waveformKey,
      metadata,
    };
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
