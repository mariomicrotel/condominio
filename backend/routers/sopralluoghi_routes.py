"""Sopralluoghi routes: CRUD, checklist, anomalie."""
from fastapi import APIRouter, Depends, HTTPException
import uuid
from datetime import datetime

from database import db, now_iso, clean_doc, create_notifica, add_timeline_event, CHECKLIST_VOCI, CHECKLIST_TIPOLOGIA_MAP
from auth import get_admin_user, get_admin_or_collaboratore
from models import SopralluogoCreate, SopralluogoClose, ChecklistItemUpdate, AnomaliaCreate

router = APIRouter()


@router.post("/sopralluoghi")
async def create_sopralluogo(data: SopralluogoCreate, user=Depends(get_admin_or_collaboratore)):
    collab_id = data.collaboratore_id or user["id"]
    if data.collaboratore_id:
        collab = await db.collaboratori.find_one({"id": data.collaboratore_id})
        if not collab: raise HTTPException(404, "Collaboratore non trovato")
    cond = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    if not cond: raise HTTPException(404, "Condominio non trovato")
    sopralluogo_id = str(uuid.uuid4())
    if user["_tipo"] == "collaboratore":
        eseguito_da = f"{user.get('nome', '')} {user.get('cognome', '')}"
    else:
        collab = await db.collaboratori.find_one({"id": collab_id})
        eseguito_da = f"{collab['nome']} {collab['cognome']}" if collab else f"{user.get('nome', '')} {user.get('cognome', '')}"
    sopralluogo = {
        "id": sopralluogo_id, "condominio_id": data.condominio_id,
        "condominio_nome": cond["nome"], "condominio_indirizzo": cond["indirizzo"],
        "collaboratore_id": collab_id, "eseguito_da": eseguito_da,
        "data": data.data, "ora_inizio": data.ora_inizio or datetime.now().strftime("%H:%M"),
        "ora_fine": None, "motivo": data.motivo, "note_generali": data.note_generali,
        "nota_vocale_generale_id": data.nota_vocale_generale_id,
        "note_finali": None, "nota_vocale_finale_id": None,
        "valutazione": None, "stato": "in_corso", "created_at": now_iso()
    }
    await db.sopralluoghi.insert_one(sopralluogo)
    checklist_items = []
    for i, voce in enumerate(CHECKLIST_VOCI):
        checklist_items.append({"id": str(uuid.uuid4()), "sopralluogo_id": sopralluogo_id, "voce": voce, "ordine": i, "stato": "non_controllato"})
    await db.sopralluoghi_checklist.insert_many(checklist_items)
    if data.collaboratore_id and data.collaboratore_id != user["id"]:
        await create_notifica(data.collaboratore_id, "Nuovo sopralluogo assegnato", f"Ti è stato assegnato un sopralluogo per {cond['nome']} in data {data.data}", "info")
    return {k: v for k, v in sopralluogo.items() if k != "_id"}


