"use client";

export type StorefrontAnalyticsEvent =
  | "WORK_VIEW"
  | "PLAYER_PLAY"
  | "PLAYER_PAUSE"
  | "STEM_MUTE"
  | "STEM_UNMUTE"
  | "STEM_SOLO"
  | "STEM_UNSOLO"
  | "ALL_SOURCES"
  | "FULL_MIX"
  | "REVEAL_START"
  | "REVEAL_COMPLETE";

export function trackStorefrontEvent(input: {
  type: StorefrontAnalyticsEvent;
  workSlug: string;
  stemGroupId?: string | null;
  positionMs?: number | null;
}) {
  if (typeof window === "undefined") return;

  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "_")
      : "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      type: input.type,
      workSlug: input.workSlug,
      stemGroupId: input.stemGroupId ?? null,
      positionMs:
        input.positionMs == null
          ? null
          : Math.max(0, Math.round(input.positionMs)),
    }),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}
