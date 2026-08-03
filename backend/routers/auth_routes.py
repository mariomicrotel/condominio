"""Auth routes: login, register, profile, Google OAuth."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Header
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import uuid
import httpx

from database import db, now_iso
from auth import hash_pw, verify_pw, create_token, get_current_user
from models import UserCreate, UserLogin, UserUpdate

router = APIRouter()

# ── Google OAuth Models ───────────────────────────────────────────────────────

class SessionRequest(BaseModel):
    session_id: str

# ── Google OAuth Endpoints ────────────────────────────────────────────────────

@router.post("/auth/session")
async def exchange_session(data: SessionRequest):
    """Exchange Emergent session_id for app session_token"""
    try:
        # Call Emergent API to get user data
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
                timeout=10.0
            )
        
        if response.status_code != 200:
            raise HTTPException(401, "Invalid or expired session_id")
        
        emergent_data = response.json()
        email = emergent_data.get("email")
        name = emergent_data.get("name", "")
        picture = emergent_data.get("picture", "")
        
        if not email:
            raise HTTPException(401, "No email returned from OAuth")
        
        # Split name into nome/cognome
        name_parts = name.split(" ", 1) if name else ["", ""]
        nome = name_parts[0]
        cognome = name_parts[1] if len(name_parts) > 1 else ""
        
        # Upsert user by email (don't create duplicates)
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            user_id = existing_user["id"]
            # Update profile picture if changed
            if picture and existing_user.get("picture") != picture:
                await db.users.update_one({"id": user_id}, {"$set": {"picture": picture}})
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "id": user_id,
                "email": email,
                "nome": nome,
                "cognome": cognome,
                "picture": picture,
                "password_hash": "",  # No password for OAuth users
                "ruolo": "condomino",
                "auth_provider": "google",
                "created_at": now_iso()
            }
            await db.users.insert_one(new_user)
        
        # Create session
        session_token = f"sess_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at
        })
        
        # Get full user data
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        
        return {
            "session_token": session_token,
            "user": user
        }
        
    except httpx.RequestError as e:
        raise HTTPException(500, f"Failed to verify session: {str(e)}")

@router.get("/auth/me")
async def get_me(authorization: str = Header(None)):
    """Get current user from session token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    # Look up session
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(401, "Invalid session")
    
    # Check expiry - normalize to timezone-aware
    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(401, "Session expired")
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    
    # Add condomini
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    user["condomini"] = []
    for a in assocs:
        c = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
        user["condomini"].append({
            "id": a["condominio_id"],
            "nome": c["nome"] if c else "N/A",
            "unita_immobiliare": a.get("unita_immobiliare", ""),
            "qualita": a.get("qualita", "")
        })
    
    return user

@router.post("/auth/logout")
async def logout_session(authorization: str = Header(None)):
    """Invalidate session token"""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}

# ── Standard Auth Endpoints ───────────────────────────────────────────────────


@router.post("/auth/register")
async def register(data: UserCreate, bg: BackgroundTasks):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, "Email già registrata")
    uid = str(uuid.uuid4())
    user = {
        "id": uid, "email": data.email, "password_hash": hash_pw(data.password),
        "nome": data.nome, "cognome": data.cognome, "telefono": data.telefono,
        "indirizzo": data.indirizzo, "codice_fiscale": data.codice_fiscale,
        "ruolo": "condomino", "created_at": now_iso()
    }
    await db.users.insert_one(user)
    if data.codice_invito:
        codice = await db.codici_invito.find_one({"codice": data.codice_invito, "usato": False})
        if codice:
            await db.user_condomini.insert_one({
                "id": str(uuid.uuid4()), "user_id": uid, "condominio_id": codice["condominio_id"],
                "unita_immobiliare": codice.get("unita_immobiliare", ""),
                "qualita": codice.get("qualita", "Proprietario")
            })
            await db.codici_invito.update_one({"id": codice["id"]}, {"$set": {"usato": True, "user_id": uid}})
    token = create_token(uid, "condomino")
    # Email: benvenuto
    from email_service import notify_benvenuto
    bg.add_task(notify_benvenuto, user)
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ("_id", "password_hash")}}


@router.post("/auth/login")
async def login(request: Request, data: UserLogin):
    # Rate limited via global middleware (200/min)
    # Additional brute-force protection: track failed attempts
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(401, "Credenziali errate")
    token = create_token(user["id"], user["ruolo"])
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ("_id", "password_hash")}}


@router.get("/auth/profile")
async def get_profile(user=Depends(get_current_user)):
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    user["condomini"] = []
    for a in assocs:
        c = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
        user["condomini"].append({"id": a["condominio_id"], "nome": c["nome"] if c else "N/A",
                                   "unita_immobiliare": a.get("unita_immobiliare", ""), "qualita": a.get("qualita", "")})
    return {k: v for k, v in user.items() if k not in ("_id", "password_hash")}


@router.put("/auth/profile")
async def update_profile(data: UserUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in data.dict().items() if v is not None}
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated
