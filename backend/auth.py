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


async def get_any_authenticated_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Accept any authenticated principal (condomino, admin, fornitore, collaboratore).

    Normalises the returned dict with:
      - user['id']
      - user['ruolo']       (admin | condomino | fornitore | collaboratore)
      - user['_tipo']       (same as ruolo, kept for legacy call-sites)
    Raises 401 if the token cannot be validated to a real principal.
    """
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    ruolo = payload.get("ruolo", "")

    if ruolo == "collaboratore":
        user = await db.collaboratori.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(401, "Utente non trovato")
        if user.get("stato") != "Attivo":
            raise HTTPException(403, "Account sospeso")
        user["ruolo"] = "collaboratore"
        user["_tipo"] = "collaboratore"
        return user

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Utente non trovato")

    # If the JWT was minted with a role, trust it, but fall back to the DB one.
    resolved_ruolo = ruolo or user.get("ruolo") or "condomino"
    user["ruolo"] = resolved_ruolo
    user["_tipo"] = resolved_ruolo
    return user


# ── File Access Authorisation ────────────────────────────────────────────────

async def can_access_file(user: dict, file_id: str):
    """
    Centralised authorisation helper for uploaded files.

    Rules (deny by default):
      • admin                → all files
      • uploader             → their own uploads
      • condomino            → files referenced by their own segnalazioni.allegati
                               (immagini or allegati arrays)
      • fornitore            → files referenced by segnalazioni assigned to them
                               (via fornitore_segnalazioni) or by their rapportini
      • collaboratore        → files referenced by sopralluoghi they perform
                               (nota_vocale_generale/finale) or by anomalie of
                               those sopralluoghi (foto_ids, nota_vocale_ids,
                               nota_vocale_id)

    Returns tuple (allowed: bool, file_doc: dict | None).
    Callers must translate a missing file_doc into 404 and a False `allowed`
    on an existing file_doc into 403.
    """
    if not file_id:
        return False, None

    file_doc = await db.uploaded_files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        return False, None

    ruolo = user.get("ruolo") or user.get("_tipo") or ""
    user_id = user.get("id")
    if not user_id:
        return False, file_doc

    # 1) Admin always allowed
    if ruolo == "admin":
        return True, file_doc

    # 2) Uploader always allowed
    if file_doc.get("uploaded_by") == user_id:
        return True, file_doc

    # 3) Fornitore: only files linked to segnalazioni assigned to them
    if ruolo == "fornitore":
        # segnalazioni.allegati or immagini containing this file
        seg_ids = await db.segnalazioni.distinct(
            "id",
            {"$or": [{"allegati": file_id}, {"immagini": file_id}]},
        )
        if seg_ids:
            assigned = await db.fornitore_segnalazioni.find_one({
                "segnalazione_id": {"$in": seg_ids},
                "fornitore_id": user_id,
            })
            if assigned:
                return True, file_doc
        # rapportini foto
        rap = await db.rapportini.find_one({
            "fornitore_id": user_id,
            "foto.file_id": file_id,
        })
        if rap:
            return True, file_doc
        return False, file_doc

    # 4) Collaboratore: files linked to their sopralluoghi
    if ruolo == "collaboratore":
        sop = await db.sopralluoghi.find_one({
            "collaboratore_id": user_id,
            "$or": [
                {"nota_vocale_generale_id": file_id},
                {"nota_vocale_finale_id": file_id},
            ],
        })
        if sop:
            return True, file_doc
        anomalia = await db.sopralluoghi_anomalie.find_one({
            "$or": [
                {"foto_ids": file_id},
                {"nota_vocale_ids": file_id},
                {"nota_vocale_id": file_id},
            ],
        })
        if anomalia:
            sop_owned = await db.sopralluoghi.find_one({
                "id": anomalia.get("sopralluogo_id"),
                "collaboratore_id": user_id,
            })
            if sop_owned:
                return True, file_doc
        return False, file_doc

    # 5) Condomino (or generic user): only files in their own resources
    #    (segnalazioni.allegati or segnalazioni.immagini they own)
    seg = await db.segnalazioni.find_one({
        "user_id": user_id,
        "$or": [{"allegati": file_id}, {"immagini": file_id}],
    })
    if seg:
        return True, file_doc

    return False, file_doc
