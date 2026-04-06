"""Privacy & GDPR routes: informativa, consensi, privacy rights, admin privacy."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import uuid
import io
import json as json_module
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from database import db, now_iso
from auth import get_current_user, get_admin_user
from models import (
    ConsensoRegistrazioneCreate, InformativaVersioneCreate,
    ConfermaAggiornamentoCreate, RichiestaPrivacyCreate, EvadiRichiestaPrivacy,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Privacy Policy v1.0 full text ─────────────────────────────────────────────

PRIVACY_POLICY_V1_TEXT = """# INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI

ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018

**Versione:** 1.0
**Titolare del trattamento:** Studio Tardugno & Bonifacio

---

## 1. Titolare del trattamento

**Studio Tardugno & Bonifacio**
Rag. Velia Elvira Tardugno — P.IVA 01975320654
Rag. Antonio Bonifacio — P.IVA 04107810659
Via Raffaele Ricci, 37 — 84129 Salerno (SA)
Email: info@tardugnobonifacio.it
Sito web: www.tardugnobonifacio.it

---

## 2. Referente per la protezione dei dati

Email: privacy@tardugnobonifacio.it
Indirizzo: Via Raffaele Ricci, 37 — 84129 Salerno (SA)

---

## 3. Ambito di applicazione

La presente informativa si applica al trattamento dei dati personali effettuato attraverso l'applicazione mobile e web "Studio Tardugno & Bonifacio — App Condomini", destinata ai condomini amministrati dallo Studio, ai fornitori incaricati degli interventi di manutenzione e ai collaboratori dello Studio.

---

## 4. Categorie di dati personali trattati

### 4.1 Dati forniti volontariamente

- Dati anagrafici: nome, cognome, codice fiscale
- Dati di contatto: email, telefono, indirizzo
- Dati immobile: condominio, unità immobiliare, qualità
- Dati di accesso: email e password (hashata, non recuperabile)

### 4.2 Dati generati dall'utilizzo dell'App

- Segnalazioni guasti: descrizioni, tipologia, urgenza
- Immagini, video e PDF allegati
- Registrazioni vocali (previo specifico consenso)
- Dati finanziari condominiali: estratti conto, quote

### 4.3 Dati raccolti automaticamente

- IP, tipo dispositivo, sistema operativo, user agent
- Log di accesso e audit trail

### 4.4 Dati non raccolti

L'App non raccoglie dati di geolocalizzazione. I metadati EXIF nelle fotografie vengono rimossi automaticamente. Non vengono effettuate attività di profilazione automatizzata.

---

## 5. Finalità e basi giuridiche

| Finalità | Base giuridica |
|----------|---------------|
| Gestione account e rapporto condominiale | Esecuzione del contratto (art. 6.1.b GDPR) |
| Adempimenti fiscali e legali | Obbligo legale (art. 6.1.c GDPR) |
| Sicurezza e audit trail | Legittimo interesse (art. 6.1.f GDPR) |
| Comunicazioni informative via email | Consenso (art. 6.1.a GDPR) |
| Registrazione note vocali | Consenso (art. 6.1.a GDPR) |

---

## 6. Modalità del trattamento e sicurezza

- Cifratura in transito (HTTPS/TLS 1.2+)
- Password hashate con bcrypt
- Autenticazione JWT con scadenza temporale
- Segregazione degli accessi per ruolo
- File rinominati con ID casuale, metadati EXIF rimossi
- Audit trail con conservazione 24 mesi
- Blocco account dopo 5 tentativi falliti

---

## 7. Destinatari dei dati

- Personale autorizzato dello Studio (admin e collaboratori)
- Fornitori: ricevono solo indirizzo, tipologia guasto e foto — MAI i dati personali del condomino
- Fornitori tecnologici: in qualità di Responsabili ex art. 28 GDPR
- Autorità giudiziarie o fiscali: solo se richiesto per legge

I dati non vengono mai ceduti a terzi per finalità commerciali o di marketing.

---

## 8. Tempi di conservazione

| Categoria | Periodo |
|-----------|---------|
| Profilo utente | Durata rapporto + 10 anni |
| Segnalazioni e allegati | 5 anni dalla chiusura |
| Sopralluoghi e allegati | 5 anni dalla data |
| Documenti condominiali | 10 anni |
| Log di accesso | 24 mesi |
| Dati di consenso | Durata rapporto + 5 anni |
| Account inattivi | Cancellazione dopo 24 mesi (con preavviso 60 gg) |

