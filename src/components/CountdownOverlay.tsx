interface CountdownOverlayProps {
  value: number;
}

export function CountdownOverlay({ value }: CountdownOverlayProps) {
  return (
    <div className="pong-overlay" role="status" aria-live="assertive">
      <p className="pong-overlay__title pong-countdown__number">{value}</p>
    </div>
  );
}
