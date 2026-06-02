interface TouchControlsProps {
  onUp: () => void;
  onDown: () => void;
}

export function TouchControls({ onUp, onDown }: TouchControlsProps) {
  return (
    <div className="pong-touch" aria-label="Paddle controls">
      <button
        type="button"
        className="pong-touch__btn"
        onPointerDown={(e) => {
          e.preventDefault();
          onUp();
        }}
        aria-label="Move paddle up"
      >
        ▲
      </button>
      <button
        type="button"
        className="pong-touch__btn"
        onPointerDown={(e) => {
          e.preventDefault();
          onDown();
        }}
        aria-label="Move paddle down"
      >
        ▼
      </button>
    </div>
  );
}
