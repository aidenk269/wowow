import { Link } from "react-router-dom";
import { SaveStatsPrompt } from "./SaveStatsPrompt";

interface MatchEndOverlayProps {
  won: boolean;
  playerScore: number;
  opponentScore: number;
  onRematch: () => void;
  mode?: "solo" | "online";
  statsAutoSaved?: boolean;
}

export function MatchEndOverlay({
  won,
  playerScore,
  opponentScore,
  onRematch,
  mode = "solo",
  statsAutoSaved = false,
}: MatchEndOverlayProps) {
  return (
    <div className="pong-overlay" role="dialog" aria-label="Match over">
      <h2 className="pong-overlay__title">{won ? "You win!" : "Opponent wins"}</h2>
      <p className="pong-overlay__sub">
        {playerScore} – {opponentScore}
      </p>
      <div className="pong-overlay__actions">
        <button type="button" className="pong-btn pong-btn--primary" onClick={onRematch}>
          Rematch
        </button>
        <Link to="/" className="pong-btn">
          Back to lobby
        </Link>
      </div>
      <SaveStatsPrompt won={won} mode={mode} autoSaved={statsAutoSaved} />
    </div>
  );
}
