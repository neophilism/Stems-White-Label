import assert from "node:assert/strict";
import test from "node:test";

import { parseFfprobeMetadata, pcm16ToWaveform } from "./media-processing";

test("parses technical metadata from an audio stream", () => {
  assert.deepEqual(
    parseFfprobeMetadata({
      streams: [
        {
          codec_type: "audio",
          sample_rate: "96000",
          bits_per_raw_sample: "24",
          channels: 2,
        },
      ],
      format: { duration: "245.125" },
    }),
    {
      durationMs: 245125,
      sampleRateHz: 96000,
      bitDepth: 24,
      channels: 2,
    },
  );
});

test("rejects uploads that contain no audio stream", () => {
  assert.throws(() =>
    parseFfprobeMetadata({
      streams: [{ codec_type: "video" }],
      format: { duration: "12" },
    }),
  );
});

test("builds normalized waveform peaks from PCM", () => {
  const pcm = Buffer.alloc(8);
  pcm.writeInt16LE(0, 0);
  pcm.writeInt16LE(16384, 2);
  pcm.writeInt16LE(-32768, 4);
  pcm.writeInt16LE(8192, 6);

  assert.deepEqual(pcm16ToWaveform(pcm, 2, 2000), {
    version: 1,
    sampleRateHz: 2000,
    points: [0.5, 1],
  });
});
