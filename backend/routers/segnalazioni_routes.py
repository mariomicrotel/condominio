"""Segnalazioni routes: user and admin."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import uuid
from datetime import datetime

from database import db, now_iso, clean_doc, create_notifica
from auth import get_current_user, get_admin_user
from models import SegnalazioneCreate, AdminSegnalazioneUpdate, AdminSegnalazioneCreate

router = APIRouter()


@router.post("/segnalazioni")
async def create_segnalazione(data: SegnalazioneCreate, bg: BackgroundTasks, user=Depends(get_current_user)):
    cond = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    seg_id = str(uuid.uuid4())
    counter = await db.segnalazioni.count_documents({}) + 1
    protocollo = f"SEG-{datetime.now().year}-{counter:03d}"
    seg = {
        "id": seg_id, "protocollo": protocollo, "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "user_email": user["email"],
        "user_telefono": user.get("telefono", ""), "condominio_id": data.condominio_id,
        "condominio_nome": cond["nome"] if cond else "N/A", "qualita": data.qualita,
        "tipologia": data.tipologia, "descrizione": data.descrizione, "urgenza": data.urgenza,
        "stato": "Inviata", "note_admin": "", "immagini": data.immagini[:5],
        "allegati": data.allegati[:10], "created_at": now_iso(), "updated_at": now_iso()
    }
    await db.segnalazioni.insert_one(seg)
    # Email: conferma al condomino + notifica admin
    from email_service import notify_segnalazione_creata, notify_admin_nuova_segnalazione
    bg.add_task(notify_segnalazione_creata, seg, user)
    bg.add_task(notify_admin_nuova_segnalazione, seg, user)
    return {k: v for k, v in seg.items() if k != "_id"}


@router.get("/segnalazioni")
async def list_segnalazioni(user=Depends(get_current_user)):
    return await db.segnalazioni.find({"user_id": user["id"]}, {"_id": 0, "immagini": 0}).sort("created_at", -1).to_list(100)


@router.get("/segnalazioni/{seg_id}")
async def get_segnalazione(seg_id: str, user=Depends(get_current_user)):
    seg = await db.segnalazioni.find_one({"id": seg_id, "user_id": user["id"]}, {"_id": 0})
    if not seg:
        raise HTTPException(404, "Segnalazione non trovata")
    if seg.get("allegati"):
        files = await db.uploaded_files.find({"id": {"$in": seg["allegati"]}}, {"_id": 0}).to_list(50)
        seg["allegati_dettagli"] = files
    return seg


@router.get("/admin/segnalazioni")
async def admin_segnalazioni(user=Depends(get_admin_user)):
    segs = await db.segnalazioni.find({}, {"_id": 0, "immagini": 0}).sort("created_at", -1).to_list(1000)
    for s in segs:
        c = await db.condomini.find_one({"id": s.get("condominio_id")}, {"_id": 0})
        s["condominio_nome"] = c["nome"] if c else "N/A"
    return segs


@router.put("/admin/segnalazioni/{seg_id}")
async def admin_update_seg(seg_id: str, data: AdminSegnalazioneUpdate, bg: BackgroundTasks, user=Depends(get_admin_user)):
    upd = {"updated_at": now_iso()}
    if data.stato:
        upd["stato"] = data.stato
    if data.note_admin is not None:
        upd["note_admin"] = data.note_admin
    if data.tipologia is not None:
        upd["tipologia"] = data.tipologia
    if data.descrizione is not None:
        upd["descrizione"] = data.descrizione
    if data.urgenza is not None:
        upd["urgenza"] = data.urgenza
    if data.allegati is not None:
        upd["allegati"] = data.allegati
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": upd})
    seg = await db.segnalazioni.find_one({"id": seg_id}, {"_id": 0})
    if seg and data.stato:
        await create_notifica(seg["user_id"], "Segnalazione aggiornata", f"La tua segnalazione '{seg.get('tipologia', '')}' è ora: {data.stato}", "warning")
        # Email: notifica cambio stato al condomino
        from email_service import notify_segnalazione_aggiornata
        bg.add_task(notify_segnalazione_aggiornata, seg, data.stato, data.note_admin or "")
    return clean_doc(seg)


@router.post("/admin/segnalazioni")
async def admin_create_seg(data: AdminSegnalazioneCreate, user=Depends(get_admin_user)):
    cond = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    if not cond:
        raise HTTPException(404, "Condominio non trovato")
    seg_id = str(uuid.uuid4())
    counter = await db.segnalazioni.count_documents({}) + 1
    protocollo = f"SEG-{datetime.now().year}-{counter:03d}"
    seg = {
        "id": seg_id, "protocollo": protocollo, "user_id": user["id"],
        "user_nome": f"{user['nome']} {user.get('cognome', '')} (Admin)",
        "user_email": user.get("email", ""), "user_telefono": "",
        "condominio_id": data.condominio_id, "condominio_nome": cond["nome"],
        "qualita": "Amministratore", "tipologia": data.tipologia,
        "descrizione": data.descrizione, "urgenza": data.urgenza,
        "stato": "Inviata", "note_admin": data.note_admin,
        "immagini": [], "allegati": data.allegati[:10],
        "created_at": now_iso(), "updated_at": now_iso()
    }
    await db.segnalazioni.insert_one(seg)
    return {k: v for k, v in seg.items() if k != "_id"}
