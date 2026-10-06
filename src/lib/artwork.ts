import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_ARTWORK_BYTES = 20 * 1024 * 1024;
const ARTWORK_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ARTWORK_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function accessSecret() {
  const secret = process.env.PREVIEW_URL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("A signing secret is required.");
  return secret;
}

export function validateArtworkUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const fileName = input.fileName.trim().slice(0, 255);
  const mimeType = input.mimeType.trim().toLowerCase();
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (!fileName || !ARTWORK_EXTENSIONS.has(extension)) {
    throw new Error("Artwork must be JPG, PNG, or WebP.");
  }
  if (!ARTWORK_TYPES.has(mimeType)) {
    throw new Error("Artwork MIME type must be JPEG, PNG, or WebP.");
  }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Artwork size must be a positive integer.");
  }
  if (input.sizeBytes > MAX_ARTWORK_BYTES) {
    throw new Error("Artwork cannot exceed 20 MB.");
  }

  return { fileName, mimeType, sizeBytes: input.sizeBytes, extension };
}

export function artworkStorageKey(input: {
  tenantId: string;
  workId: string;
  assetId: string;
  extension: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "works",
    input.workId,
    "artwork",
    input.assetId + "." + input.extension,
  ].join("/");
}

export function signArtworkAccess(
  assetId: string,
  expiresAtSeconds = Math.floor(Date.now() / 1000) + 10 * 60,
  secret = accessSecret(),
) {
  const payload = "artwork." + assetId + "." + expiresAtSeconds;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return { expiresAtSeconds, signature };
}

export function verifyArtworkAccess(
  assetId: string,
  expiresAtSeconds: number,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret = accessSecret(),
) {
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= nowSeconds) {
    return false;
  }
  const expected = signArtworkAccess(assetId, expiresAtSeconds, secret).signature;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature || "");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function signedArtworkPath(assetId: string) {
  const signed = signArtworkAccess(assetId);
  return (
    "/api/artwork/" +
    encodeURIComponent(assetId) +
    "?exp=" +
    signed.expiresAtSeconds +
    "&sig=" +
    encodeURIComponent(signed.signature)
  );
}
