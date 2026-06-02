import { useCallback, useEffect, useRef, useState } from "react";
import { updateAiPaddle } from "../game/ai";
import { PADDLE_SPEED } from "../game/constants";
import { clampPaddleY, createInitialState, stepGame } from "../game/engine";
import type { Difficulty, GameState } from "../game/types";

let soloActiveLoopCount = 0;

export function useSoloGame(
  difficulty: Difficulty,
  onScore?: () => void,
  onWin?: () => void,
  onHit?: () => void,
) {
  const stateRef = useRef<GameState>(createInitialState());
  const [frame, setFrame] = useState(0);
  const keysRef = useRef({ up: false, down: false });
  const prevScoresRef = useRef({ player: 0, opponent: 0 });
  const prevBallVxRef = useRef(0);

  const onScoreRef = useRef(onScore);
  const onWinRef = useRef(onWin);
  const onHitRef = useRef(onHit);
  onScoreRef.current = onScore;
  onWinRef.current = onWin;
  onHitRef.current = onHit;

  const bumpFrame = useCallback(() => setFrame((n) => n + 1), []);

  const setPaused = useCallback(
    (paused: boolean) => {
      stateRef.current = { ...stateRef.current, paused };
      bumpFrame();
    },
    [bumpFrame],
  );

  const togglePause = useCallback(() => {
    if (stateRef.current.gameOver) return;
    setPaused(!stateRef.current.paused);
  }, [setPaused]);

  const rematch = useCallback(() => {
    stateRef.current = createInitialState();
    prevScoresRef.current = { player: 0, opponent: 0 };
    prevBallVxRef.current = 0;
    bumpFrame();
  }, [bumpFrame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        keysRef.current.up = true;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        keysRef.current.down = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") keysRef.current.up = false;
      if (e.key === "ArrowDown") keysRef.current.down = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const loopId = Math.random().toString(36).slice(2, 8);
    soloActiveLoopCount += 1;
    // #region agent log
    fetch("http://127.0.0.1:7513/ingest/5b5ba30c-2427-425b-a68a-9fc5b4834741", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b53806" },
      body: JSON.stringify({
        sessionId: "b53806",
        runId: "post-fix",
        hypothesisId: "A",
        location: "useSoloGame.ts:loop-mount",
        message: "game loop effect mounted",
        data: { loopId, soloActiveLoopCount },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    let frameCount = 0;
    let rafId = 0;

    const loop = () => {
      let state = stateRef.current;
      if (!state.paused && !state.gameOver) {
        let playerY = state.player.y;
        if (keysRef.current.up) playerY -= PADDLE_SPEED;
        if (keysRef.current.down) playerY += PADDLE_SPEED;
        playerY = clampPaddleY(playerY, state.height);

        const opponentY = updateAiPaddle(
          state.opponent.y,
          state.ball.y,
          state.ball.vx,
          state.height,
          difficulty,
        );

        state = {
          ...state,
          player: { y: playerY },
          opponent: { y: opponentY },
        };

        const prevVx = prevBallVxRef.current;
        const prevPlayerScore = state.playerScore;
        const prevOpponentScore = state.opponentScore;
        state = stepGame(state);
        const scored =
          state.playerScore !== prevPlayerScore ||
          state.opponentScore !== prevOpponentScore;

        if (
          !scored &&
          Math.sign(state.ball.vx) !== Math.sign(prevVx) &&
          prevVx !== 0
        ) {
          onHitRef.current?.();
        }
        prevBallVxRef.current = state.ball.vx;

        if (scored) {
          onScoreRef.current?.();
          prevScoresRef.current = {
            player: state.playerScore,
            opponent: state.opponentScore,
          };
        }

        if (state.gameOver && state.winner) {
          onWinRef.current?.();
        }
      }

      stateRef.current = state;
      bumpFrame();

      frameCount += 1;
      if (frameCount % 120 === 0) {
        // #region agent log
        fetch("http://127.0.0.1:7513/ingest/5b5ba30c-2427-425b-a68a-9fc5b4834741", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b53806" },
          body: JSON.stringify({
            sessionId: "b53806",
            runId: "post-fix",
            hypothesisId: "A_D",
            location: "useSoloGame.ts:loop-tick",
            message: "loop heartbeat",
            data: {
              loopId,
              soloActiveLoopCount,
              ballX: state.ball.x,
              ballVx: state.ball.vx,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      soloActiveLoopCount -= 1;
      cancelAnimationFrame(rafId);
      // #region agent log
      fetch("http://127.0.0.1:7513/ingest/5b5ba30c-2427-425b-a68a-9fc5b4834741", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b53806" },
        body: JSON.stringify({
          sessionId: "b53806",
          runId: "post-fix",
          hypothesisId: "A",
          location: "useSoloGame.ts:loop-unmount",
          message: "game loop effect unmounted",
          data: { loopId, soloActiveLoopCount },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
  }, [difficulty, bumpFrame]);

  const movePlayer = useCallback(
    (direction: -1 | 1) => {
      const state = stateRef.current;
      if (state.paused || state.gameOver) return;
      const delta = direction * PADDLE_SPEED * 2;
      const y = clampPaddleY(state.player.y + delta, state.height);
      stateRef.current = { ...state, player: { y } };
      bumpFrame();
    },
    [bumpFrame],
  );

  return {
    state: stateRef.current,
    frame,
    setPaused,
    togglePause,
    rematch,
    movePlayerUp: () => movePlayer(-1),
    movePlayerDown: () => movePlayer(1),
  };
}
