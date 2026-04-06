"""Auth routes: login, register, profile."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import uuid

from database import db, now_iso
from auth import hash_pw, verify_pw, create_token, get_current_user
from models import UserCreate, UserLogin, UserUpdate

router = APIRouter()


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
async def login(data: UserLogin):
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