---

## 9. Dati facoltativi e conseguenze del rifiuto

- **Consenso comunicazioni informative:** facoltativo. Il rifiuto comporta solo la mancata ricezione di aggiornamenti non operativi.
- **Consenso note vocali:** facoltativo. Il rifiuto disattiva la funzionalità di registrazione audio.

Le comunicazioni operative (convocazioni, segnalazioni) continuano normalmente.

---

## 10. Diritti dell'interessato

Ai sensi degli artt. 15–22 GDPR, l'interessato ha il diritto di:

- **Accesso (art. 15):** "Privacy e Dati personali" → "I miei dati"
- **Rettifica (art. 16):** "Profilo" → "Modifica i miei dati"
- **Cancellazione (art. 17):** "Privacy e Dati personali" → "Esercita i tuoi diritti" → "Richiedi cancellazione account"
- **Limitazione (art. 18):** "Privacy e Dati personali" → "Esercita i tuoi diritti"
- **Portabilità (art. 20):** "Privacy e Dati personali" → "Scarica i miei dati"
- **Opposizione (art. 21):** per trattamenti basati su legittimo interesse
- **Revoca consenso (art. 7.3):** "Privacy e Dati personali" → "I miei consensi"

Riscontro entro 30 giorni (prorogabili di 60 in casi complessi).

**Contatti:** privacy@tardugnobonifacio.it | Via Raffaele Ricci 37, 84129 Salerno (SA)

---

## 11. Reclamo

È possibile presentare reclamo al **Garante per la Protezione dei Dati Personali**:
Piazza Venezia 11, 00187 Roma — www.garanteprivacy.it — garante@gpdp.it

---

## 12. Modifiche all'informativa

Il Titolare si riserva di modificare la presente informativa. In caso di modifiche sostanziali, l'utente sarà invitato ad accettare la nuova versione al primo accesso successivo. Lo storico delle versioni è consultabile nella sezione "Privacy e Dati personali" dell'App.

---

**Studio Tardugno & Bonifacio** — www.tardugnobonifacio.it

