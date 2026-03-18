"""Collaboratori routes: admin CRUD + collaboratore auth."""
from fastapi import APIRouter, Depends, HTTPException
import uuid

from database import db, now_iso, clean_doc
from auth import hash_pw, verify_pw, create_token, get_admin_user, get_collaboratore_user
from models import UserLogin, CollaboratoreCreate, CollaboratoreUpdate

router = APIRouter()

# ── Admin CRUD ────────────────────────────────────────────────────────────────

@router.post("/admin/collaboratori")
async def create_collaboratore(data: CollaboratoreCreate, user=Depends(get_admin_user)):
    existing = await db.collaboratori.find_one({"email": data.email})
    if existing: raise HTTPException(400, "Email già registrata")
    collab_id = str(uuid.uuid4())
    collaboratore = {
        "id": collab_id, "nome": data.nome, "cognome": data.cognome,
        "email": data.email, "password_hash": hash_pw(data.password),
        "telefono": data.telefono, "qualifica": data.qualifica,
        "stato": data.stato, "created_by": user["id"], "created_at": now_iso()
    }
    await db.collaboratori.insert_one(collaboratore)
    return {k: v for k, v in collaboratore.items() if k not in ("_id", "password_hash")}

@router.get("/admin/collaboratori")
async def list_collaboratori(user=Depends(get_admin_user)):
    collabs = await db.collaboratori.find({}, {"_id": 0, "password_hash": 0}).sort("nome", 1).to_list(200)
    for c in collabs: c["sopralluoghi_count"] = await db.sopralluoghi.count_documents({"collaboratore_id": c["id"]})
    return collabs

@router.put("/admin/collaboratori/{collab_id}")
async def update_collaboratore(collab_id: str, data: CollaboratoreUpdate, user=Depends(get_admin_user)):
    upd = {k: v for k, v in data.dict().items() if v is not None}
    upd["updated_at"] = now_iso()
    await db.collaboratori.update_one({"id": collab_id}, {"$set": upd})
    return clean_doc(await db.collaboratori.find_one({"id": collab_id}, {"_id": 0, "password_hash": 0}))

@router.delete("/admin/collaboratori/{collab_id}")
async def delete_collaboratore(collab_id: str, user=Depends(get_admin_user)):
    await db.collaboratori.delete_one({"id": collab_id})
    return {"message": "Collaboratore eliminato"}

# ── Login & Profilo ───────────────────────────────────────────────────────────

@router.post("/collaboratore/login")
async def collaboratore_login(data: UserLogin):
    collab = await db.collaboratori.find_one({"email": data.email})
    if not collab or not verify_pw(data.password, collab["password_hash"]):
        raise HTTPException(401, "Credenziali errate")
    if collab.get("stato") != "Attivo":
        raise HTTPException(403, "Account sospeso")
    token = create_token(collab["id"], "collaboratore")
    user_data = {k: v for k, v in collab.items() if k not in ("_id", "password_hash")}
    user_data["ruolo"] = "collaboratore"
    return {"token": token, "user": user_data}

@router.get("/collaboratore/profilo")
async def collaboratore_profilo(user=Depends(get_collaboratore_user)):
    user_data = {k: v for k, v in user.items() if k != "_id"}
    user_data["ruolo"] = "collaboratore"
    return user_data