@router.get("/sopralluoghi")
async def list_sopralluoghi(user=Depends(get_admin_or_collaboratore)):
    query = {} if user["_tipo"] != "collaboratore" else {"collaboratore_id": user["id"]}
    sopralluoghi = await db.sopralluoghi.find(query, {"_id": 0}).sort("data", -1).to_list(500)
    for s in sopralluoghi:
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": s["id"]}, {"_id": 0}).to_list(50)
        s["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
        s["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
        s["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
        s["segnalazioni_create"] = await db.sopralluoghi_anomalie.count_documents({"sopralluogo_id": s["id"], "segnalazione_id": {"$ne": None}})
    return sopralluoghi


@router.get("/sopralluoghi/{sop_id}")
async def get_sopralluogo(sop_id: str, user=Depends(get_admin_or_collaboratore)):
    sop = await db.sopralluoghi.find_one({"id": sop_id}, {"_id": 0})
    if not sop: raise HTTPException(404, "Sopralluogo non trovato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]:
        raise HTTPException(403, "Non hai accesso a questo sopralluogo")
    checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": sop_id}, {"_id": 0}).sort("ordine", 1).to_list(50)
    for item in checklist:
        if item["stato"] == "anomalia":
            anomalia = await db.sopralluoghi_anomalie.find_one({"checklist_item_id": item["id"]}, {"_id": 0})
            if anomalia:
                if anomalia.get("foto_ids"):
                    anomalia["foto_dettagli"] = await db.uploaded_files.find({"id": {"$in": anomalia["foto_ids"]}}, {"_id": 0}).to_list(20)
                if anomalia.get("nota_vocale_ids"):
                    anomalia["nota_vocale_dettagli"] = await db.uploaded_files.find({"id": {"$in": anomalia["nota_vocale_ids"]}}, {"_id": 0}).to_list(20)
                elif anomalia.get("nota_vocale_id"):
                    vn = await db.uploaded_files.find_one({"id": anomalia["nota_vocale_id"]}, {"_id": 0})
                    anomalia["nota_vocale_dettagli"] = [vn] if vn else []
                item["anomalia"] = anomalia
    sop["checklist"] = checklist
    sop["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
    sop["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
    sop["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
    if sop.get("nota_vocale_generale_id"):
        sop["nota_vocale_generale_dettagli"] = await db.uploaded_files.find_one({"id": sop["nota_vocale_generale_id"]}, {"_id": 0})
    if sop.get("nota_vocale_finale_id"):
        sop["nota_vocale_finale_dettagli"] = await db.uploaded_files.find_one({"id": sop["nota_vocale_finale_id"]}, {"_id": 0})
    return sop


@router.put("/sopralluoghi/{sop_id}/checklist/{item_id}")
async def update_checklist_item(sop_id: str, item_id: str, data: ChecklistItemUpdate, user=Depends(get_admin_or_collaboratore)):
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop: raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso": raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]: raise HTTPException(403, "Non hai accesso")
    item = await db.sopralluoghi_checklist.find_one({"id": item_id, "sopralluogo_id": sop_id})
    if not item: raise HTTPException(404, "Voce checklist non trovata")
    if item["stato"] == "anomalia" and data.stato != "anomalia":
        await db.sopralluoghi_anomalie.delete_one({"checklist_item_id": item_id})
    await db.sopralluoghi_checklist.update_one({"id": item_id}, {"$set": {"stato": data.stato}})
    return {"message": "Stato aggiornato", "stato": data.stato}


@router.post("/sopralluoghi/{sop_id}/checklist/{item_id}/anomalia")
async def create_anomalia(sop_id: str, item_id: str, data: AnomaliaCreate, user=Depends(get_admin_or_collaboratore)):
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop: raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso": raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]: raise HTTPException(403, "Non hai accesso")
    item = await db.sopralluoghi_checklist.find_one({"id": item_id, "sopralluogo_id": sop_id})
    if not item: raise HTTPException(404, "Voce checklist non trovata")
    await db.sopralluoghi_checklist.update_one({"id": item_id}, {"$set": {"stato": "anomalia"}})
    existing = await db.sopralluoghi_anomalie.find_one({"checklist_item_id": item_id})
    anomalia_id = existing["id"] if existing else str(uuid.uuid4())
    anomalia = {
        "id": anomalia_id, "sopralluogo_id": sop_id, "checklist_item_id": item_id,
        "voce": item["voce"], "descrizione": data.descrizione, "gravita": data.gravita,
        "nota_vocale_ids": data.nota_vocale_ids, "foto_ids": data.foto_ids,
        "foto_didascalie": data.foto_didascalie,
        "segnalazione_id": existing.get("segnalazione_id") if existing else None,
        "created_at": existing.get("created_at", now_iso()) if existing else now_iso(),
        "updated_at": now_iso()
    }
    if data.apri_segnalazione and not anomalia.get("segnalazione_id"):
        if not data.fornitore_id: raise HTTPException(400, "Fornitore obbligatorio per aprire una segnalazione")
        forn = await db.fornitori.find_one({"id": data.fornitore_id}, {"_id": 0})
        if not forn: raise HTTPException(404, "Fornitore non trovato")
        seg_id = str(uuid.uuid4())
        protocollo = f"SEG-{datetime.now().year}-{str(uuid.uuid4())[:6].upper()}"
        tipologia = data.tipologia_intervento or CHECKLIST_TIPOLOGIA_MAP.get(item["voce"], "Altro")
        urgenza = data.urgenza_segnalazione or ("Alta" if data.gravita in ("Grave", "Urgente") else "Media")
        segnalazione = {
            "id": seg_id, "protocollo": protocollo, "user_id": user["id"],
            "condominio_id": sop["condominio_id"], "condominio_nome": sop["condominio_nome"],
            "tipologia": tipologia, "descrizione": f"[Da sopralluogo del {sop['data']}] {data.descrizione}",
            "urgenza": urgenza, "stato": "Assegnata al fornitore", "allegati": data.foto_ids,
            "note_admin": data.note_fornitore or "", "fornitore_id": data.fornitore_id,
            "fornitore_nome": forn["ragione_sociale"], "data_prevista_intervento": data.data_prevista_intervento or "",
            "sopralluogo_id": sop_id, "created_at": now_iso()
        }
        await db.segnalazioni.insert_one(segnalazione)
        assegnazione = {
            "id": str(uuid.uuid4()), "segnalazione_id": seg_id, "fornitore_id": data.fornitore_id,
            "fornitore_nome": forn["ragione_sociale"], "note_admin": data.note_fornitore or "",
            "data_prevista": data.data_prevista_intervento or "", "stato": "assegnato", "assigned_at": now_iso()
        }
        await db.fornitore_segnalazioni.insert_one(assegnazione)
        await add_timeline_event(seg_id, "creata_da_sopralluogo", user["id"], user["_tipo"], {"sopralluogo_id": sop_id, "voce_checklist": item["voce"], "rilevata_da": sop["eseguito_da"]})
        await add_timeline_event(seg_id, "assegnata_fornitore", user["id"], user["_tipo"], {"fornitore": forn["ragione_sociale"]})
        await create_notifica(data.fornitore_id, "Nuovo incarico da sopralluogo", f"Nuovo incarico: {tipologia} – {sop['condominio_nome']}. Rilevato durante sopralluogo.", "warning")
        anomalia["segnalazione_id"] = seg_id
        anomalia["segnalazione_protocollo"] = protocollo
    if existing: await db.sopralluoghi_anomalie.replace_one({"id": anomalia_id}, anomalia)
    else: await db.sopralluoghi_anomalie.insert_one(anomalia)
    return {k: v for k, v in anomalia.items() if k != "_id"}


@router.post("/sopralluoghi/{sop_id}/chiudi")
async def close_sopralluogo(sop_id: str, data: SopralluogoClose, user=Depends(get_admin_or_collaboratore)):
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop: raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso": raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]: raise HTTPException(403, "Non hai accesso")
    await db.sopralluoghi.update_one({"id": sop_id}, {"$set": {
        "ora_fine": data.ora_fine or datetime.now().strftime("%H:%M"),
        "note_finali": data.note_finali, "nota_vocale_finale_id": data.nota_vocale_finale_id,
        "valutazione": data.valutazione, "stato": "completato", "completed_at": now_iso()
    }})
    if user["_tipo"] == "collaboratore":
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": sop_id}, {"_id": 0}).to_list(50)
        anomalie_count = len([c for c in checklist if c["stato"] == "anomalia"])
        admins = await db.users.find({"ruolo": "admin"}, {"id": 1}).to_list(50)
        for a in admins:
            await create_notifica(a["id"], "Sopralluogo completato", f"Sopralluogo {sop['condominio_nome']} completato da {sop['eseguito_da']} — {anomalie_count} anomalie rilevate", "info")
    return {"message": "Sopralluogo completato"}


@router.post("/sopralluoghi/{sop_id}/riapri")
async def reopen_sopralluogo(sop_id: str, user=Depends(get_admin_user)):
    await db.sopralluoghi.update_one({"id": sop_id}, {"$set": {"stato": "in_corso", "completed_at": None}})
    return {"message": "Sopralluogo riaperto"}


@router.delete("/sopralluoghi/{sop_id}")
async def delete_sopralluogo(sop_id: str, user=Depends(get_admin_user)):
    await db.sopralluoghi.delete_one({"id": sop_id})
    await db.sopralluoghi_checklist.delete_many({"sopralluogo_id": sop_id})
    await db.sopralluoghi_anomalie.delete_many({"sopralluogo_id": sop_id})
    return {"message": "Sopralluogo eliminato"}


@router.get("/condomini/{cond_id}/sopralluoghi")
async def condominio_sopralluoghi(cond_id: str, user=Depends(get_admin_or_collaboratore)):
    sopralluoghi = await db.sopralluoghi.find({"condominio_id": cond_id}, {"_id": 0}).sort("data", -1).to_list(100)
    for s in sopralluoghi:
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": s["id"]}, {"_id": 0}).to_list(50)
        s["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
        s["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
        s["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
    return sopralluoghi