*Versione 1.0*"""


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_active_informativa():
    """Returns the currently active privacy policy version document."""
    return await db.informativa_versioni.find_one({"attiva": True}, {"_id": 0})


def genera_protocollo_privacy(tipo: str) -> str:
    """Generate a protocol number for privacy requests."""
    anno = datetime.now(timezone.utc).year
    uid = str(uuid.uuid4())[:6].upper()
    tipo_short = {"cancellazione": "CAN", "limitazione": "LIM", "accesso": "ACC",
                  "portabilita": "PORT", "opposizione": "OPP"}.get(tipo, "PRV")
    return f"PRIV-{tipo_short}-{anno}-{uid}"


# ── Informativa ───────────────────────────────────────────────────────────────

@router.get("/informativa/attiva")
async def get_informativa_attiva():
    """Public: returns the active privacy policy."""
    inf = await get_active_informativa()
    if not inf:
        raise HTTPException(404, "Nessuna informativa attiva trovata")
    return inf


@router.get("/informativa/versioni")
async def list_informativa_versioni(user=Depends(get_current_user)):
    """List all privacy policy versions (authenticated)."""
    versioni = await db.informativa_versioni.find(
        {}, {"_id": 0, "testo_completo": 0}
    ).sort("data_pubblicazione", -1).to_list(100)
    return versioni


@router.post("/admin/informativa")
async def admin_crea_informativa(data: InformativaVersioneCreate, user=Depends(get_admin_user)):
    """Admin creates a new privacy policy version and makes it active."""
    existing = await db.informativa_versioni.find_one({"versione": data.versione})
    if existing:
        raise HTTPException(400, f"Versione {data.versione} già esistente")
    await db.informativa_versioni.update_many({"attiva": True}, {"$set": {"attiva": False}})
    inf = {
        "id": str(uuid.uuid4()),
        "versione": data.versione,
        "testo_completo": data.testo_completo,
        "note_versione": data.note_versione,
        "data_pubblicazione": now_iso(),
        "attiva": True,
        "created_by": user["id"]
    }
    await db.informativa_versioni.insert_one(inf)
    return {k: v for k, v in inf.items() if k != "_id"}


@router.get("/informativa/verifica-aggiornamento")
async def verifica_aggiornamento_informativa(user=Depends(get_current_user)):
    """Check if the user needs to accept a new privacy policy version."""
    active_inf = await get_active_informativa()
    if not active_inf:
        return {"aggiornamento_richiesto": False}
    versione_attiva = active_inf["versione"]
    consenso = await db.consensi.find_one({
        "user_id": user["id"],
        "tipo_consenso": "privacy_policy",
        "versione_informativa": versione_attiva,
        "prestato": True
    })
    if consenso:
        return {"aggiornamento_richiesto": False, "versione_attiva": versione_attiva}
    return {
        "aggiornamento_richiesto": True,
        "versione_attiva": versione_attiva,
        "data_pubblicazione": active_inf.get("data_pubblicazione", ""),
        "note_versione": active_inf.get("note_versione", ""),
        "testo_completo": active_inf.get("testo_completo", "")
    }


# ── Consensi ──────────────────────────────────────────────────────────────────

@router.post("/consensi/conferma-aggiornamento")
async def conferma_aggiornamento_consenso(data: ConfermaAggiornamentoCreate, user=Depends(get_current_user)):
    """User confirms they have read and accepted the new privacy policy version."""
    inf = await db.informativa_versioni.find_one({"versione": data.versione, "attiva": True})
    if not inf:
        raise HTTPException(404, "Versione informativa non trovata o non attiva")
    existing = await db.consensi.find_one({
        "user_id": user["id"], "tipo_consenso": "privacy_policy", "versione_informativa": data.versione
    })
    if existing:
        await db.consensi.update_one(
            {"user_id": user["id"], "tipo_consenso": "privacy_policy", "versione_informativa": data.versione},
            {"$set": {"prestato": True, "prestato_il": now_iso(), "revocato_il": None}}
        )
    else:
        await db.consensi.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"],
            "tipo_consenso": "privacy_policy", "versione_informativa": data.versione,
            "prestato": True, "prestato_il": now_iso(), "revocato_il": None,
            "created_at": now_iso()
        })
    return {"message": "Aggiornamento informativa confermato"}


@router.get("/consensi/miei")
async def get_miei_consensi(user=Depends(get_current_user)):
    """Get the current user's consent status for all consent types."""
    active_inf = await get_active_informativa()
    versione_attiva = active_inf["versione"] if active_inf else "1.0"
    tipi = ["privacy_policy", "marketing", "note_vocali"]
    result = {}
    for tipo in tipi:
        consenso = await db.consensi.find_one(
            {"user_id": user["id"], "tipo_consenso": tipo},
            {"_id": 0}, sort=[("prestato_il", -1)]
        )
        if consenso:
            result[tipo] = {
                "prestato": consenso.get("prestato", False),
                "versione_informativa": consenso.get("versione_informativa", versione_attiva),
                "prestato_il": consenso.get("prestato_il"),
                "revocato_il": consenso.get("revocato_il")
            }
        else:
            result[tipo] = {"prestato": False, "versione_informativa": versione_attiva, "prestato_il": None, "revocato_il": None}
    return result


@router.patch("/consensi/{tipo_consenso}/revoca")
async def revoca_consenso(tipo_consenso: str, user=Depends(get_current_user)):
    """Revoke a specific consent."""
    if tipo_consenso == "privacy_policy":
        raise HTTPException(400, "Non è possibile revocare il consenso alla privacy policy. Per cancellare l'account contatta lo studio.")
    allowed = ["marketing", "note_vocali"]
    if tipo_consenso not in allowed:
        raise HTTPException(400, f"Tipo consenso non valido. Valori ammessi: {', '.join(allowed)}")
    active_inf = await get_active_informativa()
    versione = active_inf["versione"] if active_inf else "1.0"
    existing = await db.consensi.find_one({"user_id": user["id"], "tipo_consenso": tipo_consenso})
    if existing:
        await db.consensi.update_one(
            {"user_id": user["id"], "tipo_consenso": tipo_consenso},
            {"$set": {"prestato": False, "revocato_il": now_iso()}}
        )
    else:
        await db.consensi.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"],
            "tipo_consenso": tipo_consenso, "versione_informativa": versione,
            "prestato": False, "prestato_il": None, "revocato_il": now_iso(),
            "created_at": now_iso()
        })
    return {"message": f"Consenso '{tipo_consenso}' revocato"}


