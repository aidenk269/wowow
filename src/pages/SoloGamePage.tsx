import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { MatchEndOverlay } from "../components/MatchEndOverlay";
import { MuteToggle } from "../components/MuteToggle";
import { PauseOverlay } from "../components/PauseOverlay";
import { PongCanvas } from "../components/PongCanvas";
import { Scoreboard } from "../components/Scoreboard";
import { TouchControls } from "../components/TouchControls";
import type { Difficulty } from "../game/types";
import { useSoloGame } from "../hooks/useSoloGame";
import { useSound } from "../hooks/useSound";

function parseDifficulty(value: string | null): Difficulty {
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return "medium";
}

export function SoloGamePage() {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get("difficulty"));
  const { muted, toggleMute, play } = useSound();

  const { state, togglePause, rematch, movePlayerUp, movePlayerDown } = useSoloGame(
    difficulty,
    () => play("score"),
    () => play("win"),
    () => play("hit"),
  );

  const won = state.winner === "player";

  return (
    <Layout showBack backTo="/solo" backLabel="Leave game">
      <div className="pong-game-wrap">
        <Scoreboard
          playerScore={state.playerScore}
          opponentScore={state.opponentScore}
        />

        <div className="pong-canvas-card">
          <PongCanvas state={state} />
          {state.paused && !state.gameOver && (
            <PauseOverlay onResume={togglePause} />
          )}
          {state.gameOver && (
            <MatchEndOverlay
              won={won}
              playerScore={state.playerScore}
              opponentScore={state.opponentScore}
              onRematch={rematch}
              mode="solo"
            />
          )}
        </div>

        <div className="pong-controls-bar">
          <button type="button" className="pong-btn pong-btn--small" onClick={togglePause}>
            {state.paused ? "Resume" : "Pause"}
          </button>
          <TouchControls onUp={movePlayerUp} onDown={movePlayerDown} />
          <MuteToggle muted={muted} onToggle={toggleMute} />
        </div>

        <p className="pong-hint pong-hint--desktop">
          Use ↑ and ↓ arrow keys to move your paddle
        </p>
        <p className="pong-hint pong-hint--mobile">
          Use the ▲ ▼ buttons to move your paddle
        </p>
      </div>
    </Layout>
  );
}
