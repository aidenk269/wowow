interface PauseOverlayProps {
  onResume: () => void;
}

export function PauseOverlay({ onResume }: PauseOverlayProps) {
  return (
    <div className="pong-overlay" role="dialog" aria-label="Game paused">
      <h2 className="pong-overlay__title">Paused</h2>
      <div className="pong-overlay__actions">
        <button type="button" className="pong-btn pong-btn--primary" onClick={onResume}>
          Resume
        </button>
      </div>
    </div>
  );
}
