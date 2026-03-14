from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, bcrypt, jwt, csv, io, shutil
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'studio_tardugno')]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# File uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/mpeg', 'video/avi', 'video/webm',
    'application/pdf',
    # Audio types for voice notes
    'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac',
}

JWT_SECRET = os.environ.get('JWT_SECRET', 'studio-tardugno-fallback-key')
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 72
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================ MODELS ================

class UserCreate(BaseModel):
    email: str
    password: str
    nome: str
    cognome: str
    telefono: str = ""
    indirizzo: str = ""
    codice_fiscale: str = ""
    codice_invito: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    codice_fiscale: Optional[str] = None

class CondominioCreate(BaseModel):
    nome: str
    indirizzo: str
    codice_fiscale: str = ""
    note: str = ""

class SegnalazioneCreate(BaseModel):
    condominio_id: str
    qualita: str
    tipologia: str
    descrizione: str
    urgenza: str = "Media"
    immagini: List[str] = []  # Backward compat - base64 images
    allegati: List[str] = []  # List of file IDs from /api/upload

class RichiestaDocCreate(BaseModel):
    condominio_id: str
    tipo_documento: str
    note: str = ""
    formato: str = "PDF"

class AppuntamentoCreate(BaseModel):
    motivo: str
    data_richiesta: str
    fascia_oraria: str
    note: str = ""

class AvvisoCreate(BaseModel):
    condominio_id: Optional[str] = None
    titolo: str
    testo: str
    categoria: str = "Avviso generico"

class CodiceInvitoCreate(BaseModel):
    condominio_id: str
    unita_immobiliare: str = ""
    qualita: str = "Proprietario"

class AssociaUtenteCreate(BaseModel):
    user_id: str
    condominio_id: str
    unita_immobiliare: str = ""
    qualita: str = "Proprietario"

class AdminSegnalazioneUpdate(BaseModel):
    stato: Optional[str] = None
    note_admin: Optional[str] = None
    tipologia: Optional[str] = None
    descrizione: Optional[str] = None
    urgenza: Optional[str] = None
    allegati: Optional[List[str]] = None  # Replace allegati entirely

class AdminSegnalazioneCreate(BaseModel):
    condominio_id: str
    tipologia: str
    descrizione: str
    urgenza: str = "Media"
    allegati: List[str] = []
    note_admin: str = ""

class AdminRichiestaUpdate(BaseModel):
    stato: Optional[str] = None
    file_url: Optional[str] = None

class AdminAppuntamentoUpdate(BaseModel):
    stato: Optional[str] = None
    data_confermata: Optional[str] = None
    note_admin: Optional[str] = None

class TrasmissioneCreate(BaseModel):
    condominio_id: str = ""
    oggetto: str
    note: str = ""
    files: List[dict] = []  # [{filename, data (base64)}]

class EstrattoContoCreate(BaseModel):
    user_id: str
    condominio_id: str
    periodo: str = ""
    quote_versate: float = 0
    quote_da_versare: float = 0
    scadenza: str = ""
    saldo: float = 0
    note: str = ""

class ConfigUpdate(BaseModel):
    google_maps_api_key: str = ""
    firebase_key: str = ""
    studio_telefono: str = ""
    studio_email: str = ""
    studio_pec: str = ""

# ---- Fornitore Models ----
class FornitoreCreate(BaseModel):
    ragione_sociale: str
    partita_iva: str = ""
    codice_fiscale: str = ""
    settori: List[str] = []  # e.g. ["Idraulica", "Elettricità"]
    telefono: str = ""
    email: str
    password: str = ""
    indirizzo: str = ""
    iban: str = ""
    stato: str = "Attivo"  # Attivo / Sospeso

class AssegnaFornitoreCreate(BaseModel):
    fornitore_id: str
    note_admin: str = ""
    data_prevista: str = ""  # date string

class RapportinoCreate(BaseModel):
    data_intervento: str
    ora_inizio: str = ""
    ora_fine: str = ""
    descrizione_lavori: str
    esito: str  # Risolto completamente / Risolto parzialmente / Necessita ulteriore intervento / Non risolvibile
    materiali: str = ""
    note: str = ""
    foto: List[dict] = []  # [{file_id, didascalia}]

# ---- Collaboratori & Sopralluoghi Models ----
class CollaboratoreCreate(BaseModel):
    nome: str
    cognome: str
    email: str
    password: str
    telefono: str = ""
    qualifica: str = ""  # e.g. "Tecnico", "Geometra", etc.
    stato: str = "Attivo"  # Attivo / Sospeso

class CollaboratoreUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    qualifica: Optional[str] = None
    stato: Optional[str] = None

class SopralluogoCreate(BaseModel):
    condominio_id: str
    data: str  # ISO date
    ora_inizio: str = ""
    collaboratore_id: Optional[str] = None  # If empty, assigned to logged-in user
    motivo: str = "Controllo periodico"  # Controllo periodico, Verifica post-intervento, Sopralluogo su segnalazione, Perizia, Altro
    note_generali: str = ""
    nota_vocale_generale_id: Optional[str] = None  # file ID

class SopralluogoClose(BaseModel):
    ora_fine: str = ""
    note_finali: str = ""
    nota_vocale_finale_id: Optional[str] = None
    valutazione: str = "Discreto"  # Buono, Discreto, Sufficiente, Critico

class ChecklistItemUpdate(BaseModel):
    stato: str  # ok, anomalia, non_controllato

class AnomaliaCreate(BaseModel):
    descrizione: str
    gravita: str = "Moderata"  # Lieve, Moderata, Grave, Urgente
    nota_vocale_ids: List[str] = []  # Multiple voice notes
    foto_ids: List[str] = []  # list of file IDs
    foto_didascalie: List[str] = []  # captions for photos
    apri_segnalazione: bool = False
    # Se apri_segnalazione = True:
    fornitore_id: Optional[str] = None
    tipologia_intervento: Optional[str] = None
    urgenza_segnalazione: Optional[str] = None
    note_fornitore: Optional[str] = None
    data_prevista_intervento: Optional[str] = None

# The 25 standard checklist items for sopralluoghi
CHECKLIST_VOCI = [
    "Ascensore", "Balconi", "Cancello carrabile", "Cancello pedonale", "Cantine",
    "Carrellati", "Chiavi ed aperture", "Citofono / Videocitofono", "Cortile", "Estintori",
    "Facciata e cornicione", "Fognature", "Giardinaggio", "Illuminazione scale", "Impianto antincendio",
    "Marciapiede esterno", "Pluviali", "Pompe", "Portone", "Pulizia",
    "Servizio Raccolta differenziata", "Sottotetti", "Terrazzo", "Varie", "Videosorveglianza"
]

# Mapping checklist item -> suggested segnalazione type
CHECKLIST_TIPOLOGIA_MAP = {
    "Ascensore": "Ascensore",
    "Balconi": "Parti comuni",
    "Cancello carrabile": "Fabbro / Automazione",
    "Cancello pedonale": "Fabbro / Automazione",
    "Cantine": "Parti comuni",
    "Carrellati": "Raccolta differenziata",
    "Chiavi ed aperture": "Fabbro",
    "Citofono / Videocitofono": "Guasto elettrico",
    "Cortile": "Parti comuni",
    "Estintori": "Impianto antincendio",
    "Facciata e cornicione": "Edilizia",
    "Fognature": "Guasto idraulico",
    "Giardinaggio": "Giardinaggio",
    "Illuminazione scale": "Guasto elettrico",
    "Impianto antincendio": "Impianto antincendio",
    "Marciapiede esterno": "Edilizia",
    "Pluviali": "Guasto idraulico",
    "Pompe": "Guasto idraulico",
    "Portone": "Parti comuni",
    "Pulizia": "Pulizia",
    "Servizio Raccolta differenziata": "Raccolta differenziata",
    "Sottotetti": "Infiltrazioni",
    "Terrazzo": "Infiltrazioni",
    "Varie": "Altro",
    "Videosorveglianza": "Sicurezza"
}

