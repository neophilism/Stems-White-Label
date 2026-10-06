import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 10 * 60;

function getPreviewSecret() {
  const secret = process.env.PREVIEW_URL_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "PREVIEW_URL_SECRET or NEXTAUTH_SECRET is required for preview delivery.",
    );
  }

  return secret;
}

export function signPreviewAccess(
  assetId: string,
  expiresAtSeconds = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS,
  secret = getPreviewSecret(),
) {
  const payload = assetId + "." + expiresAtSeconds;
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return {
    expiresAtSeconds,
    signature,
  };
}

export function verifyPreviewAccess(
  assetId: string,
  expiresAtSeconds: number,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret = getPreviewSecret(),
) {
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= nowSeconds) {
    return false;
  }

  if (!signature) return false;

  const expected = signPreviewAccess(assetId, expiresAtSeconds, secret).signature;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function signedPreviewPath(assetId: string) {
  const { expiresAtSeconds, signature } = signPreviewAccess(assetId);

  return (
    "/api/audio-preview/" +
    encodeURIComponent(assetId) +
    "?exp=" +
    expiresAtSeconds +
    "&sig=" +
    encodeURIComponent(signature)
  );
}

export function signWaveformAccess(
  assetId: string,
  expiresAtSeconds = Math.floor(Date.now() / 1000) + 10 * 60,
  secret = process.env.PREVIEW_URL_SECRET || process.env.NEXTAUTH_SECRET || "",
) {
  if (!secret) {
    throw new Error(
      "PREVIEW_URL_SECRET or NEXTAUTH_SECRET is required for waveform delivery.",
    );
  }

  const payload = "waveform." + assetId + "." + expiresAtSeconds;
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return { expiresAtSeconds, signature };
}

export function verifyWaveformAccess(
  assetId: string,
  expiresAtSeconds: number,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret = process.env.PREVIEW_URL_SECRET || process.env.NEXTAUTH_SECRET || "",
) {
  if (
    !secret ||
    !Number.isSafeInteger(expiresAtSeconds) ||
    expiresAtSeconds <= nowSeconds ||
    !signature
  ) {
    return false;
  }

  const expected = signWaveformAccess(
    assetId,
    expiresAtSeconds,
    secret,
  ).signature;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function signedWaveformPath(assetId: string) {
  const { expiresAtSeconds, signature } = signWaveformAccess(assetId);

  return (
    "/api/audio-waveform/" +
    encodeURIComponent(assetId) +
    "?exp=" +
    expiresAtSeconds +
    "&sig=" +
    encodeURIComponent(signature)
  );
}

export function buildPreviewOriginUrl(baseUrl: string, storageKey: string) {
  const segments = storageKey.split("/").filter(Boolean);

  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Invalid preview storage key.");
  }

  const base = new URL(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const prefix = base.pathname.endsWith("/") ? base.pathname : base.pathname + "/";
  base.pathname = prefix + segments.map(encodeURIComponent).join("/");

  return base;
}
