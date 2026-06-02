import os

WINNING_SCORE = 11
PADDLE_WIDTH = 14
PADDLE_HEIGHT = 88
BALL_SIZE = 14
PADDLE_SPEED = 9
BALL_SPEED = 7
PADDLE_MARGIN = 24
COURT_WIDTH = 800
COURT_HEIGHT = 480

ROOM_IDLE_SECONDS = 5 * 60
ROOM_CODE_LENGTH = 4
TICK_RATE = 60
COUNTDOWN_SECONDS = 3

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
