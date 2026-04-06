"""Admin routes: dashboard, utenti, associazioni, codici invito, config, export, appuntamenti, avvisi, trasmissioni, estratti conto, richieste doc."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import uuid, io, csv
from datetime import datetime

from database import db, now_iso, clean_doc, create_notifica, notify_admins
from auth import get_current_user, get_admin_user
from models import (
    AppuntamentoCreate, AdminAppuntamentoUpdate, AvvisoCreate,
    CodiceInvitoCreate, AssociaUtenteCreate, AdminRichiestaUpdate,
    RichiestaDocCreate, TrasmissioneCreate, EstrattoContoCreate, ConfigUpdate,
)

router = APIRouter()

# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/admin/dashboard")
async def admin_dashboard(user=Depends(get_admin_user)):
    return {
        "totale_utenti": await db.users.count_documents({"ruolo": "condomino"}),
        "totale_condomini": await db.condomini.count_documents({}),
        "segnalazioni_aperte": await db.segnalazioni.count_documents({"stato": {"$ne": "Risolta"}}),
        "richieste_in_attesa": await db.richieste_documenti.count_documents({"stato": "In attesa"}),
        "appuntamenti_da_confermare": await db.appuntamenti.count_documents({"stato": "In attesa di conferma"}),
        "totale_avvisi": await db.avvisi.count_documents({})
    }

# ── Utenti ────────────────────────────────────────────────────────────────────

@router.get("/admin/utenti")
async def admin_utenti(user=Depends(get_admin_user)):
    utenti = await db.users.find({"ruolo": "condomino"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in utenti:
        assocs = await db.user_condomini.find({"user_id": u["id"]}, {"_id": 0}).to_list(100)
        u["associazioni"] = []
        for a in assocs:
            c = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
            u["associazioni"].append({
                "assoc_id": a["id"], "condominio_id": a["condominio_id"],
                "condominio_nome": c["nome"] if c else "N/A",
                "unita_immobiliare": a.get("unita_immobiliare", ""), "qualita": a.get("qualita", "")
            })
        u["condomini_nomi"] = [a["condominio_nome"] for a in u["associazioni"]]
        u["abilitato"] = len(u["associazioni"]) > 0
    return utenti

@router.post("/admin/associa-utente")
async def admin_associa_utente(data: AssociaUtenteCreate, user=Depends(get_admin_user)):
    u = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not u: raise HTTPException(404, "Utente non trovato")
    c = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    if not c: raise HTTPException(404, "Condominio non trovato")
    existing = await db.user_condomini.find_one({"user_id": data.user_id, "condominio_id": data.condominio_id})
    if existing: raise HTTPException(400, "Utente già associato a questo condominio")
    assoc = {"id": str(uuid.uuid4()), "user_id": data.user_id, "condominio_id": data.condominio_id,
             "unita_immobiliare": data.unita_immobiliare, "qualita": data.qualita}
    await db.user_condomini.insert_one(assoc)
    return {"message": "Utente associato con successo", "assoc_id": assoc["id"],
            "condominio_nome": c["nome"], "unita_immobiliare": data.unita_immobiliare, "qualita": data.qualita}

@router.delete("/admin/associazione/{assoc_id}")
async def admin_disassocia(assoc_id: str, user=Depends(get_admin_user)):
    result = await db.user_condomini.delete_one({"id": assoc_id})
    if result.deleted_count == 0: raise HTTPException(404, "Associazione non trovata")
    return {"message": "Associazione rimossa"}

@router.post("/admin/codici-invito")
async def admin_create_codice(data: CodiceInvitoCreate, user=Depends(get_admin_user)):
    codice = {"id": str(uuid.uuid4()), "codice": str(uuid.uuid4())[:8].upper(),
              "condominio_id": data.condominio_id, "unita_immobiliare": data.unita_immobiliare,
              "qualita": data.qualita, "usato": False, "user_id": None, "created_at": now_iso()}
    await db.codici_invito.insert_one(codice)
    return {k: v for k, v in codice.items() if k != "_id"}

@router.get("/admin/codici-invito")
async def admin_codici(user=Depends(get_admin_user)):
    return await db.codici_invito.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

# ── Appuntamenti ──────────────────────────────────────────────────────────────

@router.post("/appuntamenti")
async def create_appuntamento(data: AppuntamentoCreate, bg: BackgroundTasks, user=Depends(get_current_user)):
    appt = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "user_email": user["email"],
        "user_telefono": user.get("telefono", ""), "motivo": data.motivo,
        "data_richiesta": data.data_richiesta, "fascia_oraria": data.fascia_oraria,
        "data_confermata": "", "stato": "In attesa di conferma",
        "note": data.note, "note_admin": "", "created_at": now_iso()
    }
    await db.appuntamenti.insert_one(appt)
    # Email: notifica admin
    from email_service import notify_admin_nuovo_appuntamento
    bg.add_task(notify_admin_nuovo_appuntamento, appt, user)
    return {k: v for k, v in appt.items() if k != "_id"}

@router.get("/appuntamenti")
async def list_appuntamenti(user=Depends(get_current_user)):
    return await db.appuntamenti.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.get("/admin/appuntamenti")
async def admin_appuntamenti(user=Depends(get_admin_user)):
    return await db.appuntamenti.find({}, {"_id": 0}).sort("data_richiesta", -1).to_list(1000)

@router.put("/admin/appuntamenti/{app_id}")
async def admin_update_app(app_id: str, data: AdminAppuntamentoUpdate, bg: BackgroundTasks, user=Depends(get_admin_user)):
    upd = {}
    if data.stato: upd["stato"] = data.stato
    if data.data_confermata: upd["data_confermata"] = data.data_confermata
    if data.note_admin is not None: upd["note_admin"] = data.note_admin
    if upd: await db.appuntamenti.update_one({"id": app_id}, {"$set": upd})
    appt = await db.appuntamenti.find_one({"id": app_id}, {"_id": 0})
    if appt and data.stato:
        await create_notifica(appt["user_id"], "Appuntamento aggiornato", f"Il tuo appuntamento '{appt['motivo']}' è ora: {data.stato}", "calendar")
        # Email: notifica condomino
        from email_service import notify_appuntamento_aggiornato
        bg.add_task(notify_appuntamento_aggiornato, appt, data.stato)
    return clean_doc(appt)

# ── Avvisi ────────────────────────────────────────────────────────────────────

@router.get("/avvisi")
async def list_avvisi(user=Depends(get_current_user)):
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    cond_ids = [a["condominio_id"] for a in assocs]
    avvisi = await db.avvisi.find(
        {"$or": [{"condominio_id": {"$in": cond_ids}}, {"condominio_id": None}, {"condominio_id": ""}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    letti = await db.avvisi_letti.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    letti_ids = {l["avviso_id"] for l in letti}
    for a in avvisi:
        a["letto"] = a["id"] in letti_ids
    return avvisi

@router.put("/avvisi/{avviso_id}/letto")
async def mark_letto(avviso_id: str, user=Depends(get_current_user)):
    existing = await db.avvisi_letti.find_one({"user_id": user["id"], "avviso_id": avviso_id})
    if not existing:
        await db.avvisi_letti.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "avviso_id": avviso_id})
    return {"message": "Segnato come letto"}

@router.post("/admin/avvisi")
async def admin_create_avviso(data: AvvisoCreate, bg: BackgroundTasks, user=Depends(get_admin_user)):
    avviso = {"id": str(uuid.uuid4()), "condominio_id": data.condominio_id,
              "titolo": data.titolo, "testo": data.testo, "categoria": data.categoria, "created_at": now_iso()}
    await db.avvisi.insert_one(avviso)
    if data.condominio_id:
        assocs = await db.user_condomini.find({"condominio_id": data.condominio_id}, {"_id": 0}).to_list(1000)
    else:
        assocs = await db.user_condomini.find({}, {"_id": 0}).to_list(1000)
    notified = set()
    destinatari_emails = []
    for a in assocs:
        if a["user_id"] not in notified:
            await create_notifica(a["user_id"], f"Nuovo avviso: {data.titolo}", data.testo[:100], "announcement")
            notified.add(a["user_id"])
            u = await db.users.find_one({"id": a["user_id"]}, {"email": 1, "nome": 1, "cognome": 1})
            if u:
                destinatari_emails.append({"email": u["email"], "nome": f"{u.get('nome', '')} {u.get('cognome', '')}"})
    # Email: notifica condomini
    from email_service import notify_nuovo_avviso
    bg.add_task(notify_nuovo_avviso, avviso, destinatari_emails)
    return {k: v for k, v in avviso.items() if k != "_id"}

@router.get("/admin/avvisi")
async def admin_list_avvisi(user=Depends(get_admin_user)):
    return await db.avvisi.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@router.delete("/admin/avvisi/{avviso_id}")
async def admin_delete_avviso(avviso_id: str, user=Depends(get_admin_user)):
    await db.avvisi.delete_one({"id": avviso_id})
    return {"message": "Avviso eliminato"}

# ── Notifiche ─────────────────────────────────────────────────────────────────

@router.get("/notifiche")
async def list_notifiche(user=Depends(get_current_user)):
    return await db.notifiche.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

@router.get("/notifiche/count")
async def count_notifiche(user=Depends(get_current_user)):
    count = await db.notifiche.count_documents({"user_id": user["id"], "letto": False})
    return {"count": count}

@router.put("/notifiche/{notifica_id}/letto")
async def mark_notifica_letta(notifica_id: str, user=Depends(get_current_user)):
    await db.notifiche.update_one({"id": notifica_id, "user_id": user["id"]}, {"$set": {"letto": True}})
    return {"message": "Segnata come letta"}

@router.put("/notifiche/letto-tutte")
async def mark_all_lette(user=Depends(get_current_user)):
    await db.notifiche.update_many({"user_id": user["id"], "letto": False}, {"$set": {"letto": True}})
    return {"message": "Tutte le notifiche segnate come lette"}

# ── Trasmissioni ──────────────────────────────────────────────────────────────

@router.post("/trasmissioni")
async def create_trasmissione(data: TrasmissioneCreate, bg: BackgroundTasks, user=Depends(get_current_user)):
    trasm = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "condominio_id": data.condominio_id,
        "oggetto": data.oggetto, "note": data.note, "stato": "Inviato",
        "files": data.files[:5], "created_at": now_iso()
    }
    await db.trasmissioni.insert_one(trasm)
    await notify_admins("Nuova trasmissione documenti", f"{trasm['user_nome']} ha trasmesso: {data.oggetto}", "document", "/admin")
    # Email: notifica admin
    from email_service import notify_admin_nuova_trasmissione
    bg.add_task(notify_admin_nuova_trasmissione, trasm, user)
    return {k: v for k, v in trasm.items() if k != "_id"}

@router.get("/trasmissioni")
async def list_trasmissioni(user=Depends(get_current_user)):
    return await db.trasmissioni.find({"user_id": user["id"]}, {"_id": 0, "files": 0}).sort("created_at", -1).to_list(100)

@router.get("/admin/trasmissioni")
async def admin_trasmissioni(user=Depends(get_admin_user)):
    return await db.trasmissioni.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@router.put("/admin/trasmissioni/{trasm_id}")
async def admin_update_trasm(trasm_id: str, stato: str = "Ricevuto", user=Depends(get_admin_user)):
    await db.trasmissioni.update_one({"id": trasm_id}, {"$set": {"stato": stato}})
    trasm = await db.trasmissioni.find_one({"id": trasm_id}, {"_id": 0})
    if trasm:
        await create_notifica(trasm["user_id"], "Trasmissione aggiornata", f"La tua trasmissione '{trasm['oggetto']}' è stata aggiornata a: {stato}", "document")
    return clean_doc(trasm)

# ── Richieste Documenti ───────────────────────────────────────────────────────

@router.post("/richieste-documenti")
async def create_richiesta(data: RichiestaDocCreate, bg: BackgroundTasks, user=Depends(get_current_user)):
    rich = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}",
        "condominio_id": data.condominio_id, "tipo_documento": data.tipo_documento,
        "note": data.note, "formato": data.formato, "stato": "In attesa",
        "file_url": "", "created_at": now_iso()
    }
    await db.richieste_documenti.insert_one(rich)
    await notify_admins("Nuova richiesta documento", f"{rich['user_nome']} richiede: {data.tipo_documento}", "document")
    # Email: notifica admin
    from email_service import notify_admin_nuova_richiesta_doc
    bg.add_task(notify_admin_nuova_richiesta_doc, rich, user)
    return {k: v for k, v in rich.items() if k != "_id"}

@router.get("/richieste-documenti")
async def list_richieste(user=Depends(get_current_user)):
    return await db.richieste_documenti.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.get("/admin/richieste-documenti")
async def admin_richieste(user=Depends(get_admin_user)):
    return await db.richieste_documenti.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@router.put("/admin/richieste-documenti/{rich_id}")
async def admin_update_richiesta(rich_id: str, data: AdminRichiestaUpdate, bg: BackgroundTasks, user=Depends(get_admin_user)):
    upd = {}
    if data.stato: upd["stato"] = data.stato
    if data.file_url: upd["file_url"] = data.file_url
    if upd: await db.richieste_documenti.update_one({"id": rich_id}, {"$set": upd})
    rich = await db.richieste_documenti.find_one({"id": rich_id}, {"_id": 0})
    if rich and data.stato:
        # Email: notifica condomino
        from email_service import notify_richiesta_doc_evasa
        bg.add_task(notify_richiesta_doc_evasa, rich, data.stato)
    return clean_doc(rich)

# ── Estratto Conto ────────────────────────────────────────────────────────────

@router.get("/estratto-conto")
async def get_estratto_conto(user=Depends(get_current_user)):
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    result = []
    for a in assocs:
        ec = await db.estratti_conto.find_one({"user_id": user["id"], "condominio_id": a["condominio_id"]}, {"_id": 0})
        cond = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
        if ec:
            ec["condominio_nome"] = cond["nome"] if cond else "N/A"
            result.append(ec)
    return result

@router.post("/admin/estratto-conto")
async def admin_upsert_estratto(data: EstrattoContoCreate, user=Depends(get_admin_user)):
    existing = await db.estratti_conto.find_one({"user_id": data.user_id, "condominio_id": data.condominio_id})
    ec_data = {
        "user_id": data.user_id, "condominio_id": data.condominio_id,
        "periodo": data.periodo, "quote_versate": data.quote_versate,
        "quote_da_versare": data.quote_da_versare, "scadenza": data.scadenza,
        "saldo": data.saldo, "note": data.note, "updated_at": now_iso()
    }
    if existing:
        await db.estratti_conto.update_one({"user_id": data.user_id, "condominio_id": data.condominio_id}, {"$set": ec_data})
        await create_notifica(data.user_id, "Estratto conto aggiornato", "Il tuo estratto conto è stato aggiornato dallo studio.", "finance")
    else:
        ec_data["id"] = str(uuid.uuid4())
        ec_data["created_at"] = now_iso()
        await db.estratti_conto.insert_one(ec_data)
        await create_notifica(data.user_id, "Nuovo estratto conto", "Lo studio ha pubblicato il tuo estratto conto.", "finance")
    return {"message": "Estratto conto salvato"}

@router.get("/admin/estratti-conto")
async def admin_estratti(user=Depends(get_admin_user)):
    ecs = await db.estratti_conto.find({}, {"_id": 0}).to_list(1000)
    for ec in ecs:
        u = await db.users.find_one({"id": ec["user_id"]}, {"_id": 0, "password_hash": 0})
        c = await db.condomini.find_one({"id": ec["condominio_id"]}, {"_id": 0})
        ec["user_nome"] = f"{u['nome']} {u['cognome']}" if u else "N/A"
        ec["condominio_nome"] = c["nome"] if c else "N/A"
    return ecs

# ── Config ────────────────────────────────────────────────────────────────────

@router.get("/admin/config")
async def get_config(user=Depends(get_admin_user)):
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    if not config:
        config = {"key": "main", "google_maps_api_key": "", "firebase_key": "", "studio_telefono": "+39 089 123456", "studio_email": "info@tardugnobonifacio.it", "studio_pec": ""}
        await db.app_config.insert_one({**config})
    return {k: v for k, v in config.items() if k not in ("key", "_id")}

@router.put("/admin/config")
async def update_config(data: ConfigUpdate, user=Depends(get_admin_user)):
    upd = data.dict()
    await db.app_config.update_one({"key": "main"}, {"$set": upd}, upsert=True)
    return {"message": "Configurazione aggiornata"}

@router.get("/config/public")
async def get_public_config():
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    if not config:
        return {"google_maps_api_key": "", "studio_telefono": "+39 089 123456", "studio_email": "info@tardugnobonifacio.it", "studio_pec": ""}
    return {"google_maps_api_key": config.get("google_maps_api_key", ""), "studio_telefono": config.get("studio_telefono", ""), "studio_email": config.get("studio_email", ""), "studio_pec": config.get("studio_pec", "")}


# ── Mailjet Config ────────────────────────────────────────────────────────────

@router.get("/admin/mailjet")
async def get_mailjet_config_route(user=Depends(get_admin_user)):
    cfg = await db.app_config.find_one({"key": "mailjet"}, {"_id": 0})
    if not cfg:
        return {"api_key": "", "api_secret": "", "sender_email": "", "sender_name": "Studio Tardugno & Bonifacio", "enabled": False}
    val = cfg.get("value", {})
    return {
        "api_key": val.get("api_key", ""),
        "api_secret": "••••••" if val.get("api_secret") else "",
        "sender_email": val.get("sender_email", ""),
        "sender_name": val.get("sender_name", "Studio Tardugno & Bonifacio"),
        "enabled": val.get("enabled", False),
    }


@router.put("/admin/mailjet")
async def update_mailjet_config(data: dict, user=Depends(get_admin_user)):
    existing = await db.app_config.find_one({"key": "mailjet"})
    current = existing.get("value", {}) if existing else {}

    # Only update fields that are provided and not masked
    if data.get("api_key"):
        current["api_key"] = data["api_key"]
    if data.get("api_secret") and data["api_secret"] != "••••••":
        current["api_secret"] = data["api_secret"]
    if "sender_email" in data:
        current["sender_email"] = data["sender_email"]
    if "sender_name" in data:
        current["sender_name"] = data["sender_name"]
    if "enabled" in data:
        current["enabled"] = data["enabled"]

    await db.app_config.update_one(
        {"key": "mailjet"}, {"$set": {"key": "mailjet", "value": current}}, upsert=True
    )
    return {"message": "Configurazione Mailjet aggiornata"}


@router.post("/admin/mailjet/test")
async def test_mailjet(user=Depends(get_admin_user)):
    """Send a test email to the admin's address to verify Mailjet configuration."""
    from email_service import send_email, _base_html, _heading, _paragraph, _badge
    cfg = await db.app_config.find_one({"key": "mailjet"})
    if not cfg or not cfg.get("value", {}).get("api_key"):
        raise HTTPException(400, "Configura prima le credenziali Mailjet")

    body = _heading("Test Email Riuscito!")
    body += _paragraph("Se stai leggendo questa email, la configurazione Mailjet è corretta e funzionante.")
    body += f'<div style="text-align:center;margin:20px 0;">{_badge("Configurazione OK", "#16A34A")}</div>'
    body += _paragraph("Le notifiche email dell'app condominiale verranno inviate correttamente.")
    html = _base_html("Test Configurazione Email", body)

    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    success = await send_email(user["email"], nome, "Test Email — Studio Tardugno & Bonifacio", html)
    if success:
        return {"message": f"Email di test inviata a {user['email']}"}
    raise HTTPException(500, "Invio fallito. Controlla le credenziali Mailjet e l'indirizzo mittente.")