# ================ AUTH HELPERS ================

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, ruolo: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "ruolo": ruolo, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token non valido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Utente non trovato")
    return user

async def get_admin_user(user=Depends(get_current_user)):
    if user.get("ruolo") != "admin":
        raise HTTPException(403, "Accesso non autorizzato")
    return user

async def get_fornitore_user(user=Depends(get_current_user)):
    if user.get("ruolo") != "fornitore":
        raise HTTPException(403, "Accesso riservato ai fornitori")
    return user

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def clean_doc(doc):
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ================ AUTH ROUTES ================

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email già registrata")

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id, "email": data.email.lower(), "password_hash": hash_pw(data.password),
        "nome": data.nome, "cognome": data.cognome, "telefono": data.telefono,
        "indirizzo": data.indirizzo, "codice_fiscale": data.codice_fiscale,
        "ruolo": "condomino", "created_at": now_iso()
    }
    await db.users.insert_one(user)

    token = create_token(user_id, "condomino")
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash" and k != "_id"}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(401, "Credenziali non valide")
    token = create_token(user["id"], user["ruolo"])
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}}

@api_router.get("/auth/profile")
async def get_profile(user=Depends(get_current_user)):
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    condomini = []
    for a in assocs:
        cond = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
        if cond:
            condomini.append({**cond, "unita_immobiliare": a.get("unita_immobiliare", ""), "qualita": a.get("qualita", "")})
    profile = {k: v for k, v in user.items() if k != "password_hash"}
    profile["condomini"] = condomini
    return profile

@api_router.put("/auth/profile")
async def update_profile(data: UserUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in data.dict(exclude_none=True).items()}
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ================ CONDOMINI ROUTES ================

@api_router.get("/condomini")
async def list_condomini(user=Depends(get_current_user)):
    if user["ruolo"] == "admin":
        return await db.condomini.find({}, {"_id": 0}).to_list(1000)
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    ids = [a["condominio_id"] for a in assocs]
    return await db.condomini.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)

@api_router.post("/condomini")
async def create_condominio(data: CondominioCreate, user=Depends(get_admin_user)):
    cond = {"id": str(uuid.uuid4()), "nome": data.nome, "indirizzo": data.indirizzo,
            "codice_fiscale": data.codice_fiscale, "note": data.note, "created_at": now_iso()}
    await db.condomini.insert_one(cond)
    return {k: v for k, v in cond.items() if k != "_id"}

@api_router.put("/condomini/{cond_id}")
async def update_condominio(cond_id: str, data: CondominioCreate, user=Depends(get_admin_user)):
    await db.condomini.update_one({"id": cond_id}, {"$set": data.dict()})
    return clean_doc(await db.condomini.find_one({"id": cond_id}, {"_id": 0}))

@api_router.delete("/condomini/{cond_id}")
async def delete_condominio(cond_id: str, user=Depends(get_admin_user)):
    await db.condomini.delete_one({"id": cond_id})
    return {"message": "Condominio eliminato"}

# ================ SEGNALAZIONI ROUTES ================

@api_router.post("/segnalazioni")
async def create_segnalazione(data: SegnalazioneCreate, user=Depends(get_current_user)):
    seg_id = str(uuid.uuid4())
    protocollo = f"SEG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{seg_id[:8].upper()}"
    seg = {
        "id": seg_id, "protocollo": protocollo, "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "user_email": user["email"],
        "user_telefono": user.get("telefono", ""), "condominio_id": data.condominio_id,
        "qualita": data.qualita, "tipologia": data.tipologia, "descrizione": data.descrizione,
        "urgenza": data.urgenza, "stato": "Inviata", "note_admin": "",
        "immagini": data.immagini[:5], "allegati": data.allegati[:10],
        "created_at": now_iso(), "updated_at": now_iso()
    }
    await db.segnalazioni.insert_one(seg)
    await notify_admins("Nuova segnalazione guasti", f"{seg['user_nome']}: {data.tipologia} - Urgenza: {data.urgenza}", "warning")
    return {k: v for k, v in seg.items() if k != "_id"}

@api_router.get("/segnalazioni")
async def list_segnalazioni(user=Depends(get_current_user)):
    return await db.segnalazioni.find({"user_id": user["id"]}, {"_id": 0, "immagini": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/segnalazioni/{seg_id}")
async def get_segnalazione(seg_id: str, user=Depends(get_current_user)):
    seg = await db.segnalazioni.find_one({"id": seg_id}, {"_id": 0})
    if not seg:
        raise HTTPException(404, "Segnalazione non trovata")
    if user["ruolo"] != "admin" and seg["user_id"] != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    # Enrich allegati with file details
    allegati_ids = seg.get("allegati", [])
    if allegati_ids:
        files = await db.uploaded_files.find({"id": {"$in": allegati_ids}}, {"_id": 0}).to_list(50)
        seg["allegati_dettagli"] = files
    return seg

# ================ FILE UPLOAD ================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload a single file (image, video, or PDF). Max 50MB."""
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Tipo file non supportato: {file.content_type}. Formati accettati: immagini (jpg, png, gif, webp), video (mp4, mov), PDF.")
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File troppo grande. Dimensione massima: 50MB")
    
    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "file").suffix.lower() or ".bin"
    safe_filename = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_doc = {
        "id": file_id,
        "filename": file.filename or "file",
        "safe_filename": safe_filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "user_id": user["id"],
        "url": f"/api/files/{file_id}/{file.filename or 'file'}",
        "created_at": now_iso(),
    }
    await db.uploaded_files.insert_one(file_doc)
    
    return {k: v for k, v in file_doc.items() if k != "_id"}

@api_router.get("/files/{file_id}/{filename}")
async def serve_file(file_id: str, filename: str):
    """Serve an uploaded file."""
    file_doc = await db.uploaded_files.find_one({"id": file_id})
    if not file_doc:
        raise HTTPException(404, "File non trovato")
    
    file_path = UPLOAD_DIR / file_doc["safe_filename"]
    if not file_path.exists():
        raise HTTPException(404, "File non trovato su disco")
    
    return FileResponse(
        path=str(file_path),
        media_type=file_doc.get("content_type", "application/octet-stream"),
        filename=file_doc.get("filename", filename),
    )

# ================ RICHIESTE DOCUMENTI ROUTES ================

@api_router.post("/richieste-documenti")
async def create_richiesta(data: RichiestaDocCreate, user=Depends(get_current_user)):
    rich = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "condominio_id": data.condominio_id,
        "tipo_documento": data.tipo_documento, "note": data.note, "formato": data.formato,
        "stato": "In attesa", "file_url": "", "created_at": now_iso()
    }
    await db.richieste_documenti.insert_one(rich)
    return {k: v for k, v in rich.items() if k != "_id"}

@api_router.get("/richieste-documenti")
async def list_richieste(user=Depends(get_current_user)):
    return await db.richieste_documenti.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

# ================ APPUNTAMENTI ROUTES ================

@api_router.post("/appuntamenti")
async def create_appuntamento(data: AppuntamentoCreate, user=Depends(get_current_user)):
    appt = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "user_email": user["email"],
        "user_telefono": user.get("telefono", ""), "motivo": data.motivo,
        "data_richiesta": data.data_richiesta, "fascia_oraria": data.fascia_oraria,
        "data_confermata": "", "stato": "In attesa di conferma",
        "note": data.note, "note_admin": "", "created_at": now_iso()
    }
    await db.appuntamenti.insert_one(appt)
    return {k: v for k, v in appt.items() if k != "_id"}

