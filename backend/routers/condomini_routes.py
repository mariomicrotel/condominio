"""Condomini routes: CRUD, import CSV."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import uuid, csv, io

from database import db, now_iso, clean_doc
from auth import get_current_user, get_admin_user
from models import CondominioCreate

router = APIRouter()


@router.get("/condomini")
async def list_condomini(user=Depends(get_current_user)):
    return await db.condomini.find({}, {"_id": 0}).sort("nome", 1).to_list(500)


@router.post("/admin/condomini")
async def create_condominio(data: CondominioCreate, user=Depends(get_admin_user)):
    cond = {"id": str(uuid.uuid4()), **data.dict(), "created_at": now_iso()}
    await db.condomini.insert_one(cond)
    return {k: v for k, v in cond.items() if k != "_id"}


@router.put("/admin/condomini/{condominio_id}")
async def update_condominio(condominio_id: str, data: CondominioCreate, user=Depends(get_admin_user)):
    existing = await db.condomini.find_one({"id": condominio_id})
    if not existing:
        raise HTTPException(404, "Condominio non trovato")
    upd = {k: v for k, v in data.dict().items() if v}
    upd["updated_at"] = now_iso()
    await db.condomini.update_one({"id": condominio_id}, {"$set": upd})
    return clean_doc(await db.condomini.find_one({"id": condominio_id}, {"_id": 0}))


@router.delete("/admin/condomini/{condominio_id}")
async def delete_condominio(cond_id: str, user=Depends(get_admin_user)):
    await db.condomini.delete_one({"id": cond_id})
    return {"message": "Condominio eliminato"}


@router.post("/admin/condomini/import-csv")
async def import_condomini_csv(file: UploadFile = File(...), user=Depends(get_admin_user)):
    """Import condominiums from a CSV file."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")

    imported = 0
    errors = []

    field_map = {
        "tipo": ["tipo", "type"],
        "nome": ["nome", "denominazione", "name"],
        "indirizzo": ["indirizzo", "via", "address"],
        "cap": ["cap", "zip"],
        "citta": ["citta", "città", "city", "comune"],
        "provincia": ["provincia", "prov"],
        "codice_fiscale": ["codice_fiscale", "cf", "fiscal_code"],
        "data_apertura_esercizio": ["data_apertura_esercizio", "apertura_esercizio"],
        "data_costruzione": ["data_costruzione", "anno_costruzione"],
        "data_inizio_incarico": ["data_inizio_incarico", "inizio_incarico"],
        "data_fine_incarico": ["data_fine_incarico", "fine_incarico"],
        "banca": ["banca", "bank"],
        "iban": ["iban"],
        "swift": ["swift", "bic"],
        "dati_catastali": ["dati_catastali", "catasto"],
        "note": ["note", "notes"],
    }

    def get_field(row, field_name):
        for alias in field_map.get(field_name, [field_name]):
            for key in row:
                if key.strip().lower() == alias.lower():
                    return row[key].strip() if row[key] else ""
        return ""

    for idx, row in enumerate(reader, start=2):
        nome = get_field(row, "nome")
        if not nome:
            errors.append(f"Riga {idx}: nome mancante")
            continue
        cond = {
            "id": str(uuid.uuid4()),
            "tipo": get_field(row, "tipo") or "Condominio",
            "nome": nome,
            "indirizzo": get_field(row, "indirizzo"),
            "cap": get_field(row, "cap"),
            "citta": get_field(row, "citta"),
            "provincia": get_field(row, "provincia"),
            "codice_fiscale": get_field(row, "codice_fiscale"),
            "data_apertura_esercizio": get_field(row, "data_apertura_esercizio"),
            "data_costruzione": get_field(row, "data_costruzione"),
            "data_inizio_incarico": get_field(row, "data_inizio_incarico"),
            "data_fine_incarico": get_field(row, "data_fine_incarico"),
            "banca": get_field(row, "banca"),
            "iban": get_field(row, "iban"),
            "swift": get_field(row, "swift"),
            "dati_catastali": get_field(row, "dati_catastali"),
            "note": get_field(row, "note"),
            "created_at": now_iso()
        }
        await db.condomini.insert_one(cond)
        imported += 1

    return {"imported": imported, "errors": errors, "total_rows": imported + len(errors)}
