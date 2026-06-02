"""Persist player stats (SQLite locally, or Supabase when configured)."""
from __future__ import annotations

import os
import sqlite3
import threading
from pathlib import Path

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

DB_PATH = Path(__file__).resolve().parent / "stats.db"
_lock = threading.Lock()


def _use_supabase() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _init_sqlite() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS player_stats (
                user_id TEXT PRIMARY KEY,
                wins INTEGER NOT NULL DEFAULT 0,
                losses INTEGER NOT NULL DEFAULT 0,
                games_played INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()


def _record_sqlite(user_id: str, won: bool) -> dict:
    _init_sqlite()
    with _lock:
        with sqlite3.connect(DB_PATH) as conn:
            row = conn.execute(
                "SELECT wins, losses, games_played FROM player_stats WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if row:
                wins, losses, games = row
            else:
                wins, losses, games = 0, 0, 0
            games += 1
            if won:
                wins += 1
            else:
                losses += 1
            conn.execute(
                """
                INSERT INTO player_stats (user_id, wins, losses, games_played)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    wins = excluded.wins,
                    losses = excluded.losses,
                    games_played = excluded.games_played
                """,
                (user_id, wins, losses, games),
            )
            conn.commit()
    return {"wins": wins, "losses": losses, "gamesPlayed": games}


def _get_sqlite(user_id: str) -> dict:
    _init_sqlite()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT wins, losses, games_played FROM player_stats WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return {"wins": 0, "losses": 0, "gamesPlayed": 0}
    return {"wins": row[0], "losses": row[1], "gamesPlayed": row[2]}


def _record_supabase(user_id: str, won: bool) -> dict:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    current = _get_supabase(user_id)
    games = current["gamesPlayed"] + 1
    wins = current["wins"] + (1 if won else 0)
    losses = current["losses"] + (0 if won else 1)
    body = {
        "user_id": user_id,
        "wins": wins,
        "losses": losses,
        "games_played": games,
    }
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/player_stats?on_conflict=user_id",
        headers=headers,
        json=body,
        timeout=10,
    )
    if res.status_code not in (200, 201):
        raise RuntimeError(f"Supabase upsert failed: {res.status_code} {res.text}")
    return {"wins": wins, "losses": losses, "gamesPlayed": games}


def _get_supabase(user_id: str) -> dict:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/player_stats",
        headers=headers,
        params={"user_id": f"eq.{user_id}", "select": "wins,losses,games_played"},
        timeout=10,
    )
    if res.status_code != 200:
        return {"wins": 0, "losses": 0, "gamesPlayed": 0}
    rows = res.json()
    if not rows:
        return {"wins": 0, "losses": 0, "gamesPlayed": 0}
    row = rows[0]
    return {
        "wins": row.get("wins", 0),
        "losses": row.get("losses", 0),
        "gamesPlayed": row.get("games_played", 0),
    }


def stats_enabled() -> bool:
    from auth import SUPABASE_JWT_SECRET

    return bool(SUPABASE_JWT_SECRET)


def record_match(user_id: str, won: bool) -> dict:
    if _use_supabase():
        return _record_supabase(user_id, won)
    return _record_sqlite(user_id, won)


def get_stats(user_id: str) -> dict:
    if _use_supabase():
        return _get_supabase(user_id)
    return _get_sqlite(user_id)
