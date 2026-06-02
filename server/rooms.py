from __future__ import annotations

import random
import string
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable

from config import COUNTDOWN_SECONDS, ROOM_CODE_LENGTH, ROOM_IDLE_SECONDS, TICK_RATE
from game_physics import GameSnapshot, new_game, apply_paddle_input, step


class RoomStatus(str, Enum):
    WAITING = "waiting"
    COUNTDOWN = "countdown"
    PLAYING = "playing"
    GAME_OVER = "game_over"


@dataclass
class PlayerSlot:
    sid: str | None = None
    role: str | None = None  # "host" | "guest"
    user_id: str | None = None
    ready: bool = False
    paddle_dir: int = 0  # -1 up, 1 down, 0 stop
    wants_resume: bool = False


@dataclass
class Room:
    code: str
    host: PlayerSlot = field(default_factory=PlayerSlot)
    guest: PlayerSlot = field(default_factory=PlayerSlot)
    status: RoomStatus = RoomStatus.WAITING
    game: GameSnapshot = field(default_factory=new_game)
    paused: bool = False
    last_activity: float = field(default_factory=time.time)
    countdown_value: int | None = None
    stats_recorded: bool = False
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False)

    def touch(self) -> None:
        self.last_activity = time.time()

    def player_count(self) -> int:
        n = 0
        if self.host.sid:
            n += 1
        if self.guest.sid:
            n += 1
        return n

    def get_slot_by_sid(self, sid: str) -> tuple[PlayerSlot, str] | None:
        if self.host.sid == sid:
            return self.host, "host"
        if self.guest.sid == sid:
            return self.guest, "guest"
        return None

    def public_state(self) -> dict:
        return {
            "code": self.code,
            "status": self.status.value,
            "hostConnected": self.host.sid is not None,
            "guestConnected": self.guest.sid is not None,
            "hostReady": self.host.ready,
            "guestReady": self.guest.ready,
            "playerCount": self.player_count(),
            "paused": self.paused,
            "countdown": self.countdown_value,
        }


class RoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._lock = threading.RLock()
        self._code_chars = "".join(
            c for c in string.ascii_uppercase + string.digits if c not in "O0IL1"
        )

    def _generate_code(self) -> str:
        for _ in range(50):
            code = "".join(
                random.choices(self._code_chars, k=ROOM_CODE_LENGTH)
            )
            if code not in self._rooms:
                return code
        raise RuntimeError("Could not allocate room code")

    def create_room(self) -> Room:
        with self._lock:
            code = self._generate_code()
            room = Room(code=code)
            room.host.role = "host"
            self._rooms[code] = room
            return room

    def get_room(self, code: str) -> Room | None:
        code = code.strip().upper()
        with self._lock:
            return self._rooms.get(code)

    def remove_room(self, code: str) -> None:
        with self._lock:
            self._rooms.pop(code.upper(), None)

    def find_room_by_sid(self, sid: str) -> Room | None:
        with self._lock:
            for room in self._rooms.values():
                if room.host.sid == sid or room.guest.sid == sid:
                    return room
        return None

    def iter_rooms(self):
        with self._lock:
            return list(self._rooms.items())

    def cleanup_idle(self, on_close: Callable[[str], None]) -> None:
        now = time.time()
        expired: list[str] = []
        with self._lock:
            for code, room in self._rooms.items():
                if now - room.last_activity > ROOM_IDLE_SECONDS:
                    expired.append(code)
            for code in expired:
                del self._rooms[code]
        for code in expired:
            on_close(code)