@api_router.get("/appuntamenti")
async def list_appuntamenti(user=Depends(get_current_user)):
    return await db.appuntamenti.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

# ================ AVVISI/BACHECA ROUTES ================

@api_router.get("/avvisi")
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

@api_router.put("/avvisi/{avviso_id}/letto")
async def mark_letto(avviso_id: str, user=Depends(get_current_user)):
    existing = await db.avvisi_letti.find_one({"user_id": user["id"], "avviso_id": avviso_id})
    if not existing:
        await db.avvisi_letti.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "avviso_id": avviso_id})
    return {"message": "Segnato come letto"}

# ================ ADMIN ROUTES ================

@api_router.get("/admin/dashboard")
async def admin_dashboard(user=Depends(get_admin_user)):
    return {
        "totale_utenti": await db.users.count_documents({"ruolo": "condomino"}),
        "totale_condomini": await db.condomini.count_documents({}),
        "segnalazioni_aperte": await db.segnalazioni.count_documents({"stato": {"$ne": "Risolta"}}),
        "richieste_in_attesa": await db.richieste_documenti.count_documents({"stato": "In attesa"}),
        "appuntamenti_da_confermare": await db.appuntamenti.count_documents({"stato": "In attesa di conferma"}),
        "totale_avvisi": await db.avvisi.count_documents({})
    }

@api_router.get("/admin/segnalazioni")
async def admin_segnalazioni(user=Depends(get_admin_user)):
    segs = await db.segnalazioni.find({}, {"_id": 0, "immagini": 0}).sort("created_at", -1).to_list(1000)
    for s in segs:
        c = await db.condomini.find_one({"id": s.get("condominio_id")}, {"_id": 0})
        s["condominio_nome"] = c["nome"] if c else "N/A"
    return segs

@api_router.put("/admin/segnalazioni/{seg_id}")
async def admin_update_seg(seg_id: str, data: AdminSegnalazioneUpdate, user=Depends(get_admin_user)):
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
    return clean_doc(seg)

@api_router.post("/admin/segnalazioni")
async def admin_create_seg(data: AdminSegnalazioneCreate, user=Depends(get_admin_user)):
    """Admin creates a segnalazione directly (not from a condomino)."""
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

@api_router.get("/admin/richieste-documenti")
async def admin_richieste(user=Depends(get_admin_user)):
    return await db.richieste_documenti.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.put("/admin/richieste-documenti/{rich_id}")
async def admin_update_richiesta(rich_id: str, data: AdminRichiestaUpdate, user=Depends(get_admin_user)):
    upd = {}
    if data.stato:
        upd["stato"] = data.stato
    if data.file_url:
        upd["file_url"] = data.file_url
    if upd:
        await db.richieste_documenti.update_one({"id": rich_id}, {"$set": upd})
    return clean_doc(await db.richieste_documenti.find_one({"id": rich_id}, {"_id": 0}))

@api_router.get("/admin/appuntamenti")
async def admin_appuntamenti(user=Depends(get_admin_user)):
    return await db.appuntamenti.find({}, {"_id": 0}).sort("data_richiesta", -1).to_list(1000)

@api_router.put("/admin/appuntamenti/{app_id}")
async def admin_update_app(app_id: str, data: AdminAppuntamentoUpdate, user=Depends(get_admin_user)):
    upd = {}
    if data.stato:
        upd["stato"] = data.stato
    if data.data_confermata:
        upd["data_confermata"] = data.data_confermata
    if data.note_admin is not None:
        upd["note_admin"] = data.note_admin
    if upd:
        await db.appuntamenti.update_one({"id": app_id}, {"$set": upd})
    appt = await db.appuntamenti.find_one({"id": app_id}, {"_id": 0})
    if appt and data.stato:
        await create_notifica(appt["user_id"], "Appuntamento aggiornato", f"Il tuo appuntamento '{appt['motivo']}' è ora: {data.stato}", "calendar")
    return clean_doc(appt)

@api_router.post("/admin/avvisi")
async def admin_create_avviso(data: AvvisoCreate, user=Depends(get_admin_user)):
    avviso = {"id": str(uuid.uuid4()), "condominio_id": data.condominio_id,
              "titolo": data.titolo, "testo": data.testo, "categoria": data.categoria, "created_at": now_iso()}
    await db.avvisi.insert_one(avviso)
    # Notify condomini users
    if data.condominio_id:
        assocs = await db.user_condomini.find({"condominio_id": data.condominio_id}, {"_id": 0}).to_list(1000)
    else:
        assocs = await db.user_condomini.find({}, {"_id": 0}).to_list(1000)
    notified = set()
    for a in assocs:
        if a["user_id"] not in notified:
            await create_notifica(a["user_id"], f"Nuovo avviso: {data.titolo}", data.testo[:100], "announcement")
            notified.add(a["user_id"])
    return {k: v for k, v in avviso.items() if k != "_id"}

@api_router.get("/admin/avvisi")
async def admin_list_avvisi(user=Depends(get_admin_user)):
    return await db.avvisi.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.delete("/admin/avvisi/{avviso_id}")
async def admin_delete_avviso(avviso_id: str, user=Depends(get_admin_user)):
    await db.avvisi.delete_one({"id": avviso_id})
    return {"message": "Avviso eliminato"}

