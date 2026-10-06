export type PlaybackMode = "full" | "stems";

export function stemIsAudible(
  stemGroupId: string,
  mode: PlaybackMode,
  muted: ReadonlySet<string>,
  soloed: ReadonlySet<string>,
) {
  if (mode !== "stems") return false;

  if (soloed.size > 0) {
    return soloed.has(stemGroupId);
  }

  return !muted.has(stemGroupId);
}

export function clampPlaybackOffset(offsetSeconds: number, durationSeconds: number) {
  if (!Number.isFinite(offsetSeconds) || durationSeconds <= 0) return 0;
  return Math.min(Math.max(0, offsetSeconds), durationSeconds);
}

export function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;

  return minutes + ":" + String(remainder).padStart(2, "0");
}
