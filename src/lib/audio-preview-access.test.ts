import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPreviewOriginUrl,
  signPreviewAccess,
  signWaveformAccess,
  verifyPreviewAccess,
  verifyWaveformAccess,
} from "./audio-preview-access";

test("preview signatures validate only before expiry", () => {
  const secret = "test-preview-secret";
  const signed = signPreviewAccess("asset-123", 1_800_000_100, secret);

  assert.equal(
    verifyPreviewAccess(
      "asset-123",
      signed.expiresAtSeconds,
      signed.signature,
      1_800_000_000,
      secret,
    ),
    true,
  );

  assert.equal(
    verifyPreviewAccess(
      "asset-123",
      signed.expiresAtSeconds,
      signed.signature,
      1_800_000_101,
      secret,
    ),
    false,
  );
});

test("preview signatures are bound to one asset", () => {
  const secret = "test-preview-secret";
  const signed = signPreviewAccess("asset-123", 1_800_000_100, secret);

  assert.equal(
    verifyPreviewAccess(
      "asset-999",
      signed.expiresAtSeconds,
      signed.signature,
      1_800_000_000,
      secret,
    ),
    false,
  );
});

test("preview origin URLs preserve nested storage keys", () => {
  assert.equal(
    buildPreviewOriginUrl(
      "https://media.example.test/previews",
      "tenant/work/horn section 1.opus",
    ).toString(),
    "https://media.example.test/previews/tenant/work/horn%20section%201.opus",
  );
});

test("preview origin URL rejects path traversal", () => {
  assert.throws(() =>
    buildPreviewOriginUrl("https://media.example.test", "../secret.wav"),
  );
});


test("waveform signatures are purpose-separated from audio preview signatures", () => {
  const secret = "test-preview-secret";
  const expires = 1_800_000_100;
  const waveform = signWaveformAccess("asset-123", expires, secret);
  const preview = signPreviewAccess("asset-123", expires, secret);

  assert.notEqual(waveform.signature, preview.signature);
  assert.equal(
    verifyWaveformAccess(
      "asset-123",
      expires,
      waveform.signature,
      1_800_000_000,
      secret,
    ),
    true,
  );
  assert.equal(
    verifyWaveformAccess(
      "asset-123",
      expires,
      preview.signature,
      1_800_000_000,
      secret,
    ),
    false,
  );
});
