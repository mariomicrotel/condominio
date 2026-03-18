"""Fornitori routes: admin CRUD, fornitore portal, rapportini, assignments."""
from fastapi import APIRouter, Depends, HTTPException
import uuid

from database import db, now_iso, clean_doc, create_notifica, add_timeline_event
from auth import hash_pw, get_admin_user, get_fornitore_user
from models import FornitoreCreate, AssegnaFornitoreCreate, RapportinoCreate

router = APIRouter()

# ── Admin CRUD ────────────────────────────────────────────────────────────────

@router.post("/admin/fornitori")
async def create_fornitore(data: FornitoreCreate, user=Depends(get_admin_user)):
    existing = await db.users.find_one({"email": data.email})
    if existing: raise HTTPException(400, "Email già registrata")
    password = data.password or "Fornitore123!"
    forn_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": forn_id, "email": data.email, "password_hash": hash_pw(password),
        "nome": data.ragione_sociale, "cognome": "", "telefono": data.telefono,
        "indirizzo": data.indirizzo, "codice_fiscale": data.codice_fiscale,
        "ruolo": "fornitore", "abilitato": True, "created_at": now_iso()
    })
    await db.fornitori.insert_one({
        "id": forn_id, "user_id": forn_id, "ragione_sociale": data.ragione_sociale,
        "partita_iva": data.partita_iva, "codice_fiscale": data.codice_fiscale,
        "settori": data.settori, "telefono": data.telefono, "email": data.email,
        "indirizzo": data.indirizzo, "iban": data.iban, "stato": data.stato,
        "created_at": now_iso()
    })
    return {"id": forn_id, "email": data.email, "password_temp": password, "ragione_sociale": data.ragione_sociale}

@router.get("/admin/fornitori")
async def list_fornitori(user=Depends(get_admin_user)):
    forns = await db.fornitori.find({}, {"_id": 0}).sort("ragione_sociale", 1).to_list(500)
    for f in forns: f["interventi_count"] = await db.rapportini.count_documents({"fornitore_id": f["id"]})
    return forns

@router.get("/admin/fornitori/{forn_id}")
async def get_fornitore(forn_id: str, user=Depends(get_admin_user)):
    f = await db.fornitori.find_one({"id": forn_id}, {"_id": 0})
    if not f: raise HTTPException(404, "Fornitore non trovato")
    f["interventi_count"] = await db.rapportini.count_documents({"fornitore_id": forn_id})
    return f

@router.put("/admin/fornitori/{forn_id}")
async def update_fornitore(forn_id: str, data: FornitoreCreate, user=Depends(get_admin_user)):
    upd = {k: v for k, v in data.dict().items() if k != "password" and v}
    upd["updated_at"] = now_iso()
    await db.fornitori.update_one({"id": forn_id}, {"$set": upd})
    await db.users.update_one({"id": forn_id}, {"$set": {"nome": data.ragione_sociale, "telefono": data.telefono}})
    return clean_doc(await db.fornitori.find_one({"id": forn_id}, {"_id": 0}))

@router.delete("/admin/fornitori/{forn_id}")
async def delete_fornitore(forn_id: str, user=Depends(get_admin_user)):
    await db.fornitori.delete_one({"id": forn_id})
    await db.users.delete_one({"id": forn_id})
    return {"message": "Fornitore eliminato"}

# ── Assignment ────────────────────────────────────────────────────────────────

@router.post("/admin/segnalazioni/{seg_id}/assegna")
async def assegna_fornitore(seg_id: str, data: AssegnaFornitoreCreate, user=Depends(get_admin_user)):
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if not seg: raise HTTPException(404, "Segnalazione non trovata")
    forn = await db.fornitori.find_one({"id": data.fornitore_id}, {"_id": 0})
    if not forn: raise HTTPException(404, "Fornitore non trovato")
    assegnazione = {
        "id": str(uuid.uuid4()), "segnalazione_id": seg_id, "fornitore_id": data.fornitore_id,
        "fornitore_nome": forn["ragione_sociale"], "note_admin": data.note_admin,
        "data_prevista": data.data_prevista, "stato": "assegnato", "assigned_at": now_iso()
    }
    await db.fornitore_segnalazioni.insert_one(assegnazione)
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {
        "stato": "Assegnata al fornitore", "fornitore_id": data.fornitore_id,
        "fornitore_nome": forn["ragione_sociale"], "note_fornitore_admin": data.note_admin,
        "data_prevista_intervento": data.data_prevista, "updated_at": now_iso()
    }})
    await add_timeline_event(seg_id, "assegnata_fornitore", user["id"], "admin", {
        "fornitore": forn["ragione_sociale"], "note": data.note_admin, "data_prevista": data.data_prevista
    })
    await create_notifica(data.fornitore_id, "Nuovo incarico assegnato",
        f"Nuovo incarico: {seg.get('tipologia', '')} – {seg.get('condominio_nome', 'N/A')}. Urgenza: {seg.get('urgenza', 'Media')}", "warning")
    return {**assegnazione, "_id": None}

