"""Database connection, constants, and helper functions."""
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from datetime import datetime, timezone
import os, uuid, logging

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'studio_tardugno')]

logger = logging.getLogger(__name__)

# ── File uploads ──────────────────────────────────────────────────────────────
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/mpeg', 'video/avi', 'video/webm',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac',
}

# ── Checklist constants ───────────────────────────────────────────────────────
CHECKLIST_VOCI = [
    "Ascensore", "Balconi", "Cancello carrabile", "Cancello pedonale", "Cantine",
    "Carrellati", "Chiavi ed aperture", "Citofono / Videocitofono", "Cortile", "Estintori",
    "Facciata e cornicione", "Fognature", "Giardinaggio", "Illuminazione scale", "Impianto antincendio",
    "Marciapiede esterno", "Pluviali", "Pompe", "Portone", "Pulizia",
    "Servizio Raccolta differenziata", "Sottotetti", "Terrazzo", "Varie", "Videosorveglianza"
]

CHECKLIST_TIPOLOGIA_MAP = {
    "Ascensore": "Ascensore", "Balconi": "Parti comuni",
    "Cancello carrabile": "Fabbro / Automazione", "Cancello pedonale": "Fabbro / Automazione",
    "Cantine": "Parti comuni", "Carrellati": "Raccolta differenziata",
    "Chiavi ed aperture": "Fabbro", "Citofono / Videocitofono": "Guasto elettrico",
    "Cortile": "Parti comuni", "Estintori": "Impianto antincendio",
    "Facciata e cornicione": "Edilizia", "Fognature": "Guasto idraulico",
    "Giardinaggio": "Giardinaggio", "Illuminazione scale": "Guasto elettrico",
    "Impianto antincendio": "Impianto antincendio", "Marciapiede esterno": "Edilizia",
    "Pluviali": "Guasto idraulico", "Pompe": "Guasto idraulico",
    "Portone": "Parti comuni", "Pulizia": "Pulizia",
    "Servizio Raccolta differenziata": "Raccolta differenziata",
    "Sottotetti": "Infiltrazioni", "Terrazzo": "Infiltrazioni",
    "Varie": "Altro", "Videosorveglianza": "Sicurezza"
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def clean_doc(doc):
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

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

async def add_timeline_event(segnalazione_id, evento, attore_id, attore_ruolo, dettagli=None):
    await db.segnalazione_timeline.insert_one({
        "id": str(uuid.uuid4()), "segnalazione_id": segnalazione_id,
        "evento": evento, "attore_id": attore_id, "attore_ruolo": attore_ruolo,
        "dettagli": dettagli or {}, "created_at": now_iso()
    })
