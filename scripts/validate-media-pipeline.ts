import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  generateWaveform,
  probeAudio,
  sha256File,
  transcodePreview,
} from "../src/lib/media-processing";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "stems-media-validation-"));
  const source = join(directory, "source.wav");
  const preview = join(directory, "preview.mp3");
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

  try {
    const generated = spawnSync(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s24le",
        source,
      ],
      { encoding: "utf8" },
    );

    assert.equal(
      generated.status,
      0,
      "FFmpeg fixture generation failed: " + generated.stderr,
    );

    const sourceMetadata = await probeAudio(source);
    assert.equal(sourceMetadata.sampleRateHz, 48000);
    assert.equal(sourceMetadata.channels, 2);
    assert.ok(sourceMetadata.durationMs >= 900 && sourceMetadata.durationMs <= 1100);

    const checksum = await sha256File(source);
    assert.match(checksum, /^[a-f0-9]{64}$/);

    await transcodePreview(source, preview);
    const previewMetadata = await probeAudio(preview);
    assert.equal(previewMetadata.sampleRateHz, 44100);
    assert.ok(previewMetadata.durationMs >= 900 && previewMetadata.durationMs <= 1200);

    const waveform = await generateWaveform(source);
    assert.equal(waveform.version, 1);
    assert.equal(waveform.sampleRateHz, 2000);
    assert.ok(waveform.points.length > 0);
    assert.ok(waveform.points.every((point) => point >= 0 && point <= 1));

    console.log("Media pipeline integration validation passed.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
