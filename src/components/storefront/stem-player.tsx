"use client";

import { useEffect, useRef, useState } from "react";

import {
  clampPlaybackOffset,
  formatPlaybackTime,
  stemIsAudible,
  type PlaybackMode,
} from "@/lib/player-state";
import type { PlayerManifest } from "@/lib/player-manifest";

type SourceGroup = {
  id: string;
  label: string;
  hasPreview: boolean;
};

type StemPlayerProps = {
  workSlug: string;
  hasFullMix: boolean;
  sourceGroups: SourceGroup[];
  durationMs: number | null;
};

const FULL_MIX_KEY = "__full_mix__";

function stemKey(stemGroupId: string) {
  return "stem:" + stemGroupId;
}

export function StemPlayer({
  workSlug,
  hasFullMix,
  sourceGroups,
  durationMs,
}: StemPlayerProps) {
  const [mode, setMode] = useState<PlaybackMode>(
    hasFullMix ? "full" : "stems",
  );
  const [muted, setMuted] = useState<Set<string>>(() => new Set());
  const [soloed, setSoloed] = useState<Set<string>>(() => new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedTracks, setLoadedTracks] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(
    durationMs ? durationMs / 1000 : 0,
  );
  const [masterVolume, setMasterVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const contextRef = useRef<AudioContext | null>(null);
  const manifestRef = useRef<PlayerManifest | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const gainsRef = useRef<Map<string, GainNode>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const durationRef = useRef(durationMs ? durationMs / 1000 : 0);
  const animationRef = useRef<number | null>(null);

  const previewGroupCount = sourceGroups.filter(
    (source) => source.hasPreview,
  ).length;
  const playableTrackCount = previewGroupCount + (hasFullMix ? 1 : 0);
  const canPlay = playableTrackCount > 0;

  function stopSources() {
    for (const source of sourcesRef.current.values()) {
      try {
        source.stop();
      } catch {
        // Source may already have naturally ended.
      }
      source.disconnect();
    }

    sourcesRef.current.clear();
  }

  function stopAnimation() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }

  function currentPosition() {
    const context = contextRef.current;

    if (!context || !isPlaying) {
      return offsetRef.current;
    }

    return clampPlaybackOffset(
      context.currentTime - startedAtRef.current,
      durationRef.current,
    );
  }

  function updateTrackGains() {
    const context = contextRef.current;
    if (!context) return;

    for (const [key, gain] of gainsRef.current.entries()) {
      let audible = false;

      if (key === FULL_MIX_KEY) {
        audible = mode === "full";
      } else {
        const stemGroupId = key.replace(/^stem:/, "");
        audible = stemIsAudible(stemGroupId, mode, muted, soloed);
      }

      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(audible ? 1 : 0, context.currentTime, 0.008);
    }
  }

  useEffect(() => {
    updateTrackGains();
  }, [mode, muted, soloed]);

  useEffect(() => {
    const context = contextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain) return;

    masterGain.gain.cancelScheduledValues(context.currentTime);
    masterGain.gain.setTargetAtTime(
      masterVolume,
      context.currentTime,
      0.008,
    );
  }, [masterVolume]);

  useEffect(() => {
    return () => {
      stopAnimation();
      stopSources();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") {
        void context.close();
      }
    };
  }, []);

  async function loadPlayer() {
    if (isLoaded) return true;

    setIsLoading(true);
    setError(null);
    setLoadedTracks(0);

    try {
      const manifestResponse = await fetch(
        "/api/works/" + encodeURIComponent(workSlug) + "/audio-manifest",
        {
          cache: "no-store",
        },
      );

      if (!manifestResponse.ok) {
        const payload = (await manifestResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Unable to load the listening room.");
      }

      const manifest = (await manifestResponse.json()) as PlayerManifest;
      const tracks = [
        ...(manifest.fullMix
          ? [{ key: FULL_MIX_KEY, track: manifest.fullMix }]
          : []),
        ...manifest.stems.map((track) => ({
          key: stemKey(track.stemGroupId),
          track,
        })),
      ];

      if (tracks.length === 0) {
        throw new Error("No listening previews are available for this Work.");
      }

      setTotalTracks(tracks.length);

      const AudioContextConstructor =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("This browser does not support the Web Audio API.");
      }

      const context = new AudioContextConstructor();
      const masterGain = context.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(context.destination);

      contextRef.current = context;
      masterGainRef.current = masterGain;
      manifestRef.current = manifest;

      let completed = 0;

      await Promise.all(
        tracks.map(async ({ key, track }) => {
          const response = await fetch(track.url, {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("A preview source could not be loaded.");
          }

          const encodedAudio = await response.arrayBuffer();
          const buffer = await context.decodeAudioData(encodedAudio.slice(0));

          const gain = context.createGain();
          gain.gain.value = 0;
          gain.connect(masterGain);

          buffersRef.current.set(key, buffer);
          gainsRef.current.set(key, gain);

          completed += 1;
          setLoadedTracks(completed);
        }),
      );

      const bufferDuration = Math.max(
        ...Array.from(buffersRef.current.values()).map(
          (buffer) => buffer.duration,
        ),
      );
      const resolvedDuration =
        manifest.durationMs && manifest.durationMs > 0
          ? Math.min(manifest.durationMs / 1000, bufferDuration)
          : bufferDuration;

      durationRef.current = resolvedDuration;
      setDurationSeconds(resolvedDuration);
      setIsLoaded(true);
      updateTrackGains();

      return true;
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the listening room.";

      stopSources();
      gainsRef.current.clear();
      buffersRef.current.clear();

      const context = contextRef.current;
      contextRef.current = null;
      masterGainRef.current = null;
      manifestRef.current = null;

      if (context && context.state !== "closed") {
        await context.close().catch(() => undefined);
      }

      setError(message);
      setIsLoaded(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function startAnimation() {
    stopAnimation();

    const tick = () => {
      const nextPosition = currentPosition();

      if (nextPosition >= durationRef.current && durationRef.current > 0) {
        stopSources();
        offsetRef.current = durationRef.current;
        setPositionSeconds(durationRef.current);
        setIsPlaying(false);
        stopAnimation();
        return;
      }

      setPositionSeconds(nextPosition);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
  }

  async function startPlayback() {
    const loaded = await loadPlayer();
    if (!loaded) return;

    const context = contextRef.current;
    if (!context) return;

    if (context.state === "suspended") {
      await context.resume();
    }

    let offset = offsetRef.current;

    if (
      durationRef.current > 0 &&
      offset >= durationRef.current - 0.02
    ) {
      offset = 0;
      offsetRef.current = 0;
      setPositionSeconds(0);
    }

    stopSources();

    const scheduledStart = context.currentTime + 0.06;

    for (const [key, buffer] of buffersRef.current.entries()) {
      if (offset >= buffer.duration) continue;

      const gain = gainsRef.current.get(key);
      if (!gain) continue;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(scheduledStart, offset);
      sourcesRef.current.set(key, source);
    }

    startedAtRef.current = scheduledStart - offset;
    setIsPlaying(true);
    startAnimation();
  }

  function pausePlayback() {
    const nextOffset = currentPosition();

    stopAnimation();
    stopSources();

    offsetRef.current = nextOffset;
    setPositionSeconds(nextOffset);
    setIsPlaying(false);
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
    stopSources();
    offsetRef.current = clamped;
    setPositionSeconds(clamped);
    setIsPlaying(false);

    if (wasPlaying) {
      await startPlayback();
    }
  }

  function toggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    stemGroupId: string,
  ) {
    setter((current) => {
      const next = new Set(current);

      if (next.has(stemGroupId)) {
        next.delete(stemGroupId);
      } else {
        next.add(stemGroupId);
      }

      return next;
    });
  }

  function toggleMute(stemGroupId: string) {
    setMode("stems");
    toggleSet(setMuted, stemGroupId);
  }

  function toggleSolo(stemGroupId: string) {
    setMode("stems");
    toggleSet(setSoloed, stemGroupId);
  }

  function useAllSources() {
    setMode("stems");
    setMuted(new Set());
    setSoloed(new Set());
  }

  function resetMix() {
    setMuted(new Set());
    setSoloed(new Set());
    setMode(hasFullMix ? "full" : "stems");
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
                  ? "Play"
                  : "Load & play"}
          </span>
        </button>

        <div className="stem-player__mode-controls">
          <button
            aria-pressed={mode === "full"}
            disabled={!hasFullMix}
            onClick={() => setMode("full")}
            type="button"
          >
            Full Mix
          </button>
          <button
            aria-pressed={mode === "stems" && muted.size === 0 && soloed.size === 0}
            disabled={previewGroupCount === 0}
            onClick={useAllSources}
            type="button"
          >
            All Sources
          </button>
          <button disabled={!canPlay} onClick={resetMix} type="button">
            Reset Mix
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
                ? "Preparing " + loadedTracks + " of " + totalTracks + " preview sources"
                : isLoaded
                  ? "Synchronized source clock ready"
                  : canPlay
                    ? playableTrackCount + " preview sources available"
                    : "No preview sources are registered yet"}
          </span>
        </div>

        <label className="stem-player__volume">
          <span>Volume</span>
          <input
            aria-label="Master volume"
            max={1}
            min={0}
            onChange={(event) => setMasterVolume(Number(event.target.value))}
            step={0.01}
            type="range"
            value={masterVolume}
          />
        </label>
      </div>

      {sourceGroups.length > 0 ? (
        <div className="stem-player__sources">
          {sourceGroups.map((source, index) => {
            const isMuted = muted.has(source.id);
            const isSoloed = soloed.has(source.id);
            const audible = source.hasPreview
              ? stemIsAudible(source.id, mode, muted, soloed)
              : false;

            return (
              <div
                className={
                  "stem-player__source" +
                  (audible ? " stem-player__source--active" : "") +
                  (!source.hasPreview ? " stem-player__source--unavailable" : "")
                }
                key={source.id}
              >
                <span className="stem-player__source-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="stem-player__source-name">{source.label}</span>
                <span className="stem-player__source-state">
                  {source.hasPreview
                    ? audible
                      ? "In mix"
                      : "Silent"
                    : "Preview pending"}
                </span>
                <div className="stem-player__source-controls">
                  <button
                    aria-label={"Mute " + source.label}
                    aria-pressed={isMuted}
                    disabled={!source.hasPreview}
                    onClick={() => toggleMute(source.id)}
                    type="button"
                  >
                    M
                  </button>
                  <button
                    aria-label={"Solo " + source.label}
                    aria-pressed={isSoloed}
                    disabled={!source.hasPreview}
                    onClick={() => toggleSolo(source.id)}
                    type="button"
                  >
                    S
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
