"""Verify Supabase access tokens (Google sign-in)."""
from __future__ import annotations

import os
from typing import Any

import jwt

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def verify_access_token(token: str) -> dict[str, Any] | None:
    if not SUPABASE_JWT_SECRET or not token:
        return None
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.PyJWTError:
        return None


def user_id_from_token(token: str) -> str | None:
    payload = verify_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None