@api_router.get("/admin/utenti")
async def admin_utenti(user=Depends(get_admin_user)):
    utenti = await db.users.find({"ruolo": "condomino"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in utenti:
        assocs = await db.user_condomini.find({"user_id": u["id"]}, {"_id": 0}).to_list(100)
        u["associazioni"] = []
        for a in assocs:
            c = await db.condomini.find_one({"id": a["condominio_id"]}, {"_id": 0})
            u["associazioni"].append({
                "assoc_id": a["id"],
                "condominio_id": a["condominio_id"],
                "condominio_nome": c["nome"] if c else "N/A",
                "unita_immobiliare": a.get("unita_immobiliare", ""),
                "qualita": a.get("qualita", "")
            })
        u["condomini_nomi"] = [a["condominio_nome"] for a in u["associazioni"]]
        u["abilitato"] = len(u["associazioni"]) > 0
    return utenti

@api_router.post("/admin/associa-utente")
async def admin_associa_utente(data: AssociaUtenteCreate, user=Depends(get_admin_user)):
    u = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utente non trovato")
    c = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Condominio non trovato")
    existing = await db.user_condomini.find_one({"user_id": data.user_id, "condominio_id": data.condominio_id})
    if existing:
        raise HTTPException(400, "Utente già associato a questo condominio")
    assoc = {
        "id": str(uuid.uuid4()), "user_id": data.user_id, "condominio_id": data.condominio_id,
        "unita_immobiliare": data.unita_immobiliare, "qualita": data.qualita
    }
    await db.user_condomini.insert_one(assoc)
    return {"message": "Utente associato con successo", "assoc_id": assoc["id"],
            "condominio_nome": c["nome"], "unita_immobiliare": data.unita_immobiliare, "qualita": data.qualita}

@api_router.delete("/admin/associazione/{assoc_id}")
async def admin_disassocia(assoc_id: str, user=Depends(get_admin_user)):
    result = await db.user_condomini.delete_one({"id": assoc_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Associazione non trovata")
    return {"message": "Associazione rimossa"}

@api_router.post("/admin/codici-invito")
async def admin_create_codice(data: CodiceInvitoCreate, user=Depends(get_admin_user)):
    codice = {"id": str(uuid.uuid4()), "codice": str(uuid.uuid4())[:8].upper(),
              "condominio_id": data.condominio_id, "unita_immobiliare": data.unita_immobiliare,
              "qualita": data.qualita, "usato": False, "user_id": None, "created_at": now_iso()}
    await db.codici_invito.insert_one(codice)
    return {k: v for k, v in codice.items() if k != "_id"}

@api_router.get("/admin/codici-invito")
async def admin_codici(user=Depends(get_admin_user)):
    return await db.codici_invito.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

# ================ NOTIFICATION HELPER ================

async def create_notifica(user_id: str, titolo: str, messaggio: str, tipo: str = "info", link: str = ""):
    notifica = {
        "id": str(uuid.uuid4()), "user_id": user_id, "titolo": titolo,
        "messaggio": messaggio, "tipo": tipo, "link": link,
        "letto": False, "created_at": now_iso()
    }
    await db.notifiche.insert_one(notifica)

async def notify_admins(titolo: str, messaggio: str, tipo: str = "info", link: str = ""):
    admins = await db.users.find({"ruolo": "admin"}, {"_id": 0, "id": 1}).to_list(100)
    for a in admins:
        await create_notifica(a["id"], titolo, messaggio, tipo, link)

# ================ NOTIFICHE ROUTES ================

@api_router.get("/notifiche")
async def list_notifiche(user=Depends(get_current_user)):
    return await db.notifiche.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.get("/notifiche/count")
async def count_notifiche(user=Depends(get_current_user)):
    count = await db.notifiche.count_documents({"user_id": user["id"], "letto": False})
    return {"count": count}

@api_router.put("/notifiche/{notifica_id}/letto")
async def mark_notifica_letta(notifica_id: str, user=Depends(get_current_user)):
    await db.notifiche.update_one({"id": notifica_id, "user_id": user["id"]}, {"$set": {"letto": True}})
    return {"message": "Segnata come letta"}

@api_router.put("/notifiche/letto-tutte")
async def mark_all_lette(user=Depends(get_current_user)):
    await db.notifiche.update_many({"user_id": user["id"], "letto": False}, {"$set": {"letto": True}})
    return {"message": "Tutte le notifiche segnate come lette"}

# ================ TRASMISSIONI ROUTES ================

@api_router.post("/trasmissioni")
async def create_trasmissione(data: TrasmissioneCreate, user=Depends(get_current_user)):
    trasm = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "user_nome": f"{user['nome']} {user['cognome']}", "condominio_id": data.condominio_id,
        "oggetto": data.oggetto, "note": data.note, "stato": "Inviato",
        "files": data.files[:5], "created_at": now_iso()
    }
    await db.trasmissioni.insert_one(trasm)
    await notify_admins("Nuova trasmissione documenti", f"{trasm['user_nome']} ha trasmesso: {data.oggetto}", "document", "/admin")
    return {k: v for k, v in trasm.items() if k != "_id"}

@api_router.get("/trasmissioni")
async def list_trasmissioni(user=Depends(get_current_user)):
    return await db.trasmissioni.find({"user_id": user["id"]}, {"_id": 0, "files": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/admin/trasmissioni")
async def admin_trasmissioni(user=Depends(get_admin_user)):
    return await db.trasmissioni.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.put("/admin/trasmissioni/{trasm_id}")
async def admin_update_trasm(trasm_id: str, stato: str = "Ricevuto", user=Depends(get_admin_user)):
    await db.trasmissioni.update_one({"id": trasm_id}, {"$set": {"stato": stato}})
    trasm = await db.trasmissioni.find_one({"id": trasm_id}, {"_id": 0})
    if trasm:
        await create_notifica(trasm["user_id"], "Trasmissione aggiornata", f"La tua trasmissione '{trasm['oggetto']}' è stata aggiornata a: {stato}", "document")
    return clean_doc(trasm)

# ================ ESTRATTO CONTO ROUTES ================

@api_router.get("/estratto-conto")
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

@api_router.post("/admin/estratto-conto")
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

@api_router.get("/admin/estratti-conto")
async def admin_estratti(user=Depends(get_admin_user)):
    ecs = await db.estratti_conto.find({}, {"_id": 0}).to_list(1000)
    for ec in ecs:
        u = await db.users.find_one({"id": ec["user_id"]}, {"_id": 0, "password_hash": 0})
        c = await db.condomini.find_one({"id": ec["condominio_id"]}, {"_id": 0})
        ec["user_nome"] = f"{u['nome']} {u['cognome']}" if u else "N/A"
        ec["condominio_nome"] = c["nome"] if c else "N/A"
    return ecs

# ================ CONFIG ROUTES ================

@api_router.get("/admin/config")
async def get_config(user=Depends(get_admin_user)):
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    if not config:
        config = {"key": "main", "google_maps_api_key": "", "firebase_key": "", "studio_telefono": "+39 089 123456", "studio_email": "info@tardugnobonifacio.it", "studio_pec": ""}
        await db.app_config.insert_one({**config})
    return {k: v for k, v in config.items() if k not in ("key", "_id")}

@api_router.put("/admin/config")
async def update_config(data: ConfigUpdate, user=Depends(get_admin_user)):
    upd = data.dict()
    await db.app_config.update_one({"key": "main"}, {"$set": upd}, upsert=True)
    return {"message": "Configurazione aggiornata"}

@api_router.get("/config/public")
async def get_public_config():
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    if not config:
        return {"google_maps_api_key": "", "studio_telefono": "+39 089 123456", "studio_email": "info@tardugnobonifacio.it", "studio_pec": ""}
    return {"google_maps_api_key": config.get("google_maps_api_key", ""), "studio_telefono": config.get("studio_telefono", ""), "studio_email": config.get("studio_email", ""), "studio_pec": config.get("studio_pec", "")}

# ================ EXPORT CSV ================

@api_router.get("/admin/export/segnalazioni")
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

@api_router.get("/admin/export/appuntamenti")
async def export_appuntamenti(user=Depends(get_admin_user)):
    apps = await db.appuntamenti.find({}, {"_id": 0}).sort("data_richiesta", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Data Richiesta", "Utente", "Email", "Motivo", "Fascia Oraria", "Stato", "Data Confermata", "Note"])
    for a in apps:
        writer.writerow([a.get("data_richiesta",""), a.get("user_nome",""), a.get("user_email",""), a.get("motivo",""), a.get("fascia_oraria",""), a.get("stato",""), a.get("data_confermata",""), a.get("note","")])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8-sig")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=appuntamenti.csv"})

@api_router.get("/admin/export/utenti")
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

# ================ SEED ================

# ================ HELPER: Timeline segnalazione ================

async def add_timeline_event(segnalazione_id, evento, attore_id, attore_ruolo, dettagli=None):
    await db.segnalazione_timeline.insert_one({
        "id": str(uuid.uuid4()), "segnalazione_id": segnalazione_id,
        "evento": evento, "attore_id": attore_id, "attore_ruolo": attore_ruolo,
        "dettagli": dettagli or {}, "created_at": now_iso()
    })

# ================ FORNITORI ENDPOINTS ================

@api_router.post("/admin/fornitori")
async def create_fornitore(data: FornitoreCreate, user=Depends(get_admin_user)):
    """Admin creates a new fornitore account."""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, "Email già registrata")
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

@api_router.get("/admin/fornitori")
async def list_fornitori(user=Depends(get_admin_user)):
    forns = await db.fornitori.find({}, {"_id": 0}).sort("ragione_sociale", 1).to_list(500)
    for f in forns:
        f["interventi_count"] = await db.rapportini.count_documents({"fornitore_id": f["id"]})
    return forns

@api_router.get("/admin/fornitori/{forn_id}")
async def get_fornitore(forn_id: str, user=Depends(get_admin_user)):
    f = await db.fornitori.find_one({"id": forn_id}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Fornitore non trovato")
    f["interventi_count"] = await db.rapportini.count_documents({"fornitore_id": forn_id})
    return f

@api_router.put("/admin/fornitori/{forn_id}")
async def update_fornitore(forn_id: str, data: FornitoreCreate, user=Depends(get_admin_user)):
    upd = {k: v for k, v in data.dict().items() if k != "password" and v}
    upd["updated_at"] = now_iso()
    await db.fornitori.update_one({"id": forn_id}, {"$set": upd})
    await db.users.update_one({"id": forn_id}, {"$set": {"nome": data.ragione_sociale, "telefono": data.telefono}})
    return clean_doc(await db.fornitori.find_one({"id": forn_id}, {"_id": 0}))

@api_router.delete("/admin/fornitori/{forn_id}")
async def delete_fornitore(forn_id: str, user=Depends(get_admin_user)):
    await db.fornitori.delete_one({"id": forn_id})
    await db.users.delete_one({"id": forn_id})
    return {"message": "Fornitore eliminato"}

# ---- Assegnazione Fornitore a Segnalazione ----

@api_router.post("/admin/segnalazioni/{seg_id}/assegna")
async def assegna_fornitore(seg_id: str, data: AssegnaFornitoreCreate, user=Depends(get_admin_user)):
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if not seg:
        raise HTTPException(404, "Segnalazione non trovata")
    forn = await db.fornitori.find_one({"id": data.fornitore_id}, {"_id": 0})
    if not forn:
        raise HTTPException(404, "Fornitore non trovato")
    
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

# ---- Fornitore: i miei interventi ----

@api_router.get("/fornitore/interventi")
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
            # Include original photos (allegati details)
            allegati_ids = seg.get("allegati", [])
            if allegati_ids:
                files = await db.uploaded_files.find({"id": {"$in": allegati_ids}}, {"_id": 0}).to_list(50)
                seg["allegati_dettagli"] = files
            result.append(seg)
    return result

@api_router.get("/fornitore/interventi/{seg_id}")
async def fornitore_intervento_detail(seg_id: str, user=Depends(get_fornitore_user)):
    assignment = await db.fornitore_segnalazioni.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    if not assignment:
        raise HTTPException(403, "Non hai accesso a questa segnalazione")
    seg = await db.segnalazioni.find_one({"id": seg_id}, {"_id": 0, "user_email": 0, "user_telefono": 0, "user_nome": 0})
    if not seg:
        raise HTTPException(404, "Segnalazione non trovata")
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
    # Filter for fornitore view
    seg["timeline"] = [t for t in timeline if t.get("attore_ruolo") != "admin" or t.get("evento") in ("assegnata_fornitore", "richiesto_nuovo_intervento")]
    return seg

@api_router.get("/fornitore/dashboard")
async def fornitore_dashboard(user=Depends(get_fornitore_user)):
    total = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"]})
    da_eseguire = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"], "stato": "assegnato"})
    in_verifica = await db.fornitore_segnalazioni.count_documents({"fornitore_id": user["id"], "stato": "completato"})
    completati = await db.rapportini.count_documents({"fornitore_id": user["id"]})
    return {"totale": total, "da_eseguire": da_eseguire, "in_verifica": in_verifica, "completati": completati}

# ---- Rapportino ----

@api_router.post("/fornitore/rapportino/{seg_id}")
async def create_rapportino(seg_id: str, data: RapportinoCreate, user=Depends(get_fornitore_user)):
    assignment = await db.fornitore_segnalazioni.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    if not assignment:
        raise HTTPException(403, "Non hai accesso a questa segnalazione")
    
    existing = await db.rapportini.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]})
    rap_id = existing["id"] if existing else str(uuid.uuid4())
    
    rapportino = {
        "id": rap_id, "segnalazione_id": seg_id, "fornitore_id": user["id"],
        "fornitore_nome": user.get("nome", ""),
        "data_intervento": data.data_intervento, "ora_inizio": data.ora_inizio, "ora_fine": data.ora_fine,
        "descrizione_lavori": data.descrizione_lavori, "esito": data.esito,
        "materiali": data.materiali, "note": data.note,
        "foto": data.foto,  # [{file_id, didascalia}]
        "created_at": now_iso() if not existing else existing.get("created_at", now_iso()),
        "updated_at": now_iso()
    }
    
    if existing:
        await db.rapportini.replace_one({"id": rap_id}, rapportino)
    else:
        await db.rapportini.insert_one(rapportino)
    
    # Update states
    await db.fornitore_segnalazioni.update_one(
        {"segnalazione_id": seg_id, "fornitore_id": user["id"]},
        {"$set": {"stato": "completato"}}
    )
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {
        "stato": "Intervento completato", "updated_at": now_iso()
    }})
    
    # Timeline
    await add_timeline_event(seg_id, "rapportino_inviato", user["id"], "fornitore", {
        "esito": data.esito, "descrizione": data.descrizione_lavori[:100],
        "foto_count": len(data.foto)
    })
    
    # Notify admin and condomino
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg:
        admins = await db.users.find({"ruolo": "admin"}, {"id": 1}).to_list(50)
        for a in admins:
            await create_notifica(a["id"], "Rapportino ricevuto",
                f"Il fornitore {user.get('nome', '')} ha completato l'intervento su: {seg.get('tipologia', '')}", "info")
        await create_notifica(seg["user_id"], "Intervento completato",
            f"L'intervento sulla tua segnalazione '{seg.get('tipologia', '')}' è stato completato", "info")
    
    return {k: v for k, v in rapportino.items() if k != "_id"}

