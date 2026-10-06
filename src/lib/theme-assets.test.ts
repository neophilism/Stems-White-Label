import assert from "node:assert/strict";
import test from "node:test";

import {
  themeAssetStorageKey,
  validateThemeAssetUpload,
} from "./theme-assets";

test("brand logos reject active SVG content", () => {
  assert.throws(() =>
    validateThemeAssetUpload({
      kind: "LOGO",
      fileName: "logo.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 1200,
    }),
  );
});

test("favicon supports ICO and stays tenant-scoped in storage", () => {
  const validated = validateThemeAssetUpload({
    kind: "FAVICON",
    fileName: "favicon.ico",
    mimeType: "image/x-icon",
    sizeBytes: 8000,
  });
  assert.equal(validated.extension, "ico");
  assert.equal(
    themeAssetStorageKey({
      tenantId: "tenant-a",
      assetId: "asset-a",
      kind: "FAVICON",
      extension: validated.extension,
    }),
    "tenants/tenant-a/theme/favicon/asset-a.ico",
  );
});
