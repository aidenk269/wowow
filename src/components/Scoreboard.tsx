interface ScoreboardProps {
  playerScore: number;
  opponentScore: number;
}

export function Scoreboard({ playerScore, opponentScore }: ScoreboardProps) {
  return (
    <div className="pong-scoreboard" aria-live="polite">
      <div className="pong-scoreboard__side pong-scoreboard__side--left">
        <span className="pong-scoreboard__name">You</span>
        <span className="pong-scoreboard__score">{playerScore}</span>
      </div>
      <span className="pong-scoreboard__divider">·</span>
      <div className="pong-scoreboard__side pong-scoreboard__side--right">
        <span className="pong-scoreboard__name">Opponent</span>
        <span className="pong-scoreboard__score">{opponentScore}</span>
      </div>
    </div>
  );
}