@api_router.get("/fornitore/rapportino/{seg_id}")
async def get_rapportino(seg_id: str, user=Depends(get_fornitore_user)):
    rap = await db.rapportini.find_one({"segnalazione_id": seg_id, "fornitore_id": user["id"]}, {"_id": 0})
    if not rap:
        raise HTTPException(404, "Rapportino non trovato")
    # Enrich foto with file details
    for f in rap.get("foto", []):
        file_doc = await db.uploaded_files.find_one({"id": f.get("file_id")}, {"_id": 0})
        if file_doc:
            f["file_url"] = file_doc.get("url", "")
            f["filename"] = file_doc.get("filename", "")
    return rap

# ---- Admin: Rapportino view + close/reopen ----

@api_router.get("/admin/segnalazioni/{seg_id}/rapportino")
async def admin_get_rapportino(seg_id: str, user=Depends(get_admin_user)):
    rap = await db.rapportini.find_one({"segnalazione_id": seg_id}, {"_id": 0})
    if not rap:
        raise HTTPException(404, "Nessun rapportino per questa segnalazione")
    for f in rap.get("foto", []):
        file_doc = await db.uploaded_files.find_one({"id": f.get("file_id")}, {"_id": 0})
        if file_doc:
            f["file_url"] = file_doc.get("url", "")
            f["filename"] = file_doc.get("filename", "")
    return rap

@api_router.post("/admin/segnalazioni/{seg_id}/chiudi")
async def admin_chiudi_segnalazione(seg_id: str, user=Depends(get_admin_user)):
    """Admin approves and closes the segnalazione."""
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {"stato": "Risolta", "updated_at": now_iso()}})
    await db.fornitore_segnalazioni.update_one({"segnalazione_id": seg_id}, {"$set": {"stato": "chiuso"}})
    await add_timeline_event(seg_id, "chiusa", user["id"], "admin", {"note": "Segnalazione chiusa dall'amministratore"})
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg:
        await create_notifica(seg["user_id"], "Segnalazione chiusa",
            f"La segnalazione '{seg.get('tipologia', '')}' è stata chiusa", "info")
        if seg.get("fornitore_id"):
            await create_notifica(seg["fornitore_id"], "Segnalazione chiusa",
                f"La segnalazione '{seg.get('tipologia', '')}' è stata chiusa dall'amministratore", "info")
    return {"message": "Segnalazione chiusa"}

