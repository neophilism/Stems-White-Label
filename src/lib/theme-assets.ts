import type { ThemeAssetKind } from "@prisma/client";

const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const FAVICON_MAX_BYTES = 1024 * 1024;

const LOGO_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const FAVICON_TYPES = new Map([
  ["image/png", "png"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
  ["image/webp", "webp"],
]);

export function validateThemeAssetUpload(input: {
  kind: ThemeAssetKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const fileName = input.fileName.trim().slice(0, 255);
  const mimeType = input.mimeType.trim().toLowerCase();
  const allowed = input.kind === "LOGO" ? LOGO_TYPES : FAVICON_TYPES;
  const maxBytes = input.kind === "LOGO" ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES;

  if (!fileName) throw new Error("Brand asset file name is required.");
  if (!allowed.has(mimeType)) {
    throw new Error(
      input.kind === "LOGO"
        ? "Logo must be PNG, JPEG, or WebP."
        : "Favicon must be PNG, ICO, or WebP.",
    );
  }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Brand asset size must be a positive integer.");
  }
  if (input.sizeBytes > maxBytes) {
    throw new Error(
      input.kind === "LOGO"
        ? "Logo cannot exceed 5 MB."
        : "Favicon cannot exceed 1 MB.",
    );
  }

  return {
    kind: input.kind,
    fileName,
    mimeType,
    sizeBytes: input.sizeBytes,
    extension: allowed.get(mimeType)!,
  };
}

export function themeAssetStorageKey(input: {
  tenantId: string;
  assetId: string;
  kind: ThemeAssetKind;
  extension: string;
}) {
  return [
    "tenants",
    input.tenantId,
    "theme",
    input.kind.toLowerCase(),
    input.assetId + "." + input.extension,
  ].join("/");
}
