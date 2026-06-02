import type { Difficulty } from "./types";
import { PADDLE_HEIGHT, PADDLE_SPEED } from "./constants";

const DIFFICULTY: Record<
  Difficulty,
  { speed: number; reaction: number; jitter: number }
> = {
  easy: { speed: 4.5, reaction: 0.35, jitter: 28 },
  medium: { speed: 6.5, reaction: 0.6, jitter: 12 },
  hard: { speed: PADDLE_SPEED, reaction: 0.92, jitter: 4 },
};

export function updateAiPaddle(
  paddleY: number,
  ballY: number,
  ballVx: number,
  courtHeight: number,
  difficulty: Difficulty,
): number {
  const maxY = courtHeight - PADDLE_HEIGHT;
  const centerY = (courtHeight - PADDLE_HEIGHT) / 2;

  // Only chase when the ball is moving toward the AI (right side).
  if (ballVx <= 0) {
    const diff = centerY - paddleY;
    const move = Math.max(-3, Math.min(3, diff * 0.08));
    return Math.max(0, Math.min(maxY, paddleY + move));
  }

  const { speed, reaction, jitter } = DIFFICULTY[difficulty];
  const targetY = ballY - PADDLE_HEIGHT / 2;
  const noisyTarget = targetY + (Math.random() - 0.5) * jitter;
  const diff = noisyTarget - paddleY;
  const move = diff * reaction;
  const clampedMove = Math.max(-speed, Math.min(speed, move));
  const next = paddleY + clampedMove;
  return Math.max(0, Math.min(maxY, next));
}