# ── Fornitore Portal ──────────────────────────────────────────────────────────

@router.get("/fornitore/interventi")
async def fornitore_interventi(user=Depends(get_fornitore_user)):
    assignments = await db.fornitore_segnalazioni.find({"fornitore_id": user["id"]}, {"_id": 0}).sort("assigned_at", -1).to_list(500)
    result = []
    for a in assignments:
        seg = await db.segnalazioni.find_one({"id": a["segnalazione_id"]}, {"_id": 0, "user_email": 0, "user_telefono": 0})
        if seg:
            seg.pop("user_nome", None)
            cond = await db.condomini.find_one({"id": seg.get("condominio_id")}, {"_id": 0})
            seg["condominio_nome"] = cond["nome"] if cond else "N/A"
            seg["condominio_indirizzo"] = cond["indirizzo"] if cond else ""
            rapportino = await db.rapportini.find_one({"segnalazione_id": seg["id"], "fornitore_id": user["id"]}, {"_id": 0})
            seg["rapportino"] = rapportino
            seg["assegnazione"] = a
            allegati_ids = seg.get("allegati", [])
            if allegati_ids:
                files = await db.uploaded_files.find({"id": {"$in": allegati_ids}}, {"_id": 0}).to_list(50)
                seg["allegati_dettagli"] = files
            result.append(seg)
    return result

@router.get("/fornitore/interventi/{seg_id}")
async def fornitore_intervento_detail(seg_id: str, user=Depends(get_fornitore_user)):
    assignment = await db.fornitore_segnalazioni.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    if not assignment: raise HTTPException(403, "Non hai accesso a questa segnalazione")
    seg = await db.segnalazioni.find_one({"id": seg_id}, {"_id": 0, "user_email": 0, "user_telefono": 0, "user_nome": 0})
    if not seg: raise HTTPException(404, "Segnalazione non trovata")
    cond = await db.condomini.find_one({"id": seg.get("condominio_id")}, {"_id": 0})
    seg["condominio_nome"] = cond["nome"] if cond else "N/A"
    seg["condominio_indirizzo"] = cond["indirizzo"] if cond else ""
    seg["assegnazione"] = clean_doc(assignment)
    rapportino = await db.rapportini.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]}, {"_id": 0})
    seg["rapportino"] = rapportino
    allegati_ids = seg.get("allegati", [])
    if allegati_ids:
        files = await db.uploaded_files.find({"id": {"$in": allegati_ids}}, {"_id": 0}).to_list(50)
        seg["allegati_dettagli"] = files
    timeline = await db.segnalazione_timeline.find({"segnalazione_id": seg_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    seg["timeline"] = [t for t in timeline if t.get("attore_ruolo") != "admin" or t.get("evento") in ("assegnata_fornitore", "richiesto_nuovo_intervento")]
    return seg

@router.get("/fornitore/dashboard")
async def fornitore_dashboard(user=Depends(get_fornitore_user)):
    total = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"]})
    da_eseguire = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"], "stato": "assegnato"})
    in_verifica = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"], "stato": "completato"})
    completati = await db.rapportini.count_documents({"fornitore_id": user["id"]})
    return {"totale": total, "da_eseguire": da_eseguire, "in_verifica": in_verifica, "completati": completati}

# ── Rapportino ────────────────────────────────────────────────────────────────

@router.post("/fornitore/rapportino/{seg_id}")
async def create_rapportino(seg_id: str, data: RapportinoCreate, user=Depends(get_fornitore_user)):
    assignment = await db.fornitore_segnalazioni.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    if not assignment: raise HTTPException(403, "Non hai accesso a questa segnalazione")
    existing = await db.rapportini.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    rap_id = existing["id"] if existing else str(uuid.uuid4())
    rapportino = {
        "id": rap_id, "segnalazione_id": seg_id, "fornitore_id": user["id"],
        "fornitore_nome": user.get("nome", ""),
        "data_intervento": data.data_intervento, "ora_inizio": data.ora_inizio, "ora_fine": data.ora_fine,
        "descrizione_lavori": data.descrizione_lavori, "esito": data.esito,
        "materiali": data.materiali, "note": data.note, "foto": data.foto,
        "created_at": now_iso() if not existing else existing.get("created_at", now_iso()),
        "updated_at": now_iso()
    }
    if existing: await db.rapportini.replace_one({"id": rap_id}, rapportino)
    else: await db.rapportini.insert_one(rapportino)
    await db.fornitore_segnalazioni.update_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]}, {"$set": {"stato": "completato"}})
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {"stato": "Intervento completato", "updated_at": now_iso()}})
    await add_timeline_event(seg_id, "rapportino_inviato", user["id"], "fornitore", {
        "esito": data.esito, "descrizione": data.descrizione_lavori[:100], "foto_count": len(data.foto)
    })
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg:
        admins = await db.users.find({"ruolo": "admin"}, {"id": 1}).to_list(50)
        for a in admins:
            await create_notifica(a["id"], "Rapportino ricevuto", f"Il fornitore {user.get('nome', '')} ha completato l'intervento su: {seg.get('tipologia', '')}", "info")
        await create_notifica(seg["user_id"], "Intervento completato", f"L'intervento sulla tua segnalazione '{seg.get('tipologia', '')}' è stato completato", "info")
    return {k: v for k, v in rapportino.items() if k != "_id"}

