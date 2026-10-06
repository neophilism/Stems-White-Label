import assert from "node:assert/strict";
import test from "node:test";

import {
  clampPlaybackOffset,
  formatPlaybackTime,
  stemIsAudible,
  waveformPolygon,
} from "./player-state";

test("full mix mode silences stem previews", () => {
  assert.equal(
    stemIsAudible("horns-1", "full", new Set(), new Set()),
    false,
  );
});

test("stem mode supports multiple simultaneous solo selections", () => {
  const soloed = new Set(["drums", "horns-1"]);

  assert.equal(stemIsAudible("drums", "stems", new Set(), soloed), true);
  assert.equal(stemIsAudible("horns-1", "stems", new Set(), soloed), true);
  assert.equal(stemIsAudible("bass", "stems", new Set(), soloed), false);
});

test("mute applies only when there are no solo selections", () => {
  assert.equal(
    stemIsAudible("bass", "stems", new Set(["bass"]), new Set()),
    false,
  );

  assert.equal(
    stemIsAudible(
      "bass",
      "stems",
      new Set(["bass"]),
      new Set(["bass"]),
    ),
    true,
  );
});

test("playback helpers clamp offsets and format elapsed time", () => {
  assert.equal(clampPlaybackOffset(-3, 240), 0);
  assert.equal(clampPlaybackOffset(500, 240), 240);
  assert.equal(formatPlaybackTime(245.9), "4:05");
});


test("waveform polygon clamps amplitudes and mirrors around center", () => {
  const polygon = waveformPolygon([0, 0.5, 2], 100, 20);
  const points = polygon.split(" ");

  assert.equal(points.length, 6);
  assert.equal(points[0], "0.00,10.00");
  assert.equal(points[2], "100.00,1.00");
  assert.equal(points[3], "100.00,19.00");
});
