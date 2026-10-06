import path from "node:path";

const AUDIO_EXTENSIONS = new Set([
  ".wav",
  ".wave",
  ".aif",
  ".aiff",
  ".flac",
  ".mp3",
  ".m4a",
  ".mp4",
  ".caf",
]);

const AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/flac",
  "audio/x-flac",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/x-caf",
  "application/octet-stream",
]);

export type SourceUploadKind = "MASTER" | "STEM";

export function sourceUploadMaxBytes() {
  const configured = Number(process.env.SOURCE_UPLOAD_MAX_BYTES);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : 8 * 1024 * 1024 * 1024;
}

export function sanitizeUploadFileName(fileName: string) {
  const base = path.basename(fileName.trim());
  const normalized = base
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("Invalid file name.");
  }

  return normalized.slice(0, 180);
}

export function validateSourceUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  stemGroupId?: string | null;
}) {
  const fileName = sanitizeUploadFileName(input.fileName);
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = input.mimeType.trim().toLowerCase();

  if (input.kind !== "MASTER" && input.kind !== "STEM") {
    throw new Error("Only MASTER and STEM source uploads are accepted.");
  }

  if (!AUDIO_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported audio file extension.");
  }

  if (mimeType && !AUDIO_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported audio MIME type.");
  }

  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > sourceUploadMaxBytes()
  ) {
    throw new Error("Source file size is invalid or exceeds the configured limit.");
  }

  if (input.kind === "MASTER" && input.stemGroupId) {
    throw new Error("MASTER uploads cannot target a StemGroup.");
  }

  if (input.kind === "STEM" && !input.stemGroupId) {
    throw new Error("STEM uploads require a StemGroup.");
  }

  return {
    fileName,
    mimeType: mimeType || "application/octet-stream",
    sizeBytes: input.sizeBytes,
    kind: input.kind as SourceUploadKind,
    stemGroupId: input.stemGroupId ?? null,
  };
}

export function sourceStorageKey(input: {
  tenantId: string;
  workId: string;
  assetId: string;
  fileName: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "works",
    input.workId,
    "originals",
    input.assetId,
    sanitizeUploadFileName(input.fileName),
  ].join("/");
}

export function previewStorageKey(input: {
  tenantId: string;
  workId: string;
  sourceAssetId: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "works",
    input.workId,
    "previews",
    input.sourceAssetId + ".mp3",
  ].join("/");
}

export function waveformStorageKey(input: {
  tenantId: string;
  workId: string;
  sourceAssetId: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "works",
    input.workId,
    "waveforms",
    input.sourceAssetId + ".json",
  ].join("/");
}