@router.get("/fornitore/rapportino/{seg_id}")
async def get_rapportino(seg_id: str, user=Depends(get_fornitore_user)):
    rap = await db.rapportini.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]}, {"_id": 0})
    if not rap: raise HTTPException(404, "Rapportino non trovato")
    for f in rap.get("foto", []):
        file_doc = await db.uploaded_files.find_one({"id": f.get("file_id")}, {"_id": 0})
        if file_doc: f["file_url"] = file_doc.get("url", ""); f["filename"] = file_doc.get("filename", "")
    return rap

# ── Admin Rapportino / Close / Reopen / Timeline ─────────────────────────────

@router.get("/admin/segnalazioni/{seg_id}/rapportino")
async def admin_get_rapportino(seg_id: str, user=Depends(get_admin_user)):
    rap = await db.rapportini.find_one({"segnalazione_id": seg_id}, {"_id": 0})
    if not rap: raise HTTPException(404, "Nessun rapportino per questa segnalazione")
    for f in rap.get("foto", []):
        file_doc = await db.uploaded_files.find_one({"id": f.get("file_id")}, {"_id": 0})
        if file_doc: f["file_url"] = file_doc.get("url", ""); f["filename"] = file_doc.get("filename", "")
    return rap

@router.post("/admin/segnalazioni/{seg_id}/chiudi")
async def admin_chiudi_segnalazione(seg_id: str, user=Depends(get_admin_user)):
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {"stato": "Risolta", "updated_at": now_iso()}})
    await db.fornitore_segnalazioni.update_one({"segnalazione_id": seg_id}, {"$set": {"stato": "chiuso"}})
    await add_timeline_event(seg_id, "chiusa", user["id"], "admin", {"note": "Segnalazione chiusa dall'amministratore"})
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg:
        await create_notifica(seg["user_id"], "Segnalazione chiusa", f"La segnalazione '{seg.get('tipologia', '')}' è stata chiusa", "info")
        if seg.get("fornitore_id"): await create_notifica(seg["fornitore_id"], "Segnalazione chiusa", f"La segnalazione '{seg.get('tipologia', '')}' è stata chiusa dall'amministratore", "info")
    return {"message": "Segnalazione chiusa"}

@router.post("/admin/segnalazioni/{seg_id}/riapri")
async def admin_riapri_segnalazione(seg_id: str, user=Depends(get_admin_user)):
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {"stato": "Richiesto nuovo intervento", "updated_at": now_iso()}})
    await db.fornitore_segnalazioni.update_one({"segnalazione_id": seg_id}, {"$set": {"stato": "assegnato"}})
    await add_timeline_event(seg_id, "richiesto_nuovo_intervento", user["id"], "admin", {})
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg and seg.get("fornitore_id"):
        await create_notifica(seg["fornitore_id"], "Richiesto nuovo intervento", f"L'amministratore richiede un ulteriore intervento su: {seg.get('tipologia', '')}", "warning")
    return {"message": "Richiesto nuovo intervento"}

@router.get("/admin/segnalazioni/{seg_id}/timeline")
async def admin_get_timeline(seg_id: str, user=Depends(get_admin_user)):
    return await db.segnalazione_timeline.find({"segnalazione_id": seg_id}, {"_id": 0}).sort("created_at", 1).to_list(100)

@router.get("/admin/fornitori/{forn_id}/interventi")
async def admin_fornitore_interventi(forn_id: str, user=Depends(get_admin_user)):
    raps = await db.rapportini.find({"fornitore_id": forn_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for r in raps:
        seg = await db.segnalazioni.find_one({"id": r["segnalazione_id"]}, {"_id": 0, "tipologia": 1, "condominio_id": 1})
        if seg:
            cond = await db.condomini.find_one({"id": seg.get("condominio_id")}, {"_id": 0, "nome": 1})
            r["tipologia"] = seg.get("tipologia", "")
            r["condominio_nome"] = cond["nome"] if cond else "N/A"
    return raps