@router.patch("/consensi/{tipo_consenso}/riattiva")
async def riattiva_consenso(tipo_consenso: str, user=Depends(get_current_user)):
    """Reactivate a previously revoked consent."""
    allowed = ["marketing", "note_vocali"]
    if tipo_consenso not in allowed:
        raise HTTPException(400, f"Tipo consenso non valido. Valori ammessi: {', '.join(allowed)}")
    active_inf = await get_active_informativa()
    versione = active_inf["versione"] if active_inf else "1.0"
    existing = await db.consensi.find_one({"user_id": user["id"], "tipo_consenso": tipo_consenso})
    if existing:
        await db.consensi.update_one(
            {"user_id": user["id"], "tipo_consenso": tipo_consenso},
            {"$set": {"prestato": True, "prestato_il": now_iso(), "revocato_il": None, "versione_informativa": versione}}
        )
    else:
        await db.consensi.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"],
            "tipo_consenso": tipo_consenso, "versione_informativa": versione,
            "prestato": True, "prestato_il": now_iso(), "revocato_il": None,
            "created_at": now_iso()
        })
    return {"message": f"Consenso '{tipo_consenso}' riattivato"}


@router.post("/consensi/registrazione")
async def salva_consensi_registrazione(data: ConsensoRegistrazioneCreate, user=Depends(get_current_user)):
    """Save consents given during registration (called immediately after /auth/register)."""
    active_inf = await get_active_informativa()
    versione = active_inf["versione"] if active_inf else data.versione_informativa
    now = now_iso()
    tipi_e_valori = [
        ("privacy_policy", data.consenso_privacy),
        ("marketing", data.consenso_marketing),
        ("note_vocali", data.consenso_note_vocali),
    ]
    for tipo, prestato in tipi_e_valori:
        existing = await db.consensi.find_one({"user_id": user["id"], "tipo_consenso": tipo})
        doc = {
            "user_id": user["id"], "tipo_consenso": tipo, "versione_informativa": versione,
            "prestato": prestato, "prestato_il": now if prestato else None,
            "revocato_il": None, "created_at": now
        }
        if existing:
            await db.consensi.update_one({"user_id": user["id"], "tipo_consenso": tipo}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            await db.consensi.insert_one(doc)
    return {"message": "Consensi salvati"}


# ── Privacy Rights (Art. 15-22 GDPR) ─────────────────────────────────────────

@router.get("/privacy/miei-dati")
async def get_miei_dati_privacy(user=Depends(get_current_user)):
    """Return all personal data for the current user across all collections."""
    uid = user["id"]
    profilo = {
        "nome": user.get("nome", ""), "cognome": user.get("cognome", ""),
        "email": user.get("email", ""), "telefono": user.get("telefono", ""),
        "indirizzo": user.get("indirizzo", ""), "codice_fiscale": user.get("codice_fiscale", ""),
        "ruolo": user.get("ruolo", ""), "data_registrazione": user.get("created_at", ""),
    }
    assoc = await db.user_condomini.find({"user_id": uid}, {"_id": 0}).to_list(50)
    condomini_associati = []
    for a in assoc:
        cond = await db.condomini.find_one({"id": a.get("condominio_id")}, {"_id": 0})
        if cond:
            condomini_associati.append({
                "nome_condominio": cond.get("nome", ""), "indirizzo": cond.get("indirizzo", ""),
                "unita_immobiliare": a.get("unita_immobiliare", ""), "qualita": a.get("qualita", ""),
            })
    consensi_raw = await db.consensi.find({"user_id": uid}, {"_id": 0}).to_list(20)
    consensi = [{"tipo": c.get("tipo_consenso"), "prestato": c.get("prestato"),
                  "data": c.get("prestato_il") or c.get("revocato_il"),
                  "versione_informativa": c.get("versione_informativa")} for c in consensi_raw]
    seg_list = await db.segnalazioni.find({"user_id": uid}, {"_id": 0}).to_list(200)
    segnalazioni = [{"id": s.get("id"), "protocollo": s.get("protocollo", ""),
                     "data": s.get("created_at"), "tipologia": s.get("tipologia", ""),
                     "stato": s.get("stato", ""), "n_allegati": len(s.get("allegati", []) + s.get("immagini", []))}
                    for s in seg_list]
    rich_list = await db.richieste_documenti.find({"user_id": uid}, {"_id": 0}).to_list(100)
    richieste_documenti = [{"id": r.get("id"), "data": r.get("created_at"),
                             "tipo": r.get("tipo_documento", ""), "stato": r.get("stato", "")}
                           for r in rich_list]
    trasm_list = await db.trasmissioni.find({"user_id": uid}, {"_id": 0}).to_list(100)
    trasmissioni = [{"id": t.get("id"), "data": t.get("created_at"), "oggetto": t.get("oggetto", ""),
                     "stato": t.get("stato", ""), "n_file": len(t.get("files", []))} for t in trasm_list]
    app_list = await db.appuntamenti.find({"user_id": uid}, {"_id": 0}).to_list(100)
    appuntamenti = [{"id": a.get("id"), "data": a.get("data_richiesta", ""),
                     "motivo": a.get("motivo", ""), "stato": a.get("stato", "")} for a in app_list]
    return {
        "profilo": profilo, "condomini_associati": condomini_associati, "consensi": consensi,
        "segnalazioni": segnalazioni, "richieste_documenti": richieste_documenti,
        "trasmissioni": trasmissioni, "appuntamenti": appuntamenti,
        "_meta": {"estratto_il": now_iso(), "user_id": uid}
    }


@router.get("/privacy/export")
async def export_miei_dati(user=Depends(get_current_user)):
    """Download all user personal data as a JSON file."""
    uid = user["id"]
    profilo = {
        "nome": user.get("nome", ""), "cognome": user.get("cognome", ""),
        "email": user.get("email", ""), "telefono": user.get("telefono", ""),
        "indirizzo": user.get("indirizzo", ""), "codice_fiscale": user.get("codice_fiscale", ""),
        "ruolo": user.get("ruolo", ""), "data_registrazione": user.get("created_at", ""),
    }
    assoc = await db.user_condomini.find({"user_id": uid}, {"_id": 0}).to_list(50)
    condomini_associati = []
    for a in assoc:
        cond = await db.condomini.find_one({"id": a.get("condominio_id")}, {"_id": 0})
        if cond:
            condomini_associati.append({
                "nome_condominio": cond.get("nome", ""), "indirizzo_condominio": cond.get("indirizzo", ""),
                "unita_immobiliare": a.get("unita_immobiliare", ""), "qualita": a.get("qualita", ""),
            })
    consensi_raw = await db.consensi.find({"user_id": uid}, {"_id": 0}).to_list(20)
    consensi = [{"tipo": c.get("tipo_consenso"), "prestato": c.get("prestato"),
                  "data_prestazione": c.get("prestato_il"), "data_revoca": c.get("revocato_il"),
                  "versione_informativa": c.get("versione_informativa")} for c in consensi_raw]
    seg_list = await db.segnalazioni.find({"user_id": uid}, {"_id": 0}).to_list(500)
    segnalazioni = []
    for s in seg_list:
        allegati_refs = [{"filename": a, "nota": "Allegato disponibile presso lo studio"} for a in s.get("allegati", [])]
        segnalazioni.append({
            "id": s.get("id"), "protocollo": s.get("protocollo", ""), "data": s.get("created_at"),
            "tipologia": s.get("tipologia", ""), "descrizione": s.get("descrizione", ""),
            "urgenza": s.get("urgenza", ""), "stato": s.get("stato", ""), "allegati": allegati_refs,
        })
    rich_list = await db.richieste_documenti.find({"user_id": uid}, {"_id": 0}).to_list(200)
    richieste_documenti = [{"id": r.get("id"), "data": r.get("created_at"), "tipo": r.get("tipo_documento", ""),
                             "note": r.get("note", ""), "stato": r.get("stato", "")} for r in rich_list]
    trasm_list = await db.trasmissioni.find({"user_id": uid}, {"_id": 0}).to_list(200)
    trasmissioni = []
    for t in trasm_list:
        file_refs = [{"filename": f.get("filename", ""), "data_upload": t.get("created_at")} for f in t.get("files", [])]
        trasmissioni.append({"id": t.get("id"), "data": t.get("created_at"), "oggetto": t.get("oggetto", ""),
                              "note": t.get("note", ""), "stato": t.get("stato", ""), "file_allegati": file_refs})
    app_list = await db.appuntamenti.find({"user_id": uid}, {"_id": 0}).to_list(200)
    appuntamenti = [{"id": a.get("id"), "data_richiesta": a.get("data_richiesta", ""),
                     "motivo": a.get("motivo", ""), "fascia_oraria": a.get("fascia_oraria", ""),
                     "note": a.get("note", ""), "stato": a.get("stato", "")} for a in app_list]
    richieste_privacy = await db.richieste_privacy.find({"user_id": uid}, {"_id": 0, "user_id": 0}).to_list(50)
    for r in richieste_privacy:
        r.pop("_id", None)
    export_data = {
        "titolare": "Studio Tardugno & Bonifacio — Via Raffaele Ricci 37, 84129 Salerno",
        "estratto_il": now_iso(),
        "utente": profilo,
        "condomini_associati": condomini_associati,
        "consensi": consensi,
        "segnalazioni": segnalazioni,
        "richieste_documenti": richieste_documenti,
        "trasmissioni": trasmissioni,
        "appuntamenti": appuntamenti,
        "richieste_privacy": richieste_privacy,
        "nota_allegati": "Per ottenere copia degli allegati multimediali (foto, PDF, audio), contattare lo studio a privacy@tardugnobonifacio.it",
    }
    json_bytes = json_module.dumps(export_data, ensure_ascii=False, indent=2, default=str).encode("utf-8")
    filename = f"miei_dati_{uid[:8]}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
    return StreamingResponse(
        io.BytesIO(json_bytes), media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/privacy/richiesta")
async def crea_richiesta_privacy(data: RichiestaPrivacyCreate, bg: BackgroundTasks, user=Depends(get_current_user)):
    """Create a privacy request (access, deletion, limitation, portability, opposition)."""
    tipi_validi = ["accesso", "cancellazione", "limitazione", "portabilita", "opposizione"]
    if data.tipo not in tipi_validi:
        raise HTTPException(400, f"Tipo non valido. Valori ammessi: {', '.join(tipi_validi)}")
    existing = await db.richieste_privacy.find_one({
        "user_id": user["id"], "tipo": data.tipo, "stato": {"$in": ["ricevuta", "in_lavorazione"]}
    })
    if existing:
        raise HTTPException(400, f"Hai già una richiesta di tipo '{data.tipo}' in corso (stato: {existing['stato']}). Attendi che venga evasa prima di inviarne una nuova.")
    now = datetime.now(timezone.utc)
    scadenza = now + timedelta(days=30)
    protocollo = genera_protocollo_privacy(data.tipo)
    richiesta = {
        "id": str(uuid.uuid4()), "protocollo": protocollo,
        "user_id": user["id"], "user_email": user.get("email", ""),
        "user_nome": f"{user.get('nome', '')} {user.get('cognome', '')}".strip(),
        "tipo": data.tipo, "stato": "ricevuta",
        "motivazione_rifiuto": None, "note_admin": None,
        "scadenza": scadenza.isoformat(), "evasa_il": None, "evasa_da": None,
        "created_at": now_iso(),
    }
    await db.richieste_privacy.insert_one(richiesta)
    admin_users = await db.users.find({"ruolo": "admin"}, {"id": 1}).to_list(5)
    for admin in admin_users:
        await db.notifiche.insert_one({
            "id": str(uuid.uuid4()), "user_id": admin["id"],
            "titolo": f"Nuova richiesta privacy ({data.tipo})",
            "testo": f"{richiesta['user_nome']} ha inviato una richiesta di {data.tipo}. Protocollo: {protocollo}. Scadenza: {scadenza.strftime('%d/%m/%Y')}",
            "tipo": "privacy", "letto": False, "created_at": now_iso(),
        })
    # Email: notifica admin nuova richiesta privacy
    from email_service import notify_admin_nuova_richiesta_privacy
    bg.add_task(notify_admin_nuova_richiesta_privacy, richiesta)
    return {k: v for k, v in richiesta.items() if k != "_id"}


@router.get("/privacy/mie-richieste")
async def get_mie_richieste_privacy(user=Depends(get_current_user)):
    """Get all privacy requests for the current user."""
    richieste = await db.richieste_privacy.find(
        {"user_id": user["id"]}, {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(50)
    return richieste


# ── Admin Privacy ─────────────────────────────────────────────────────────────

@router.get("/admin/privacy/richieste")
async def admin_list_richieste_privacy(
    stato: Optional[str] = None,
    tipo: Optional[str] = None,
    scadenza_imminente: Optional[bool] = None,
    user=Depends(get_admin_user)
):
    """Admin: list all privacy requests with optional filters."""
    query: dict = {}
    if stato:
        query["stato"] = stato
    if tipo:
        query["tipo"] = tipo
    if scadenza_imminente:
        threshold = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        query["scadenza"] = {"$lte": threshold}
        query["stato"] = {"$in": ["ricevuta", "in_lavorazione"]}
    richieste = await db.richieste_privacy.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    now = datetime.now(timezone.utc)
    for r in richieste:
        try:
            scad = datetime.fromisoformat(r["scadenza"].replace("Z", "+00:00"))
            delta = (scad - now).days
            r["giorni_rimanenti"] = max(delta, 0)
        except Exception:
            r["giorni_rimanenti"] = None
    return richieste


@router.put("/admin/privacy/richieste/{id}/evadi")
async def evadi_richiesta_privacy(id: str, data: EvadiRichiestaPrivacy, bg: BackgroundTasks, user=Depends(get_admin_user)):
    """Admin: process (approve/reject) a privacy request."""
    richiesta = await db.richieste_privacy.find_one({"id": id})
    if not richiesta:
        raise HTTPException(404, "Richiesta non trovata")
    if richiesta["stato"] not in ["ricevuta", "in_lavorazione"]:
        raise HTTPException(400, f"Richiesta già {richiesta['stato']}, non modificabile")
    if data.azione not in ["evasa", "rifiutata"]:
        raise HTTPException(400, "Azione non valida. Usa 'evasa' o 'rifiutata'")
    update_doc = {
        "stato": data.azione, "note_admin": data.note_admin,
        "motivazione_rifiuto": data.motivazione_rifiuto,
        "evasa_il": now_iso(), "evasa_da": user["id"],
    }
    if data.azione == "evasa" and richiesta["tipo"] == "cancellazione":
        target_uid = richiesta["user_id"]
        target_user = await db.users.find_one({"id": target_uid})
        if target_user and target_user.get("stato") != "cancellato":
            await db.users.update_one({"id": target_uid}, {"$set": {
                "nome": "Utente rimosso", "cognome": "", "telefono": "",
                "indirizzo": "", "codice_fiscale": "",
                "email": f"deleted_{target_uid[:8]}@removed.local",
                "stato": "cancellato", "cancellato_il": now_iso(), "cancellato_da": user["id"],
            }})
            await db.consensi.update_many(
                {"user_id": target_uid},
                {"$set": {"prestato": False, "revocato_il": now_iso()}}
            )
            await db.audit_trail.insert_one({
                "id": str(uuid.uuid4()), "azione": "account_cancellato",
                "user_id_target": target_uid, "eseguito_da": user["id"],
                "protocollo_richiesta": richiesta.get("protocollo"), "created_at": now_iso(),
            })
            logger.info(f"Account {target_uid} anonymized per GDPR request {richiesta['id']}")
    await db.richieste_privacy.update_one({"id": id}, {"$set": update_doc})
    try:
        await db.notifiche.insert_one({
            "id": str(uuid.uuid4()), "user_id": richiesta["user_id"],
            "titolo": f"Richiesta privacy {data.azione}",
            "testo": f"La tua richiesta '{richiesta['tipo']}' (protocollo {richiesta.get('protocollo', '')}) è stata {data.azione}." +
                     (f" Motivazione: {data.motivazione_rifiuto}" if data.motivazione_rifiuto else ""),
            "tipo": "privacy", "letto": False, "created_at": now_iso(),
        })
    except Exception:
        pass
    # Email: notifica condomino privacy evasa/rifiutata
    from email_service import notify_privacy_evasa
    richiesta_updated = {**richiesta, **update_doc}
    bg.add_task(notify_privacy_evasa, richiesta_updated, data.azione)
    return {"message": f"Richiesta {data.azione} con successo", "protocollo": richiesta.get("protocollo")}


@router.get("/admin/privacy/richieste/count-scadenza")
async def count_richieste_scadenza(user=Depends(get_admin_user)):
    """Count privacy requests expiring within 5 days (for badge)."""
    threshold = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    count = await db.richieste_privacy.count_documents({
        "scadenza": {"$lte": threshold},
        "stato": {"$in": ["ricevuta", "in_lavorazione"]}
    })
    total_pending = await db.richieste_privacy.count_documents({"stato": {"$in": ["ricevuta", "in_lavorazione"]}})
    return {"scadenza_imminente": count, "totale_in_attesa": total_pending}
