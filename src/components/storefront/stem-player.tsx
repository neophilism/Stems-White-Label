"use client";

import { useEffect, useRef, useState } from "react";

import { trackStorefrontEvent } from "@/lib/analytics-client";
import {
  clampPlaybackOffset,
  formatPlaybackTime,
} from "@/lib/player-state";
import type { PlayerManifest } from "@/lib/player-manifest";

type SourceGroup = {
  id: string;
  label: string;
  hasPreview: boolean;
};

type StemPlayerProps = {
  workSlug: string;
  sourceGroups: SourceGroup[];
  durationMs: number | null;
};

const DRIFT_CORRECTION_SECONDS = 0.08;

export function StemPlayer({
  workSlug,
  sourceGroups,
  durationMs,
}: StemPlayerProps) {
  const [muted, setMuted] = useState<Set<string>>(() => new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedTracks, setLoadedTracks] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(
    durationMs ? durationMs / 1000 : 0,
  );
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const primaryStemIdRef = useRef<string | null>(null);
  const offsetRef = useRef(0);
  const durationRef = useRef(durationMs ? durationMs / 1000 : 0);
  const animationRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  const previewGroupCount = sourceGroups.filter(
    (source) => source.hasPreview,
  ).length;
  const canPlay = previewGroupCount > 0;

  function stopAnimation() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }

  function pauseAllStreams() {
    for (const audio of audioRef.current.values()) {
      audio.pause();
    }
  }

  function clearStreams() {
    pauseAllStreams();

    for (const audio of audioRef.current.values()) {
      audio.removeAttribute("src");
      audio.load();
    }

    audioRef.current.clear();
    primaryStemIdRef.current = null;
  }

  function currentPosition() {
    const primaryId = primaryStemIdRef.current;
    const primary = primaryId ? audioRef.current.get(primaryId) : null;

    if (!primary) return offsetRef.current;

    return clampPlaybackOffset(
      primary.currentTime,
      durationRef.current,
    );
  }

  function applyMuteState(nextMuted: ReadonlySet<string>) {
    for (const [stemGroupId, audio] of audioRef.current.entries()) {
      audio.muted = nextMuted.has(stemGroupId);
      audio.volume = 1;
      audio.defaultPlaybackRate = 1;
      audio.playbackRate = 1;
    }
  }

  function setAllStreamPositions(position: number) {
    for (const audio of audioRef.current.values()) {
      try {
        audio.currentTime = position;
      } catch {
        // Metadata may still be settling for a just-created media element.
      }
    }
  }

  useEffect(() => {
    applyMuteState(muted);
  }, [muted]);

  useEffect(() => {
    return () => {
      stopAnimation();
      clearStreams();
    };
  }, []);

  async function waitUntilPlayable(audio: HTMLAudioElement) {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("A preview stream could not be prepared."));
      };
      const cleanup = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });
  }

  async function loadPlayer() {
    if (isLoaded) return true;

    setIsLoading(true);
    setError(null);
    setLoadedTracks(0);

    try {
      const response = await fetch(
        "/api/works/" + encodeURIComponent(workSlug) + "/audio-manifest",
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Unable to load the stem player.");
      }

      const manifest = (await response.json()) as PlayerManifest;
      const stems = manifest.stems;

      if (stems.length === 0) {
        throw new Error("No stem previews are available for this Work.");
      }

      clearStreams();
      setTotalTracks(stems.length);

      let completed = 0;

      await Promise.all(
        stems.map(async (stem) => {
          const audio = new Audio();
          audio.preload = "auto";
          audio.src = stem.url;
          audio.volume = 1;
          audio.defaultPlaybackRate = 1;
          audio.playbackRate = 1;
          audio.muted = muted.has(stem.stemGroupId);

          await waitUntilPlayable(audio);
          audioRef.current.set(stem.stemGroupId, audio);

          completed += 1;
          setLoadedTracks(completed);
        }),
      );

      primaryStemIdRef.current = stems[0]?.stemGroupId ?? null;

      const mediaDurations = Array.from(audioRef.current.values())
        .map((audio) => audio.duration)
        .filter((value) => Number.isFinite(value) && value > 0);

      const shortestMediaDuration =
        mediaDurations.length > 0 ? Math.min(...mediaDurations) : 0;
      const declaredDuration =
        manifest.durationMs && manifest.durationMs > 0
          ? manifest.durationMs / 1000
          : 0;
      const resolvedDuration =
        declaredDuration > 0 && shortestMediaDuration > 0
          ? Math.min(declaredDuration, shortestMediaDuration)
          : declaredDuration || shortestMediaDuration;

      durationRef.current = resolvedDuration;
      setDurationSeconds(resolvedDuration);
      setIsLoaded(true);
      applyMuteState(muted);

      return true;
    } catch (loadError) {
      clearStreams();
      setIsLoaded(false);
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the stem player.";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function correctStreamDrift(referencePosition: number) {
    for (const [stemGroupId, audio] of audioRef.current.entries()) {
      if (stemGroupId === primaryStemIdRef.current) continue;

      if (Math.abs(audio.currentTime - referencePosition) > DRIFT_CORRECTION_SECONDS) {
        try {
          audio.currentTime = referencePosition;
        } catch {
          // A temporarily unseekable stream will be corrected on a later frame.
        }
      }
    }
  }

  function startAnimation() {
    stopAnimation();

    const tick = () => {
      const position = currentPosition();

      if (
        durationRef.current > 0 &&
        position >= durationRef.current - 0.02
      ) {
        pauseAllStreams();
        offsetRef.current = durationRef.current;
        setPositionSeconds(durationRef.current);
        playingRef.current = false;
        setIsPlaying(false);
        stopAnimation();
        return;
      }

      if (playingRef.current) {
        correctStreamDrift(position);
      }

      offsetRef.current = position;
      setPositionSeconds(position);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
  }

  async function startPlayback(
    alreadyLoaded = false,
    emitAnalytics = true,
  ) {
    const loaded = alreadyLoaded ? true : await loadPlayer();
    if (!loaded) return;

    let offset = offsetRef.current;

    if (
      durationRef.current > 0 &&
      offset >= durationRef.current - 0.02
    ) {
      offset = 0;
      offsetRef.current = 0;
      setPositionSeconds(0);
    }

    setAllStreamPositions(offset);
    applyMuteState(muted);

    const results = await Promise.allSettled(
      Array.from(audioRef.current.values(), (audio) => audio.play()),
    );

    if (results.some((result) => result.status === "rejected")) {
      pauseAllStreams();
      setError("The browser could not start every stem stream together.");
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);
    setError(null);
    startAnimation();

    if (emitAnalytics) {
      trackStorefrontEvent({
        type: "PLAYER_PLAY",
        workSlug,
        positionMs: Math.round(offset * 1000),
      });
    }
  }

  function pausePlayback() {
    const nextOffset = currentPosition();

    stopAnimation();
    pauseAllStreams();

    offsetRef.current = nextOffset;
    setPositionSeconds(nextOffset);
    playingRef.current = false;
    setIsPlaying(false);

    trackStorefrontEvent({
      type: "PLAYER_PAUSE",
      workSlug,
      positionMs: Math.round(nextOffset * 1000),
    });
  }

  async function togglePlayback() {
    if (isLoading) return;

    if (isPlaying) {
      pausePlayback();
      return;
    }

    await startPlayback();
  }

  async function seekTo(nextOffset: number) {
    const clamped = clampPlaybackOffset(
      nextOffset,
      durationRef.current,
    );
    const wasPlaying = isPlaying;

    stopAnimation();
    pauseAllStreams();
    setAllStreamPositions(clamped);

    offsetRef.current = clamped;
    setPositionSeconds(clamped);
    playingRef.current = false;
    setIsPlaying(false);

    if (wasPlaying) {
      await startPlayback(true, false);
    }
  }

  function toggleMute(stemGroupId: string) {
    const willUnmute = muted.has(stemGroupId);

    setMuted((current) => {
      const next = new Set(current);

      if (next.has(stemGroupId)) {
        next.delete(stemGroupId);
      } else {
        next.add(stemGroupId);
      }

      return next;
    });

    trackStorefrontEvent({
      type: willUnmute ? "STEM_UNMUTE" : "STEM_MUTE",
      workSlug,
      stemGroupId,
      positionMs: Math.round(currentPosition() * 1000),
    });
  }

  function unmuteAll() {
    setMuted(new Set());
    trackStorefrontEvent({
      type: "ALL_SOURCES",
      workSlug,
      positionMs: Math.round(currentPosition() * 1000),
    });
  }

  return (
    <div className="stem-player">
      <div className="stem-player__transport">
        <button
          className="stem-player__play"
          disabled={!canPlay || isLoading}
          onClick={() => void togglePlayback()}
          type="button"
        >
          <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
          <span>
            {isLoading
              ? "Loading"
              : isPlaying
                ? "Pause"
                : isLoaded
                  ? "Play all stems"
                  : "Load & play all stems"}
          </span>
        </button>

        <div className="stem-player__mode-controls">
          <button
            disabled={muted.size === 0 || !canPlay}
            onClick={unmuteAll}
            type="button"
          >
            Unmute all
          </button>
        </div>
      </div>

      <div className="stem-player__timeline">
        <span>{formatPlaybackTime(positionSeconds)}</span>
        <input
          aria-label="Playback position"
          disabled={!isLoaded || durationSeconds <= 0}
          max={durationSeconds || 1}
          min={0}
          onChange={(event) => void seekTo(Number(event.target.value))}
          step={0.01}
          type="range"
          value={Math.min(positionSeconds, durationSeconds || 0)}
        />
        <span>{formatPlaybackTime(durationSeconds)}</span>
      </div>

      <div className="stem-player__status-row">
        <div>
          <span
            className={
              "stem-player__status-light" +
              (error ? " stem-player__status-light--error" : "")
            }
            aria-hidden="true"
          />
          <span>
            {error
              ? error
              : isLoading
                ? "Preparing " + loadedTracks + " of " + totalTracks + " synchronized streams"
                : isLoaded
                  ? muted.size +
                    " muted · " +
                    (previewGroupCount - muted.size) +
                    " audible"
                  : canPlay
                    ? previewGroupCount + " synchronized stem streams available"
                    : "No stem previews are registered yet"}
          </span>
        </div>
      </div>

      {sourceGroups.length > 0 ? (
        <div className="stem-player__sources">
          {sourceGroups.map((source, index) => {
            const isMuted = muted.has(source.id);

            return (
              <div
                className={
                  "stem-player__source" +
                  (source.hasPreview && !isMuted
                    ? " stem-player__source--active"
                    : "") +
                  (!source.hasPreview
                    ? " stem-player__source--unavailable"
                    : "")
                }
                key={source.id}
              >
                <span className="stem-player__source-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="stem-player__source-name">{source.label}</span>
                <span className="stem-player__source-state">
                  {source.hasPreview
                    ? isMuted
                      ? "Muted"
                      : "Audible"
                    : "Preview pending"}
                </span>
                <div className="stem-player__source-controls">
                  <button
                    aria-label={
                      (isMuted ? "Unmute " : "Mute ") + source.label
                    }
                    aria-pressed={isMuted}
                    disabled={!source.hasPreview}
                    onClick={() => toggleMute(source.id)}
                    type="button"
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
