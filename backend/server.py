"""Studio Tardugno & Bonifacio API — thin entry-point.

All route logic lives under routers/.
This file wires everything together: CORS, routers, seed, and lifecycle events.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import uuid
import logging

from database import db, now_iso
from auth import hash_pw

from routers import (
    auth_routes, admin_routes, condomini_routes,
    segnalazioni_routes, fornitori_routes, collaboratori_routes,
    sopralluoghi_routes, files_routes, privacy_routes,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ── App & Router ──────────────────────────────────────────────────────────────

app = FastAPI(title="Studio Tardugno & Bonifacio API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

api = APIRouter(prefix="/api")

# Include all route modules
for mod in (
    auth_routes, admin_routes, condomini_routes,
    segnalazioni_routes, fornitori_routes, collaboratori_routes,
    sopralluoghi_routes, files_routes, privacy_routes,
):
    api.include_router(mod.router)


# ── Seed & Root ───────────────────────────────────────────────────────────────

@api.get("/")
async def root():
    return {"message": "Studio Tardugno & Bonifacio API", "version": "2.0.0"}


@api.post("/seed")
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

    # Seed Privacy Policy v1.0
    existing_inf = await db.informativa_versioni.find_one({"versione": "1.0"})
    if not existing_inf:
        await db.informativa_versioni.insert_one({
            "id": str(uuid.uuid4()), "versione": "1.0",
            "testo_completo": privacy_routes.PRIVACY_POLICY_V1_TEXT,
            "note_versione": "Prima versione dell'informativa privacy",
            "data_pubblicazione": now_iso(), "attiva": True, "created_by": admin_id
        })

    return {
        "message": "Dati seed inseriti con successo",
        "admin": {"email": "admin@tardugno.it", "password": "admin123"},
        "condomino": {"email": "mario.rossi@email.it", "password": "password123"},
        "codice_invito": "WELCOME1"
    }


app.include_router(api)


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    """Ensure privacy policy v1.0 exists."""
    existing = await db.informativa_versioni.find_one({"versione": "1.0"})
    if not existing:
        admin = await db.users.find_one({"ruolo": "admin"}, {"id": 1})
        await db.informativa_versioni.insert_one({
            "id": str(uuid.uuid4()), "versione": "1.0",
            "testo_completo": privacy_routes.PRIVACY_POLICY_V1_TEXT,
            "note_versione": "Prima versione dell'informativa privacy",
            "data_pubblicazione": now_iso(), "attiva": True,
            "created_by": admin["id"] if admin else "system"
        })
        logger.info("Privacy policy v1.0 inserted on startup")


@app.on_event("shutdown")
async def on_shutdown():
    from database import client
    client.close()