# ── Export CSV ────────────────────────────────────────────────────────────────

@router.get("/admin/export/segnalazioni")
async def export_segnalazioni(user=Depends(get_admin_user)):
    segs = await db.segnalazioni.find({}, {"_id": 0, "immagini": 0}).sort("created_at", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Protocollo", "Data", "Utente", "Email", "Condominio", "Tipologia", "Descrizione", "Urgenza", "Stato", "Note Admin"])
    for s in segs:
        c = await db.condomini.find_one({"id": s.get("condominio_id")}, {"_id": 0})
        writer.writerow([s.get("protocollo",""), s.get("created_at","")[:10], s.get("user_nome",""), s.get("user_email",""), c["nome"] if c else "", s.get("tipologia",""), s.get("descrizione",""), s.get("urgenza",""), s.get("stato",""), s.get("note_admin","")])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8-sig")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=segnalazioni.csv"})

@router.get("/admin/export/appuntamenti")
async def export_appuntamenti(user=Depends(get_admin_user)):
    apps = await db.appuntamenti.find({}, {"_id": 0}).sort("data_richiesta", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Data Richiesta", "Utente", "Email", "Motivo", "Fascia Oraria", "Stato", "Data Confermata", "Note"])
    for a in apps:
        writer.writerow([a.get("data_richiesta",""), a.get("user_nome",""), a.get("user_email",""), a.get("motivo",""), a.get("fascia_oraria",""), a.get("stato",""), a.get("data_confermata",""), a.get("note","")])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8-sig")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=appuntamenti.csv"})

@router.get("/admin/export/utenti")
async def export_utenti(user=Depends(get_admin_user)):
    utenti = await db.users.find({"ruolo": "condomino"}, {"_id": 0, "password_hash": 0}).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nome", "Cognome", "Email", "Telefono", "Indirizzo", "Codice Fiscale", "Data Registrazione", "Condomini"])
    for u in utenti:
        assocs = await db.user_condomini.find({"user_id": u["id"]}, {"_id": 0}).to_list(100)
        conds = []
        for a in assocs:
            c = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
            if c: conds.append(c["nome"])
        writer.writerow([u.get("nome",""), u.get("cognome",""), u.get("email",""), u.get("telefono",""), u.get("indirizzo",""), u.get("codice_fiscale",""), u.get("created_at","")[:10], "; ".join(conds)])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8-sig")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=utenti.csv"})
