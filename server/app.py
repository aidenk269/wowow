"""Flask + SocketIO Pong server."""
from __future__ import annotations

import os
import threading
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from auth import user_id_from_token
from config import CORS_ORIGINS, SECRET_KEY, TICK_RATE
from game_physics import GameSnapshot, new_game
from rooms import Room, RoomManager, RoomStatus
from stats_store import get_stats, record_match, stats_enabled

app = Flask(__name__, static_folder=None)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app, origins=CORS_ORIGINS, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins=CORS_ORIGINS, async_mode="threading")

room_manager = RoomManager()
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"


def _perspective_state(room: Room, role: str) -> dict:
    g = room.game
    base = g.to_dict()
    if role == "host":
        return {
            **base,
            "playerY": g.left_y,
            "opponentY": g.right_y,
            "playerScore": g.left_score,
            "opponentScore": g.right_score,
            "winner": (
                "player"
                if g.winner == "left"
                else "opponent"
                if g.winner == "right"
                else None
            ),
        }
    return {
        **base,
        "playerY": g.right_y,
        "opponentY": g.left_y,
        "playerScore": g.right_score,
        "opponentScore": g.left_score,
        "winner": (
            "player"
            if g.winner == "right"
            else "opponent"
            if g.winner == "left"
            else None
        ),
    }


def _broadcast_room(room: Room) -> None:
    socketio.emit("room_state", room.public_state(), room=room.code)


def _broadcast_game(room: Room) -> None:
    if room.host.sid:
        socketio.emit(
            "game_state",
            _perspective_state(room, "host"),
            room=room.code,
        )
    if room.guest.sid:
        socketio.emit(
            "game_state",
            _perspective_state(room, "guest"),
            room=room.code,
        )


def _bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None


def _record_online_stats(room: Room) -> None:
    if room.stats_recorded or not room.game.winner:
        return
    if not stats_enabled():
        return
    room.stats_recorded = True
    winner = room.game.winner
    try:
        if room.host.user_id:
            record_match(room.host.user_id, winner == "left")
        if room.guest.user_id:
            record_match(room.guest.user_id, winner == "right")
    except Exception:
        room.stats_recorded = False


def _close_room(code: str, message: str = "Room closed") -> None:
    socketio.emit("room_closed", {"message": message}, room=code)
    room_manager.remove_room(code)


def _start_countdown(room: Room) -> None:
    room.status = RoomStatus.COUNTDOWN
    room.touch()

    def run() -> None:
        for n in range(3, 0, -1):
            with room._lock:
                if room.status != RoomStatus.COUNTDOWN:
                    return
                room.countdown_value = n
            socketio.emit("countdown", {"n": n}, room=room.code)
            _broadcast_room(room)
            time.sleep(1)
        with room._lock:
            room.status = RoomStatus.PLAYING
            room.countdown_value = None
            room.game = new_game()
            room.paused = False
            room.host.paddle_dir = 0
            room.guest.paddle_dir = 0
            room.host.wants_resume = False
            room.guest.wants_resume = False
        _broadcast_room(room)
        _broadcast_game(room)

    threading.Thread(target=run, daemon=True).start()


_game_loops: dict[str, bool] = {}


def _game_loop(code: str) -> None:
    interval = 1.0 / TICK_RATE
    while _game_loops.get(code):
        room = room_manager.get_room(code)
        if not room:
            break
        with room._lock:
            if room.status != RoomStatus.PLAYING:
                time.sleep(interval)
                continue
            if room.paused:
                time.sleep(interval)
                continue
            left_y = apply_paddle_input(room.game.left_y, room.host.paddle_dir)
            right_y = apply_paddle_input(room.game.right_y, room.guest.paddle_dir)
            room.game = GameSnapshot(
                left_y,
                right_y,
                room.game.ball,
                room.game.left_score,
                room.game.right_score,
                room.game.paused,
                room.game.game_over,
                room.game.winner,
            )
            room.game = step(room.game)
            if room.game.game_over:
                room.status = RoomStatus.GAME_OVER
                _record_online_stats(room)
        _broadcast_game(room)
        if room.status == RoomStatus.GAME_OVER:
            socketio.emit(
                "game_over",
                {
                    "leftScore": room.game.left_score,
                    "rightScore": room.game.right_score,
                },
                room=code,
            )
            _broadcast_room(room)
        room.touch()
        time.sleep(interval)


