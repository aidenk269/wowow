import type { Ball, GameState } from "./types";

export interface ServerGamePayload {
  playerY: number;
  opponentY: number;
  ball: Ball;
  playerScore: number;
  opponentScore: number;
  paused: boolean;
  gameOver: boolean;
  winner: "player" | "opponent" | null;
  width: number;
  height: number;
}

export function serverToGameState(data: ServerGamePayload): GameState {
  return {
    player: { y: data.playerY },
    opponent: { y: data.opponentY },
    ball: data.ball,
    playerScore: data.playerScore,
    opponentScore: data.opponentScore,
    paused: data.paused,
    gameOver: data.gameOver,
    winner: data.winner,
    width: data.width,
    height: data.height,
  };
}

export interface RoomPublicState {
  code: string;
  status: "waiting" | "countdown" | "playing" | "game_over";
  hostConnected: boolean;
  guestConnected: boolean;
  hostReady: boolean;
  guestReady: boolean;
  playerCount: number;
  paused: boolean;
  countdown: number | null;
}
