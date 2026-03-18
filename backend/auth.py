"""Authentication helpers and dependency injection."""
import os, jwt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt

from database import db

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 72
security = HTTPBearer()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str, ruolo: str) -> str:
    payload = {"user_id": user_id, "ruolo": ruolo, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token non valido")


# ── Dependency Functions ──────────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Utente non trovato")
    return user

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"], "ruolo": "admin"}, {"_id": 0})
    if not user:
        raise HTTPException(403, "Accesso negato: solo admin")
    return user

async def get_fornitore_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"], "ruolo": "fornitore"}, {"_id": 0})
    if not user:
        raise HTTPException(403, "Accesso negato: solo fornitori")
    return user

async def get_collaboratore_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.collaboratori.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(403, "Collaboratore non trovato")
    if user.get("stato") != "Attivo":
        raise HTTPException(403, "Account sospeso")
    return user

async def get_admin_or_collaboratore(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Allow access for both admin and collaboratore roles."""
    payload = decode_token(credentials.credentials)
    ruolo = payload.get("ruolo", "")
    if ruolo == "admin":
        user = await db.users.find_one({"id": payload["user_id"], "ruolo": "admin"}, {"_id": 0})
        if user:
            user["_tipo"] = "admin"
            return user
    elif ruolo == "collaboratore":
        user = await db.collaboratori.find_one({"id": payload["user_id"]}, {"_id": 0})
        if user and user.get("stato") == "Attivo":
            user["_tipo"] = "collaboratore"
            return user
    raise HTTPException(403, "Accesso negato")
