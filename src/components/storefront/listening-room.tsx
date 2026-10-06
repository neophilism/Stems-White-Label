import { StemPlayer } from "@/components/storefront/stem-player";

type ListeningRoomProps = {
  workSlug: string;
  durationMs: number | null;
  hasFullMix: boolean;
  sourceGroups: Array<{
    id: string;
    label: string;
    hasPreview: boolean;
  }>;
};

export function ListeningRoom({
  workSlug,
  durationMs,
  hasFullMix,
  sourceGroups,
}: ListeningRoomProps) {
  return (
    <section className="listening-room" aria-labelledby="listening-room-heading">
      <div className="listening-room__introduction">
        <p className="micro-label">Listening room</p>
        <h2 id="listening-room-heading">Hear the construction.</h2>
        <p>
          Every available source preview is locked to one playback clock. Solo a
          section, remove it, combine several groups, or return to the finished
          full mix without leaving the Work.
        </p>
      </div>

      <StemPlayer
        durationMs={durationMs}
        hasFullMix={hasFullMix}
        sourceGroups={sourceGroups}
        workSlug={workSlug}
      />
    </section>
  );
}
