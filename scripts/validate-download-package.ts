import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { ZipArchive } from "archiver";

const execFileAsync = promisify(execFile);

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "stems-package-validation-"));
  const zipPath = join(dir, "package.zip");

  try {
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const output = createWriteStream(zipPath);
    archive.pipe(output);

    const closed = new Promise<void>((resolve, reject) => {
      output.once("close", resolve);
      output.once("error", reject);
      archive.once("error", reject);
    });

    archive.append(Buffer.from("license record\n"), { name: "LICENSE.txt" });
    archive.append(Buffer.from("audio source bytes"), { name: "Horn Section.wav" });
    await archive.finalize();
    await closed;

    const result = await execFileAsync("unzip", ["-t", zipPath]);
    assert.match(result.stdout, /No errors detected/);

    console.log("Download ZIP package integration validation passed.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
