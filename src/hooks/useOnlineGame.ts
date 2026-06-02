import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  serverToGameState,
  type RoomPublicState,
  type ServerGamePayload,
} from "../game/onlineState";
import { createInitialState } from "../game/engine";
import type { GameState } from "../game/types";

export type OnlineRole = "host" | "guest";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "";

interface UseOnlineGameOptions {
  code: string;
  role: OnlineRole;
  accessToken?: string | null;
  onHit?: () => void;
  onScore?: () => void;
  onWin?: () => void;
}

export function useOnlineGame({
  code,
  role,
  accessToken,
  onHit,
  onScore,
  onWin,
}: UseOnlineGameOptions) {
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingResume, setWaitingResume] = useState(false);
  const [authRegistered, setAuthRegistered] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const prevScoresRef = useRef({ player: 0, opponent: 0 });
  const prevBallVxRef = useRef(0);
  const gameOverFiredRef = useRef(false);

  const emitPaddle = useCallback((direction: "up" | "down" | "stop") => {
    socketRef.current?.emit("paddle", { direction });
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL || undefined, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_room", { code: code.toUpperCase(), role });
      if (accessToken) {
        socket.emit("register_auth", { accessToken });
      }
    });

    socket.on("auth_registered", (payload: { ok?: boolean }) => {
      setAuthRegistered(Boolean(payload.ok));
    });

    socket.on("connect_error", () => {
      setError("Could not connect to game server. Is it running?");
    });

    socket.on("error", (payload: { message?: string }) => {
      setError(payload.message ?? "Connection error");
    });

    socket.on("room_state", (payload: RoomPublicState) => {
      setRoom(payload);
      if (payload.status !== "countdown") {
        setCountdown(null);
      }
      if (payload.status === "waiting") {
        setGameState(createInitialState());
        prevScoresRef.current = { player: 0, opponent: 0 };
        prevBallVxRef.current = 0;
        gameOverFiredRef.current = false;
      }
    });

    socket.on("countdown", (payload: { n: number }) => {
      setCountdown(payload.n);
    });

    socket.on("game_state", (payload: ServerGamePayload) => {
      const next = serverToGameState(payload);
      const scored =
        next.playerScore !== prevScoresRef.current.player ||
        next.opponentScore !== prevScoresRef.current.opponent;

      if (
        !scored &&
        Math.sign(next.ball.vx) !== Math.sign(prevBallVxRef.current) &&
        prevBallVxRef.current !== 0
      ) {
        onHit?.();
      }
      prevBallVxRef.current = next.ball.vx;

      if (scored) {
        onScore?.();
        prevScoresRef.current = {
          player: next.playerScore,
          opponent: next.opponentScore,
        };
      }

      if (next.gameOver && next.winner && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        onWin?.();
      }
      if (!next.gameOver) {
        gameOverFiredRef.current = false;
      }

      setGameState(next);
    });

    socket.on("game_paused", () => {
      setWaitingResume(false);
    });

    socket.on("game_resumed", () => {
      setWaitingResume(false);
    });

    socket.on("room_closed", (payload: { message?: string }) => {
      setError(payload.message ?? "Room closed");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, role, accessToken, onHit, onScore, onWin]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !accessToken) return;
    socket.emit("register_auth", { accessToken });
  }, [accessToken, connected]);

  useEffect(() => {
    if (room?.status !== "playing" || gameState.paused || gameState.gameOver) {
      emitPaddle("stop");
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        emitPaddle("up");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        emitPaddle("down");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        emitPaddle("stop");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      emitPaddle("stop");
    };
  }, [room?.status, gameState.paused, gameState.gameOver, emitPaddle]);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit("set_ready", { ready });
  }, []);

  const requestPause = useCallback(() => {
    socketRef.current?.emit("request_pause");
  }, []);

  const requestResume = useCallback(() => {
    setWaitingResume(true);
    socketRef.current?.emit("request_resume");
  }, []);

  const rematch = useCallback(() => {
    prevScoresRef.current = { player: 0, opponent: 0 };
    prevBallVxRef.current = 0;
    socketRef.current?.emit("rematch");
    setReady(false);
  }, [setReady]);

  const isHost = role === "host";
  const opponentConnected = isHost ? room?.guestConnected : room?.hostConnected;
  const myReady = isHost ? room?.hostReady : room?.guestReady;
  const opponentReady = isHost ? room?.guestReady : room?.hostReady;

  return {
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
  };
}
