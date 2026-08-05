"""Studio Tardugno & Bonifacio API — thin entry-point.

All route logic lives under routers/.
This file wires everything together: CORS, routers, seed, and lifecycle events.
"""
import os
from fastapi import FastAPI, APIRouter, Request
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import JSONResponse
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

# ── Rate Limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── App & Router ──────────────────────────────────────────────────────────────

app = FastAPI(title="Studio Tardugno & Bonifacio API", version="2.1.0")

# Rate limiting
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Troppi tentativi. Riprova tra qualche minuto."}
    )

# CORS: allow all origins for mobile apps (they don't send Origin header)
# Web frontend preview + localhost dev explicitly listed
ALLOWED_ORIGINS = [
    "*",  # Allow all for mobile apps
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Session-ID"],
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


app.include_router(api)


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    """Initialize indexes and ensure privacy policy v1.0 exists."""
    # Create MongoDB indexes
    from database import create_indexes
    await create_indexes()
    
    # Ensure privacy policy v1.0 exists
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
