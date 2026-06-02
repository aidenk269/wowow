interface OnlinePauseOverlayProps {
  waitingForOpponent: boolean;
  onResume: () => void;
}

export function OnlinePauseOverlay({
  waitingForOpponent,
  onResume,
}: OnlinePauseOverlayProps) {
  return (
    <div className="pong-overlay" role="dialog" aria-label="Game paused">
      <h2 className="pong-overlay__title">Paused</h2>
      <p className="pong-overlay__sub">
        {waitingForOpponent
          ? "Waiting for opponent to resume…"
          : "Tap Resume when you are ready"}
      </p>
      <div className="pong-overlay__actions">
        <button type="button" className="pong-btn pong-btn--primary" onClick={onResume}>
          Resume
        </button>
      </div>
    </div>
  );
}