def _ensure_game_loop(code: str) -> None:
    if code in _game_loops and _game_loops[code]:
        return
    _game_loops[code] = True
    threading.Thread(target=_game_loop, args=(code,), daemon=True).start()


def _maybe_start_match(room: Room) -> None:
    if (
        room.host.sid
        and room.guest.sid
        and room.host.ready
        and room.guest.ready
        and room.status == RoomStatus.WAITING
    ):
        _start_countdown(room)


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "statsEnabled": stats_enabled()})


@app.route("/api/stats/config")
def stats_config():
    from stats_store import _use_supabase

    return jsonify(
        {
            "enabled": stats_enabled(),
            "storage": "supabase" if _use_supabase() else "sqlite",
        }
    )


@app.route("/api/me/stats", methods=["GET"])
def me_stats():
    if not stats_enabled():
        return jsonify({"error": "Stats not configured"}), 503
    token = _bearer_token()
    if not token:
        return jsonify({"error": "Missing authorization"}), 401
    user_id = user_id_from_token(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401
    try:
        return jsonify(get_stats(user_id))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/stats/record", methods=["POST"])
def record_stats():
    if not stats_enabled():
        return jsonify({"error": "Stats not configured"}), 503
    token = _bearer_token()
    if not token:
        return jsonify({"error": "Missing authorization"}), 401
    user_id = user_id_from_token(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401
    body = request.get_json(silent=True) or {}
    won = bool(body.get("won"))
    mode = body.get("mode", "solo")
    if mode not in ("solo", "online"):
        return jsonify({"error": "Invalid mode"}), 400
    try:
        stats = record_match(user_id, won)
        return jsonify(stats)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/rooms", methods=["POST"])
def create_room():
    room = room_manager.create_room()
    room.touch()
    return jsonify({"code": room.code})


@app.route("/api/rooms/<code>", methods=["GET"])
def get_room(code: str):
    room = room_manager.get_room(code)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    return jsonify(room.public_state())


@app.route("/api/rooms/<code>/join", methods=["POST"])
def join_room_api(code: str):
    room = room_manager.get_room(code)
    if not room:
        return jsonify({"error": "Invalid room code"}), 404
    if room.guest.sid:
        return jsonify({"error": "Room is full"}), 409
    if room.status not in (RoomStatus.WAITING, RoomStatus.GAME_OVER):
        return jsonify({"error": "Game already in progress"}), 409
    return jsonify({"code": room.code, "ok": True})


@socketio.on("connect")
def on_connect():
    pass


@socketio.on("disconnect")
def on_disconnect():
    from flask import request as flask_request

    sid = flask_request.sid
    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    code = room.code
    slot_info = room.get_slot_by_sid(sid)
    if not slot_info:
        return
    slot, role = slot_info
    with room._lock:
        slot.sid = None
        slot.ready = False
        slot.paddle_dir = 0
        if role == "host" and not room.guest.sid:
            _close_room(code, "Host left")
            _game_loops[code] = False
            return
        if role == "guest":
            room.status = RoomStatus.WAITING
            room.paused = False
            room.game = new_game()
    leave_room(code)
    _broadcast_room(room)
    room.touch()


@socketio.on("join_room")
def on_join_room(data):
    from flask import request as flask_request

    sid = flask_request.sid
    code = (data or {}).get("code", "").strip().upper()
    role = (data or {}).get("role")

    room = room_manager.get_room(code)
    if not room:
        emit("error", {"message": "Invalid room code"})
        return

    with room._lock:
        if role == "host":
            room.host.sid = sid
            room.host.role = "host"
        elif role == "guest":
            if room.guest.sid and room.guest.sid != sid:
                emit("error", {"message": "Room is full"})
                return
            room.guest.sid = sid
            room.guest.role = "guest"
        else:
            emit("error", {"message": "Invalid role"})
            return
        room.touch()

    join_room(code)
    emit("joined", {"code": code, "role": role})
    _broadcast_room(room)
    _ensure_game_loop(code)

    if room.status == RoomStatus.PLAYING:
        slot = room.get_slot_by_sid(sid)
        if slot:
            emit("game_state", _perspective_state(room, slot[1]))


@socketio.on("set_ready")
def on_set_ready(data):
    from flask import request as flask_request

    sid = flask_request.sid
    ready = bool((data or {}).get("ready", False))

    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    slot_info = room.get_slot_by_sid(sid)
    if not slot_info:
        return
    slot, _ = slot_info
    with room._lock:
        if room.status == RoomStatus.GAME_OVER:
            room.status = RoomStatus.WAITING
            room.game = new_game()
            room.host.ready = False
            room.guest.ready = False
        slot.ready = ready
        room.touch()
    _broadcast_room(room)
    _maybe_start_match(room)


@socketio.on("register_auth")
def on_register_auth(data):
    from flask import request as flask_request

    sid = flask_request.sid
    token = (data or {}).get("accessToken", "")
    user_id = user_id_from_token(token)
    if not user_id:
        emit("auth_registered", {"ok": False})
        return
    room = room_manager.find_room_by_sid(sid)
    if not room:
        emit("auth_registered", {"ok": False})
        return
    slot_info = room.get_slot_by_sid(sid)
    if not slot_info:
        emit("auth_registered", {"ok": False})
        return
    slot, _ = slot_info
    with room._lock:
        slot.user_id = user_id
        room.touch()
    emit("auth_registered", {"ok": True})


@socketio.on("paddle")
def on_paddle(data):
    from flask import request as flask_request

    sid = flask_request.sid
    direction = (data or {}).get("direction", "stop")
    dir_map = {"up": -1, "down": 1, "stop": 0}
    d = dir_map.get(direction, 0)

    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    slot_info = room.get_slot_by_sid(sid)
    if not slot_info:
        return
    slot, _ = slot_info
    with room._lock:
        slot.paddle_dir = d
        room.touch()


@socketio.on("request_pause")
def on_request_pause():
    from flask import request as flask_request

    sid = flask_request.sid
    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    code = room.code
    with room._lock:
        if room.status != RoomStatus.PLAYING:
            return
        room.paused = True
        room.game = GameSnapshot(
            room.game.left_y,
            room.game.right_y,
            room.game.ball,
            room.game.left_score,
            room.game.right_score,
            paused=True,
            game_over=room.game.game_over,
            winner=room.game.winner,
        )
        room.host.wants_resume = False
        room.guest.wants_resume = False
        room.touch()
    socketio.emit("game_paused", {}, room=code)
    _broadcast_game(room)


@socketio.on("request_resume")
def on_request_resume():
    from flask import request as flask_request

    sid = flask_request.sid
    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    code = room.code
    slot_info = room.get_slot_by_sid(sid)
    if not slot_info:
        return
    slot, _ = slot_info
    resumed = False
    with room._lock:
        if not room.paused:
            return
        slot.wants_resume = True
        if room.host.wants_resume and room.guest.wants_resume:
            room.paused = False
            room.game = GameSnapshot(
                room.game.left_y,
                room.game.right_y,
                room.game.ball,
                room.game.left_score,
                room.game.right_score,
                paused=False,
                game_over=room.game.game_over,
                winner=room.game.winner,
            )
            room.host.wants_resume = False
            room.guest.wants_resume = False
            resumed = True
        room.touch()
    _broadcast_room(room)
    _broadcast_game(room)
    if resumed:
        socketio.emit("game_resumed", {}, room=code)


@socketio.on("rematch")
def on_rematch():
    from flask import request as flask_request

    sid = flask_request.sid
    room = room_manager.find_room_by_sid(sid)
    if not room:
        return
    with room._lock:
        room.status = RoomStatus.WAITING
        room.game = new_game()
        room.paused = False
        room.host.ready = False
        room.guest.ready = False
        room.host.paddle_dir = 0
        room.guest.paddle_dir = 0
        room.stats_recorded = False
        room.touch()
    _broadcast_room(room)


def _idle_cleanup_loop() -> None:
    while True:
        time.sleep(30)
        room_manager.cleanup_idle(_close_room)


threading.Thread(target=_idle_cleanup_loop, daemon=True).start()


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    if not DIST_DIR.is_dir():
        return jsonify(
            {
                "message": "API running. Build frontend with npm run build.",
            }
        )
    target = DIST_DIR / path
    if path and target.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
