import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../components/storefront/stem-player.tsx", import.meta.url),
  "utf8",
);

test("public stem player exposes mute-only source controls", () => {
  assert.match(source, /toggleMute/);
  assert.match(source, />Mute</);
  assert.match(source, />Unmute</);
  assert.match(source, /Play all stems/);

  assert.doesNotMatch(source, /toggleSolo/);
  assert.doesNotMatch(source, /Master volume/);
  assert.doesNotMatch(source, />Full Mix</);
  assert.doesNotMatch(source, /Reveal the Record/);
  assert.doesNotMatch(source, /setMasterVolume/);
});

test("public stem player does not add audio tags or watermark playback", () => {
  assert.doesNotMatch(source, /watermark/i);
  assert.doesNotMatch(source, /audio tag/i);
  assert.doesNotMatch(source, /tagged preview/i);
});
