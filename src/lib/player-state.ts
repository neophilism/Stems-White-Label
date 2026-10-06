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

export function waveformPolygon(
  points: ReadonlyArray<number>,
  width = 1000,
  height = 100,
) {
  if (points.length === 0) return "";

  const half = height / 2;
  const scaleY = half * 0.9;
  const denominator = Math.max(1, points.length - 1);
  const top = points.map((point, index) => {
    const x = (index / denominator) * width;
    const amplitude = Math.max(0, Math.min(1, Number(point) || 0));
    return x.toFixed(2) + "," + (half - amplitude * scaleY).toFixed(2);
  });
  const bottom = [...points].reverse().map((point, reverseIndex) => {
    const index = points.length - 1 - reverseIndex;
    const x = (index / denominator) * width;
    const amplitude = Math.max(0, Math.min(1, Number(point) || 0));
    return x.toFixed(2) + "," + (half + amplitude * scaleY).toFixed(2);
  });

  return [...top, ...bottom].join(" ");
}
