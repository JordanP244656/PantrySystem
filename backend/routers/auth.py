from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import secrets

router = APIRouter()

ADMIN_PIN = os.environ.get("PANTRY_ADMIN_PIN", "1234")
_tokens: set = set()


class LoginRequest(BaseModel):
    pin: str


@router.post("/auth/login")
def login(body: LoginRequest):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Wrong PIN")
    token = secrets.token_hex(32)
    _tokens.add(token)
    return {"token": token}


@router.post("/auth/logout")
def logout(body: dict):
    _tokens.discard(body.get("token", ""))
    return {"ok": True}


@router.get("/auth/verify")
def verify(token: str = ""):
    if token not in _tokens:
        raise HTTPException(401, "Not authenticated")
    return {"ok": True}


def require_admin(token: str = ""):
    if token not in _tokens:
        raise HTTPException(401, "Admin access required")
