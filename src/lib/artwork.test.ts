import assert from "node:assert/strict";
import test from "node:test";

import {
  signArtworkAccess,
  validateArtworkUpload,
  verifyArtworkAccess,
} from "./artwork";

test("artwork upload accepts supported image formats", () => {
  assert.equal(
    validateArtworkUpload({
      fileName: "cover.webp",
      mimeType: "image/webp",
      sizeBytes: 1024,
    }).extension,
    "webp",
  );
});

test("artwork upload rejects unsupported types and oversize payloads", () => {
  assert.throws(() =>
    validateArtworkUpload({
      fileName: "cover.gif",
      mimeType: "image/gif",
      sizeBytes: 1024,
    }),
  );
  assert.throws(() =>
    validateArtworkUpload({
      fileName: "cover.png",
      mimeType: "image/png",
      sizeBytes: 21 * 1024 * 1024,
    }),
  );
});

test("artwork signatures are purpose and asset bound", () => {
  const secret = "artwork-test";
  const signed = signArtworkAccess("a1", 2_000_000_000, secret);
  assert.equal(
    verifyArtworkAccess("a1", signed.expiresAtSeconds, signed.signature, 1_900_000_000, secret),
    true,
  );
  assert.equal(
    verifyArtworkAccess("a2", signed.expiresAtSeconds, signed.signature, 1_900_000_000, secret),
    false,
  );
});
