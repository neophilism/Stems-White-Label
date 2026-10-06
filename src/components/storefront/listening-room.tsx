type ListeningRoomProps = {
  previewRegistered: boolean;
  sourceGroupCount: number;
};

export function ListeningRoom({
  previewRegistered,
  sourceGroupCount,
}: ListeningRoomProps) {
  return (
    <section className="listening-room" aria-labelledby="listening-room-heading">
      <div>
        <p className="micro-label">Listening room</p>
        <h2 id="listening-room-heading">Hear the construction.</h2>
        <p>
          The synchronized source player will occupy this listening surface,
          preserving the Work page rather than sending the visitor into a
          separate DAW-like interface.
        </p>
      </div>
      <div className="listening-room__console">
        <div className="listening-room__disc" aria-hidden="true">
          <span>UR</span>
        </div>
        <div className="listening-room__status">
          <span className="listening-room__status-light" aria-hidden="true" />
          <div>
            <strong>
              {previewRegistered ? "Preview source registered" : "Awaiting preview source"}
            </strong>
            <span>{sourceGroupCount} source groups in this Work</span>
          </div>
        </div>
      </div>
    </section>
  );
}
