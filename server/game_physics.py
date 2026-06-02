"""Authoritative Pong physics — mirrors src/game/engine.ts."""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Literal

from config import (
    BALL_SIZE,
    BALL_SPEED,
    COURT_HEIGHT,
    COURT_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_MARGIN,
    PADDLE_SPEED,
    PADDLE_WIDTH,
    WINNING_SCORE,
)

Side = Literal["left", "right"]


@dataclass
class Ball:
    x: float
    y: float
    vx: float
    vy: float


@dataclass
class GameSnapshot:
    left_y: float
    right_y: float
    ball: Ball
    left_score: int = 0
    right_score: int = 0
    paused: bool = False
    game_over: bool = False
    winner: Side | None = None

    def to_dict(self) -> dict:
        return {
            "leftY": self.left_y,
            "rightY": self.right_y,
            "ball": {
                "x": self.ball.x,
                "y": self.ball.y,
                "vx": self.ball.vx,
                "vy": self.ball.vy,
            },
            "leftScore": self.left_score,
            "rightScore": self.right_score,
            "paused": self.paused,
            "gameOver": self.game_over,
            "winner": self.winner,
            "width": COURT_WIDTH,
            "height": COURT_HEIGHT,
        }


def _center_paddle() -> float:
    return (COURT_HEIGHT - PADDLE_HEIGHT) / 2


def _create_ball(serve_to_left: bool) -> Ball:
    angle = (random.random() * 0.6 - 0.3) * math.pi
    direction = 1 if serve_to_left else -1
    return Ball(
        x=COURT_WIDTH / 2,
        y=COURT_HEIGHT / 2,
        vx=math.cos(angle) * BALL_SPEED * direction,
        vy=math.sin(angle) * BALL_SPEED,
    )


def new_game() -> GameSnapshot:
    serve_left = random.random() > 0.5
    c = _center_paddle()
    return GameSnapshot(
        left_y=c,
        right_y=c,
        ball=_create_ball(serve_left),
    )


def _reset_ball(snapshot: GameSnapshot, scored_on: Side) -> GameSnapshot:
    serve_to_left = scored_on == "right"
    c = _center_paddle()
    return GameSnapshot(
        left_y=c,
        right_y=c,
        ball=_create_ball(serve_to_left),
        left_score=snapshot.left_score,
        right_score=snapshot.right_score,
        paused=snapshot.paused,
        game_over=snapshot.game_over,
        winner=snapshot.winner,
    )


def _collide_paddle(
    ball: Ball, paddle_y: float, paddle_x: float, direction: int
) -> Ball:
    ball_left = ball.x - BALL_SIZE / 2
    ball_right = ball.x + BALL_SIZE / 2
    ball_top = ball.y - BALL_SIZE / 2
    ball_bottom = ball.y + BALL_SIZE / 2

    paddle_top = paddle_y
    paddle_bottom = paddle_y + PADDLE_HEIGHT
    paddle_left = paddle_x
    paddle_right = paddle_x + PADDLE_WIDTH

    if direction == 1:
        hits_x = ball_right >= paddle_left and ball_left <= paddle_right
    else:
        hits_x = ball_left <= paddle_right and ball_right >= paddle_left

    if not hits_x or ball_bottom < paddle_top or ball_top > paddle_bottom:
        return ball

    hit_pos = (ball.y - paddle_y) / PADDLE_HEIGHT - 0.5
    speed = math.hypot(ball.vx, ball.vy)
    max_bounce = 0.85
    bounce_angle = hit_pos * max_bounce * (math.pi / 2)

    if direction == 1:
        new_x = paddle_left - BALL_SIZE / 2 - 1
    else:
        new_x = paddle_right + BALL_SIZE / 2 + 1

    return Ball(
        x=new_x,
        y=ball.y,
        vx=math.cos(bounce_angle) * speed * direction,
        vy=math.sin(bounce_angle) * speed,
    )


def clamp_paddle(y: float) -> float:
    return max(0.0, min(float(COURT_HEIGHT - PADDLE_HEIGHT), y))


def apply_paddle_input(y: float, direction: int) -> float:
    if direction == 0:
        return y
    return clamp_paddle(y + direction * PADDLE_SPEED)


def step(snapshot: GameSnapshot) -> GameSnapshot:
    if snapshot.paused or snapshot.game_over:
        return snapshot

    ball = Ball(
        snapshot.ball.x + snapshot.ball.vx,
        snapshot.ball.y + snapshot.ball.vy,
        snapshot.ball.vx,
        snapshot.ball.vy,
    )
    left_score = snapshot.left_score
    right_score = snapshot.right_score

    if ball.y - BALL_SIZE / 2 <= 0:
        ball = Ball(ball.x, BALL_SIZE / 2, ball.vx, abs(ball.vy))
    elif ball.y + BALL_SIZE / 2 >= COURT_HEIGHT:
        ball = Ball(ball.x, COURT_HEIGHT - BALL_SIZE / 2, ball.vx, -abs(ball.vy))

    player_x = PADDLE_MARGIN
    opponent_x = COURT_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH

    ball = _collide_paddle(ball, snapshot.left_y, player_x, 1)
    ball = _collide_paddle(ball, snapshot.right_y, opponent_x, -1)

    if ball.x < 0:
        right_score += 1
        next_snap = GameSnapshot(
            snapshot.left_y,
            snapshot.right_y,
            ball,
            left_score,
            right_score,
        )
        if right_score >= WINNING_SCORE:
            return GameSnapshot(
                snapshot.left_y,
                snapshot.right_y,
                ball,
                left_score,
                right_score,
                game_over=True,
                winner="right",
            )
        return _reset_ball(next_snap, "left")

    if ball.x > COURT_WIDTH:
        left_score += 1
        next_snap = GameSnapshot(
            snapshot.left_y,
            snapshot.right_y,
            ball,
            left_score,
            right_score,
        )
        if left_score >= WINNING_SCORE:
            return GameSnapshot(
                snapshot.left_y,
                snapshot.right_y,
                ball,
                left_score,
                right_score,
                game_over=True,
                winner="left",
            )
        return _reset_ball(next_snap, "right")

    return GameSnapshot(
        snapshot.left_y,
        snapshot.right_y,
        ball,
        left_score,
        right_score,
        snapshot.paused,
        snapshot.game_over,
        snapshot.winner,
    )
