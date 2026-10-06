import type { PlaybackMode } from "@/lib/player-state";

export type RevealAction =
  | "ADD_SOURCE"
  | "REMOVE_SOURCE"
  | "ALL_SOURCES"
  | "FULL_MIX"
  | "SILENCE";

export type RevealStepState = {
  atMs: number;
  action: RevealAction;
  stemGroupId: string | null;
  caption: string | null;
};

export type ResolvedRevealState = {
  mode: PlaybackMode;
  muted: Set<string>;
  caption: string | null;
  stepIndex: number;
};

export function validateRevealStep(step: RevealStepState) {
  if (!Number.isSafeInteger(step.atMs) || step.atMs < 0) {
    throw new Error("Reveal step time must be a non-negative integer.");
  }

  const requiresStem =
    step.action === "ADD_SOURCE" || step.action === "REMOVE_SOURCE";

  if (requiresStem && !step.stemGroupId) {
    throw new Error(step.action + " requires a stemGroupId.");
  }

  if (!requiresStem && step.stemGroupId) {
    throw new Error(step.action + " cannot target a stem group.");
  }

  return step;
}

export function resolveRevealState(
  steps: ReadonlyArray<RevealStepState>,
  positionMs: number,
  availableStemGroupIds: ReadonlySet<string>,
): ResolvedRevealState {
  const muted = new Set(availableStemGroupIds);
  let mode: PlaybackMode = "stems";
  let caption: string | null = null;
  let stepIndex = -1;

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];

    if (step.atMs > positionMs) break;

    stepIndex = index;
    if (step.caption) caption = step.caption;

    switch (step.action) {
      case "ADD_SOURCE":
        if (step.stemGroupId && availableStemGroupIds.has(step.stemGroupId)) {
          mode = "stems";
          muted.delete(step.stemGroupId);
        }
        break;
      case "REMOVE_SOURCE":
        if (step.stemGroupId && availableStemGroupIds.has(step.stemGroupId)) {
          mode = "stems";
          muted.add(step.stemGroupId);
        }
        break;
      case "ALL_SOURCES":
        mode = "stems";
        muted.clear();
        break;
      case "FULL_MIX":
        mode = "full";
        break;
      case "SILENCE":
        mode = "stems";
        muted.clear();
        for (const id of availableStemGroupIds) muted.add(id);
        break;
    }
  }

  return { mode, muted, caption, stepIndex };
}
