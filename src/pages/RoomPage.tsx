import { Link, useParams, useSearchParams } from "react-router-dom";
import { CountdownOverlay } from "../components/CountdownOverlay";
import { Layout } from "../components/Layout";
import { MatchEndOverlay } from "../components/MatchEndOverlay";
import { MuteToggle } from "../components/MuteToggle";
import { OnlinePauseOverlay } from "../components/OnlinePauseOverlay";
import { PongCanvas } from "../components/PongCanvas";
import { Scoreboard } from "../components/Scoreboard";
import { TouchControls } from "../components/TouchControls";
import type { OnlineRole } from "../hooks/useOnlineGame";
import { useOnlineGame } from "../hooks/useOnlineGame";
import { useSound } from "../hooks/useSound";
import { useAuth } from "../contexts/AuthContext";

function parseRole(value: string | null): OnlineRole | null {
  if (value === "host" || value === "guest") return value;
  return null;
}

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const role = parseRole(searchParams.get("role"));
  const { muted, toggleMute, play } = useSound();
  const { accessToken } = useAuth();

  const {
    room,
    gameState,
    countdown,
    connected,
    error,
    waitingResume,
    isHost,
    opponentConnected,
    myReady,
    opponentReady,
    setReady,
    requestPause,
    requestResume,
    rematch,
    emitPaddle,
    authRegistered,
  } = useOnlineGame({
    code,
    role: role ?? "guest",
    accessToken,
    onHit: () => play("hit"),
    onScore: () => play("score"),
    onWin: () => play("win"),
  });

  if (!role) {
    return (
      <Layout showBack>
        <p className="pong-error">Invalid session. Choose Host or Join from the online menu.</p>
        <Link to="/online" className="pong-btn">
          Go to online
        </Link>
      </Layout>
    );
  }

  if (error && !room) {
    return (
      <Layout showBack>
        <p className="pong-error" role="alert">
          {error}
        </p>
        <Link to="/" className="pong-btn">
          Back to lobby
        </Link>
      </Layout>
    );
  }

  const status = room?.status ?? "waiting";
  const showGame =
    status === "countdown" || status === "playing" || status === "game_over";
  const won = gameState.winner === "player";

  return (
    <Layout showBack backTo="/online" backLabel="Leave online">
      {status === "waiting" && (
        <div className="pong-waiting">
          {isHost && (
            <div className="pong-room-code-block">
              <p className="pong-room-code__label">Your room code</p>
              <p className="pong-room-code" aria-label={`Room code ${code.toUpperCase()}`}>
                {code.toUpperCase()}
              </p>
              <button
                type="button"
                className="pong-btn pong-btn--small"
                onClick={() => navigator.clipboard?.writeText(code.toUpperCase())}
              >
                Copy code
              </button>
            </div>
          )}

          {!isHost && (
            <p className="pong-waiting__status">
              Joined room <strong>{code.toUpperCase()}</strong>
            </p>
          )}

          <p className="pong-waiting__status">
            {opponentConnected
              ? "Opponent connected"
              : "Waiting for opponent…"}
          </p>

          <button
            type="button"
            className={`pong-btn pong-btn--primary${myReady ? " pong-btn--ready-active" : ""}`}
            style={{ width: "100%", maxWidth: 320 }}
            disabled={!opponentConnected}
            onClick={() => setReady(!myReady)}
          >
            {myReady ? "Ready ✓" : "Ready"}
          </button>
          {myReady && !opponentReady && opponentConnected && (
            <p className="pong-hint">Waiting for opponent to ready up…</p>
          )}
          {!connected && <p className="pong-hint">Connecting to server…</p>}
        </div>
      )}

      {showGame && (
        <div className="pong-game-wrap">
          <Scoreboard
            playerScore={gameState.playerScore}
            opponentScore={gameState.opponentScore}
          />

          <div className="pong-canvas-card">
            <PongCanvas state={gameState} />
            {countdown !== null && <CountdownOverlay value={countdown} />}
            {gameState.paused && !gameState.gameOver && (
              <OnlinePauseOverlay
                waitingForOpponent={waitingResume}
                onResume={requestResume}
              />
            )}
            {gameState.gameOver && (
              <MatchEndOverlay
                won={won}
                playerScore={gameState.playerScore}
                opponentScore={gameState.opponentScore}
                onRematch={rematch}
                mode="online"
                statsAutoSaved={authRegistered}
              />
            )}
          </div>

          {status === "playing" && !gameState.gameOver && (
            <div className="pong-controls-bar">
              <button
                type="button"
                className="pong-btn pong-btn--small"
                onClick={gameState.paused ? requestResume : requestPause}
              >
                {gameState.paused ? "Resume" : "Pause"}
              </button>
              <TouchControls
                onUp={() => emitPaddle("up")}
                onDown={() => emitPaddle("down")}
              />
              <MuteToggle muted={muted} onToggle={toggleMute} />
            </div>
          )}

          <p className="pong-hint pong-hint--desktop">
            Use ↑ and ↓ arrow keys to move your paddle
          </p>
        </div>
      )}

      {error && room && (
        <p className="pong-error" role="alert">
          {error}
        </p>
      )}
    </Layout>
  );
}
