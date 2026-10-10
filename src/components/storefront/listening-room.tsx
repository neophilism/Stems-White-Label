import { StemPlayer } from "@/components/storefront/stem-player";

type ListeningRoomProps = {
  workSlug: string;
  durationMs: number | null;
  sourceGroups: Array<{
    id: string;
    label: string;
    hasPreview: boolean;
  }>;
};

export function ListeningRoom({
  workSlug,
  durationMs,
  sourceGroups,
}: ListeningRoomProps) {
  return (
    <section className="listening-room" aria-labelledby="listening-room-heading">
      <div className="listening-room__introduction">
        <p className="micro-label">Listening room</p>
        <h2 id="listening-room-heading">Hear every source in sync.</h2>
        <p>
          All available stem previews start together on one timeline. Mute or
          unmute any number of stems while they continue to run in sync. There
          are no per-stem balance, pan, solo, EQ, or other mix controls.
        </p>
      </div>

      <StemPlayer
        durationMs={durationMs}
        sourceGroups={sourceGroups}
        workSlug={workSlug}
      />
    </section>
  );
}