@api_router.post("/admin/segnalazioni/{seg_id}/riapri")
async def admin_riapri_segnalazione(seg_id: str, user=Depends(get_admin_user)):
    """Admin requests a new intervention."""
    await db.segnalazioni.update_one({"id": seg_id}, {"$set": {"stato": "Richiesto nuovo intervento", "updated_at": now_iso()}})
    await db.fornitore_segnalazioni.update_one({"segnalazione_id": seg_id}, {"$set": {"stato": "assegnato"}})
    await add_timeline_event(seg_id, "richiesto_nuovo_intervento", user["id"], "admin", {})
    seg = await db.segnalazioni.find_one({"id": seg_id})
    if seg and seg.get("fornitore_id"):
        await create_notifica(seg["fornitore_id"], "Richiesto nuovo intervento",
            f"L'amministratore richiede un ulteriore intervento su: {seg.get('tipologia', '')}", "warning")
    return {"message": "Richiesto nuovo intervento"}

# ---- Timeline ----

@api_router.get("/admin/segnalazioni/{seg_id}/timeline")
async def admin_get_timeline(seg_id: str, user=Depends(get_admin_user)):
    timeline = await db.segnalazione_timeline.find({"segnalazione_id": seg_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return timeline

# ---- Fornitore stats for admin ----

@api_router.get("/admin/fornitori/{forn_id}/interventi")
async def admin_fornitore_interventi(forn_id: str, user=Depends(get_admin_user)):
    raps = await db.rapportini.find({"fornitore_id": forn_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for r in raps:
        seg = await db.segnalazioni.find_one({"id": r["segnalazione_id"]}, {"_id": 0, "tipologia": 1, "condominio_id": 1})
        if seg:
            cond = await db.condomini.find_one({"id": seg.get("condominio_id")}, {"_id": 0, "nome": 1})
            r["tipologia"] = seg.get("tipologia", "")
            r["condominio_nome"] = cond["nome"] if cond else "N/A"
    return raps

# ================ COLLABORATORI & SOPRALLUOGHI ================

# ---- Collaboratori: Auth helper ----

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

# ---- Collaboratori CRUD (Admin only) ----

@api_router.post("/admin/collaboratori")
async def create_collaboratore(data: CollaboratoreCreate, user=Depends(get_admin_user)):
    existing = await db.collaboratori.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, "Email già registrata")
    
    collab_id = str(uuid.uuid4())
    collaboratore = {
        "id": collab_id,
        "nome": data.nome,
        "cognome": data.cognome,
        "email": data.email,
        "password_hash": hash_pw(data.password),
        "telefono": data.telefono,
        "qualifica": data.qualifica,
        "stato": data.stato,
        "created_by": user["id"],
        "created_at": now_iso()
    }
    await db.collaboratori.insert_one(collaboratore)
    return {k: v for k, v in collaboratore.items() if k not in ("_id", "password_hash")}

@api_router.get("/admin/collaboratori")
async def list_collaboratori(user=Depends(get_admin_user)):
    collabs = await db.collaboratori.find({}, {"_id": 0, "password_hash": 0}).sort("nome", 1).to_list(200)
    # Add sopralluoghi count for each
    for c in collabs:
        c["sopralluoghi_count"] = await db.sopralluoghi.count_documents({"collaboratore_id": c["id"]})
    return collabs

@api_router.put("/admin/collaboratori/{collab_id}")
async def update_collaboratore(collab_id: str, data: CollaboratoreUpdate, user=Depends(get_admin_user)):
    upd = {k: v for k, v in data.dict().items() if v is not None}
    upd["updated_at"] = now_iso()
    await db.collaboratori.update_one({"id": collab_id}, {"$set": upd})
    return clean_doc(await db.collaboratori.find_one({"id": collab_id}, {"_id": 0, "password_hash": 0}))

@api_router.delete("/admin/collaboratori/{collab_id}")
async def delete_collaboratore(collab_id: str, user=Depends(get_admin_user)):
    await db.collaboratori.delete_one({"id": collab_id})
    return {"message": "Collaboratore eliminato"}

# ---- Collaboratore Login ----

@api_router.post("/collaboratore/login")
async def collaboratore_login(data: UserLogin):
    collab = await db.collaboratori.find_one({"email": data.email})
    if not collab or not verify_pw(data.password, collab["password_hash"]):
        raise HTTPException(401, "Credenziali errate")
    if collab.get("stato") != "Attivo":
        raise HTTPException(403, "Account sospeso")
    token = create_token(collab["id"], "collaboratore")
    return {"token": token, "user": {k: v for k, v in collab.items() if k not in ("_id", "password_hash")}}

@api_router.get("/collaboratore/profilo")
async def collaboratore_profilo(user=Depends(get_collaboratore_user)):
    return user

# ---- Sopralluoghi CRUD ----

@api_router.post("/sopralluoghi")
async def create_sopralluogo(data: SopralluogoCreate, user=Depends(get_admin_or_collaboratore)):
    """Create a new sopralluogo and initialize checklist."""
    collab_id = data.collaboratore_id or user["id"]
    
    # Verify collaboratore exists if specified
    if data.collaboratore_id:
        collab = await db.collaboratori.find_one({"id": data.collaboratore_id})
        if not collab:
            raise HTTPException(404, "Collaboratore non trovato")
    
    cond = await db.condomini.find_one({"id": data.condominio_id}, {"_id": 0})
    if not cond:
        raise HTTPException(404, "Condominio non trovato")
    
    sopralluogo_id = str(uuid.uuid4())
    
    # Get collaboratore name
    if user["_tipo"] == "collaboratore":
        eseguito_da = f"{user.get('nome', '')} {user.get('cognome', '')}"
    else:
        collab = await db.collaboratori.find_one({"id": collab_id})
        eseguito_da = f"{collab['nome']} {collab['cognome']}" if collab else f"{user.get('nome', '')} {user.get('cognome', '')}"
    
    sopralluogo = {
        "id": sopralluogo_id,
        "condominio_id": data.condominio_id,
        "condominio_nome": cond["nome"],
        "condominio_indirizzo": cond["indirizzo"],
        "collaboratore_id": collab_id,
        "eseguito_da": eseguito_da,
        "data": data.data,
        "ora_inizio": data.ora_inizio or datetime.now().strftime("%H:%M"),
        "ora_fine": None,
        "motivo": data.motivo,
        "note_generali": data.note_generali,
        "nota_vocale_generale_id": data.nota_vocale_generale_id,
        "note_finali": None,
        "nota_vocale_finale_id": None,
        "valutazione": None,
        "stato": "in_corso",
        "created_at": now_iso()
    }
    await db.sopralluoghi.insert_one(sopralluogo)
    
    # Initialize checklist items
    checklist_items = []
    for i, voce in enumerate(CHECKLIST_VOCI):
        checklist_items.append({
            "id": str(uuid.uuid4()),
            "sopralluogo_id": sopralluogo_id,
            "voce": voce,
            "ordine": i,
            "stato": "non_controllato"  # ok, anomalia, non_controllato
        })
    await db.sopralluoghi_checklist.insert_many(checklist_items)
    
    # Notify if assigned to someone else
    if data.collaboratore_id and data.collaboratore_id != user["id"]:
        await create_notifica(data.collaboratore_id, "Nuovo sopralluogo assegnato",
            f"Ti è stato assegnato un sopralluogo per {cond['nome']} in data {data.data}", "info")
    
    return {k: v for k, v in sopralluogo.items() if k != "_id"}

@api_router.get("/sopralluoghi")
async def list_sopralluoghi(user=Depends(get_admin_or_collaboratore)):
    """List sopralluoghi - admin sees all, collaboratore sees only their own."""
    query = {}
    if user["_tipo"] == "collaboratore":
        query = {"collaboratore_id": user["id"]}
    
    sopralluoghi = await db.sopralluoghi.find(query, {"_id": 0}).sort("data", -1).to_list(500)
    
    # Add checklist summary for each
    for s in sopralluoghi:
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": s["id"]}, {"_id": 0}).to_list(50)
        s["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
        s["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
        s["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
        s["segnalazioni_create"] = await db.sopralluoghi_anomalie.count_documents({
            "sopralluogo_id": s["id"], "segnalazione_id": {"$ne": None}
        })
    
    return sopralluoghi

@api_router.get("/sopralluoghi/{sop_id}")
async def get_sopralluogo(sop_id: str, user=Depends(get_admin_or_collaboratore)):
    """Get sopralluogo detail with full checklist."""
    sop = await db.sopralluoghi.find_one({"id": sop_id}, {"_id": 0})
    if not sop:
        raise HTTPException(404, "Sopralluogo non trovato")
    
    # Check access for collaboratore
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]:
        raise HTTPException(403, "Non hai accesso a questo sopralluogo")
    
    # Get checklist with anomalie
    checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": sop_id}, {"_id": 0}).sort("ordine", 1).to_list(50)
    
    for item in checklist:
        if item["stato"] == "anomalia":
            anomalia = await db.sopralluoghi_anomalie.find_one({"checklist_item_id": item["id"]}, {"_id": 0})
            if anomalia:
                # Get photo details
                if anomalia.get("foto_ids"):
                    files = await db.uploaded_files.find({"id": {"$in": anomalia["foto_ids"]}}, {"_id": 0}).to_list(20)
                    anomalia["foto_dettagli"] = files
                # Get voice notes details (multiple)
                if anomalia.get("nota_vocale_ids"):
                    vns = await db.uploaded_files.find({"id": {"$in": anomalia["nota_vocale_ids"]}}, {"_id": 0}).to_list(20)
                    anomalia["nota_vocale_dettagli"] = vns
                # Legacy support for single voice note
                elif anomalia.get("nota_vocale_id"):
                    vn = await db.uploaded_files.find_one({"id": anomalia["nota_vocale_id"]}, {"_id": 0})
                    anomalia["nota_vocale_dettagli"] = [vn] if vn else []
                item["anomalia"] = anomalia
    
    sop["checklist"] = checklist
    
    # Add summary stats
    sop["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
    sop["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
    sop["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
    
    # Get voice notes details
    if sop.get("nota_vocale_generale_id"):
        vn = await db.uploaded_files.find_one({"id": sop["nota_vocale_generale_id"]}, {"_id": 0})
        sop["nota_vocale_generale_dettagli"] = vn
    if sop.get("nota_vocale_finale_id"):
        vn = await db.uploaded_files.find_one({"id": sop["nota_vocale_finale_id"]}, {"_id": 0})
        sop["nota_vocale_finale_dettagli"] = vn
    
    return sop

# ---- Checklist Item Update ----

@api_router.put("/sopralluoghi/{sop_id}/checklist/{item_id}")
async def update_checklist_item(sop_id: str, item_id: str, data: ChecklistItemUpdate, user=Depends(get_admin_or_collaboratore)):
    """Update a single checklist item state (ok, anomalia, non_controllato)."""
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop:
        raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso":
        raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]:
        raise HTTPException(403, "Non hai accesso a questo sopralluogo")
    
    item = await db.sopralluoghi_checklist.find_one({"id": item_id, "sopralluogo_id": sop_id})
    if not item:
        raise HTTPException(404, "Voce checklist non trovata")
    
    # If changing from anomalia to something else, remove anomalia record
    if item["stato"] == "anomalia" and data.stato != "anomalia":
        await db.sopralluoghi_anomalie.delete_one({"checklist_item_id": item_id})
    
    await db.sopralluoghi_checklist.update_one({"id": item_id}, {"$set": {"stato": data.stato}})
    return {"message": "Stato aggiornato", "stato": data.stato}

# ---- Anomalia CRUD ----

@api_router.post("/sopralluoghi/{sop_id}/checklist/{item_id}/anomalia")
async def create_anomalia(sop_id: str, item_id: str, data: AnomaliaCreate, user=Depends(get_admin_or_collaboratore)):
    """Create or update anomalia for a checklist item."""
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop:
        raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso":
        raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]:
        raise HTTPException(403, "Non hai accesso a questo sopralluogo")
    
    item = await db.sopralluoghi_checklist.find_one({"id": item_id, "sopralluogo_id": sop_id})
    if not item:
        raise HTTPException(404, "Voce checklist non trovata")
    
    # Mark item as anomalia
    await db.sopralluoghi_checklist.update_one({"id": item_id}, {"$set": {"stato": "anomalia"}})
    
    # Check for existing anomalia
    existing = await db.sopralluoghi_anomalie.find_one({"checklist_item_id": item_id})
    anomalia_id = existing["id"] if existing else str(uuid.uuid4())
    
    anomalia = {
        "id": anomalia_id,
        "sopralluogo_id": sop_id,
        "checklist_item_id": item_id,
        "voce": item["voce"],
        "descrizione": data.descrizione,
        "gravita": data.gravita,
        "nota_vocale_ids": data.nota_vocale_ids,  # Multiple voice notes
        "foto_ids": data.foto_ids,
        "foto_didascalie": data.foto_didascalie,
        "segnalazione_id": existing.get("segnalazione_id") if existing else None,
        "created_at": existing.get("created_at", now_iso()) if existing else now_iso(),
        "updated_at": now_iso()
    }
    
    # Handle segnalazione creation
    if data.apri_segnalazione and not anomalia.get("segnalazione_id"):
        if not data.fornitore_id:
            raise HTTPException(400, "Fornitore obbligatorio per aprire una segnalazione")
        
        forn = await db.fornitori.find_one({"id": data.fornitore_id}, {"_id": 0})
        if not forn:
            raise HTTPException(404, "Fornitore non trovato")
        
        # Create segnalazione
        seg_id = str(uuid.uuid4())
        protocollo = f"SEG-{datetime.now().year}-{str(uuid.uuid4())[:6].upper()}"
        tipologia = data.tipologia_intervento or CHECKLIST_TIPOLOGIA_MAP.get(item["voce"], "Altro")
        urgenza = data.urgenza_segnalazione or ("Alta" if data.gravita in ("Grave", "Urgente") else "Media")
        
        segnalazione = {
            "id": seg_id,
            "protocollo": protocollo,
            "user_id": user["id"],  # Admin/Collaboratore who created it
            "condominio_id": sop["condominio_id"],
            "condominio_nome": sop["condominio_nome"],
            "tipologia": tipologia,
            "descrizione": f"[Da sopralluogo del {sop['data']}] {data.descrizione}",
            "urgenza": urgenza,
            "stato": "Assegnata al fornitore",
            "allegati": data.foto_ids,
            "note_admin": data.note_fornitore or "",
            "fornitore_id": data.fornitore_id,
            "fornitore_nome": forn["ragione_sociale"],
            "data_prevista_intervento": data.data_prevista_intervento or "",
            "sopralluogo_id": sop_id,
            "created_at": now_iso()
        }
        await db.segnalazioni.insert_one(segnalazione)
        
        # Create fornitore assignment
        assegnazione = {
            "id": str(uuid.uuid4()),
            "segnalazione_id": seg_id,
            "fornitore_id": data.fornitore_id,
            "fornitore_nome": forn["ragione_sociale"],
            "note_admin": data.note_fornitore or "",
            "data_prevista": data.data_prevista_intervento or "",
            "stato": "assegnato",
            "assigned_at": now_iso()
        }
        await db.fornitore_segnalazioni.insert_one(assegnazione)
        
        # Timeline
        await add_timeline_event(seg_id, "creata_da_sopralluogo", user["id"], user["_tipo"], {
            "sopralluogo_id": sop_id, "voce_checklist": item["voce"],
            "rilevata_da": sop["eseguito_da"]
        })
        await add_timeline_event(seg_id, "assegnata_fornitore", user["id"], user["_tipo"], {
            "fornitore": forn["ragione_sociale"]
        })
        
        # Notify fornitore
        await create_notifica(data.fornitore_id, "Nuovo incarico da sopralluogo",
            f"Nuovo incarico: {tipologia} – {sop['condominio_nome']}. Rilevato durante sopralluogo.", "warning")
        
        anomalia["segnalazione_id"] = seg_id
        anomalia["segnalazione_protocollo"] = protocollo
    
    if existing:
        await db.sopralluoghi_anomalie.replace_one({"id": anomalia_id}, anomalia)
    else:
        await db.sopralluoghi_anomalie.insert_one(anomalia)
    
    return {k: v for k, v in anomalia.items() if k != "_id"}

# ---- Close Sopralluogo ----

@api_router.post("/sopralluoghi/{sop_id}/chiudi")
async def close_sopralluogo(sop_id: str, data: SopralluogoClose, user=Depends(get_admin_or_collaboratore)):
    """Complete and close a sopralluogo."""
    sop = await db.sopralluoghi.find_one({"id": sop_id})
    if not sop:
        raise HTTPException(404, "Sopralluogo non trovato")
    if sop["stato"] != "in_corso":
        raise HTTPException(400, "Il sopralluogo è già completato")
    if user["_tipo"] == "collaboratore" and sop["collaboratore_id"] != user["id"]:
        raise HTTPException(403, "Non hai accesso a questo sopralluogo")
    
    await db.sopralluoghi.update_one({"id": sop_id}, {"$set": {
        "ora_fine": data.ora_fine or datetime.now().strftime("%H:%M"),
        "note_finali": data.note_finali,
        "nota_vocale_finale_id": data.nota_vocale_finale_id,
        "valutazione": data.valutazione,
        "stato": "completato",
        "completed_at": now_iso()
    }})
    
    # Notify admin if completed by collaboratore
    if user["_tipo"] == "collaboratore":
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": sop_id}, {"_id": 0}).to_list(50)
        anomalie_count = len([c for c in checklist if c["stato"] == "anomalia"])
        admins = await db.users.find({"ruolo": "admin"}, {"id": 1}).to_list(50)
        for a in admins:
            await create_notifica(a["id"], "Sopralluogo completato",
                f"Sopralluogo {sop['condominio_nome']} completato da {sop['eseguito_da']} — {anomalie_count} anomalie rilevate", "info")
    
    return {"message": "Sopralluogo completato"}

# ---- Reopen Sopralluogo (Admin only) ----

@api_router.post("/sopralluoghi/{sop_id}/riapri")
async def reopen_sopralluogo(sop_id: str, user=Depends(get_admin_user)):
    """Admin can reopen a completed sopralluogo for editing."""
    await db.sopralluoghi.update_one({"id": sop_id}, {"$set": {
        "stato": "in_corso", "completed_at": None
    }})
    return {"message": "Sopralluogo riaperto"}

# ---- Delete Sopralluogo (Admin only) ----

@api_router.delete("/sopralluoghi/{sop_id}")
async def delete_sopralluogo(sop_id: str, user=Depends(get_admin_user)):
    """Delete a sopralluogo and its related data."""
    await db.sopralluoghi.delete_one({"id": sop_id})
    await db.sopralluoghi_checklist.delete_many({"sopralluogo_id": sop_id})
    await db.sopralluoghi_anomalie.delete_many({"sopralluogo_id": sop_id})
    return {"message": "Sopralluogo eliminato"}

# ---- Sopralluoghi per Condominio ----

@api_router.get("/condomini/{cond_id}/sopralluoghi")
async def condominio_sopralluoghi(cond_id: str, user=Depends(get_admin_or_collaboratore)):
    """Get all sopralluoghi for a specific condominio."""
    sopralluoghi = await db.sopralluoghi.find({"condominio_id": cond_id}, {"_id": 0}).sort("data", -1).to_list(100)
    for s in sopralluoghi:
        checklist = await db.sopralluoghi_checklist.find({"sopralluogo_id": s["id"]}, {"_id": 0}).to_list(50)
        s["checklist_ok"] = len([c for c in checklist if c["stato"] == "ok"])
        s["checklist_anomalie"] = len([c for c in checklist if c["stato"] == "anomalia"])
        s["checklist_non_controllato"] = len([c for c in checklist if c["stato"] == "non_controllato"])
    return sopralluoghi

@api_router.post("/seed")
async def seed_data():
    admin = await db.users.find_one({"email": "admin@tardugno.it"})
    if admin:
        return {"message": "Dati già inseriti", "admin_email": "admin@tardugno.it", "admin_password": "admin123"}

    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id, "email": "admin@tardugno.it", "password_hash": hash_pw("admin123"),
        "nome": "Velia Elvira", "cognome": "Tardugno", "telefono": "+39 089 123456",
        "indirizzo": "Via Raffaele Ricci, 37 – 84129 Salerno", "codice_fiscale": "TRDVLL60A41H703X",
        "ruolo": "admin", "created_at": now_iso()
    })

    cond1_id, cond2_id = str(uuid.uuid4()), str(uuid.uuid4())
    await db.condomini.insert_many([
        {"id": cond1_id, "nome": "Condominio Palazzo Azzurro", "indirizzo": "Via Roma, 42 – 84121 Salerno",
         "codice_fiscale": "90001234567", "note": "24 unità abitative", "created_at": now_iso()},
        {"id": cond2_id, "nome": "Condominio Residenza Marina", "indirizzo": "Lungomare Trieste, 15 – 84121 Salerno",
         "codice_fiscale": "90009876543", "note": "16 unità, fronte mare", "created_at": now_iso()}
    ])

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id, "email": "mario.rossi@email.it", "password_hash": hash_pw("password123"),
        "nome": "Mario", "cognome": "Rossi", "telefono": "+39 333 1234567",
        "indirizzo": "Via Roma, 42 – Int. 5 – 84121 Salerno", "codice_fiscale": "RSSMRA80A01H703X",
        "ruolo": "condomino", "created_at": now_iso()
    })

    await db.user_condomini.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "condominio_id": cond1_id,
        "unita_immobiliare": "Interno 5, Piano 2", "qualita": "Proprietario"
    })

    await db.codici_invito.insert_one({
        "id": str(uuid.uuid4()), "codice": "WELCOME1", "condominio_id": cond1_id,
        "unita_immobiliare": "Interno 10, Piano 4", "qualita": "Proprietario",
        "usato": False, "user_id": None, "created_at": now_iso()
    })

    await db.avvisi.insert_many([
        {"id": str(uuid.uuid4()), "condominio_id": cond1_id, "titolo": "Convocazione Assemblea Ordinaria",
         "testo": "Si convoca l'assemblea ordinaria per il 15 Marzo 2026 alle 17:00 presso la sala condominiale. ODG: approvazione bilancio consuntivo 2025 e preventivo 2026.",
         "categoria": "Convocazione assemblea", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "condominio_id": cond1_id, "titolo": "Lavori Manutenzione Ascensore",
         "testo": "Dal 10 al 12 Marzo 2026 lavori di manutenzione all'ascensore. L'ascensore non sarà disponibile.",
         "categoria": "Lavori in corso", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "condominio_id": None, "titolo": "Chiusura Studio Festività",
         "testo": "Lo studio resterà chiuso dal 24 Dicembre al 6 Gennaio per le festività natalizie.",
         "categoria": "Avviso generico", "created_at": now_iso()}
    ])

    return {
        "message": "Dati seed inseriti con successo",
        "admin": {"email": "admin@tardugno.it", "password": "admin123"},
        "condomino": {"email": "mario.rossi@email.it", "password": "password123"},
        "codice_invito": "WELCOME1"
    }

@api_router.get("/")
async def root():
    return {"message": "Studio Tardugno & Bonifacio API", "version": "1.0.0"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
