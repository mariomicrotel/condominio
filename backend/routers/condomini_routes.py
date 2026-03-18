"""Condomini routes: CRUD, import CSV/XLS."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import uuid
import csv
import io

from database import db, now_iso, clean_doc
from auth import get_current_user, get_admin_user
from models import CondominioCreate

router = APIRouter()


@router.get("/condomini")
async def list_condomini(user=Depends(get_current_user)):
    if user["ruolo"] == "admin":
        return await db.condomini.find({}, {"_id": 0}).to_list(1000)
    assocs = await db.user_condomini.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    ids = [a["condominio_id"] for a in assocs]
    return await db.condomini.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)


@router.post("/condomini")
async def create_condominio(data: CondominioCreate, user=Depends(get_admin_user)):
    cond = {
        "id": str(uuid.uuid4()),
        "tipo": data.tipo, "nome": data.nome, "indirizzo": data.indirizzo,
        "cap": data.cap, "citta": data.citta, "provincia": data.provincia,
        "codice_fiscale": data.codice_fiscale,
        "data_apertura_esercizio": data.data_apertura_esercizio,
        "data_costruzione": data.data_costruzione,
        "data_inizio_incarico": data.data_inizio_incarico,
        "data_fine_incarico": data.data_fine_incarico,
        "banca": data.banca, "iban": data.iban, "swift": data.swift,
        "dati_catastali": data.dati_catastali, "note": data.note,
        "created_at": now_iso(),
    }
    await db.condomini.insert_one(cond)
    return {k: v for k, v in cond.items() if k != "_id"}


@router.put("/condomini/{cond_id}")
async def update_condominio(cond_id: str, data: CondominioCreate, user=Depends(get_admin_user)):
    update_data = {
        "tipo": data.tipo, "nome": data.nome, "indirizzo": data.indirizzo,
        "cap": data.cap, "citta": data.citta, "provincia": data.provincia,
        "codice_fiscale": data.codice_fiscale,
        "data_apertura_esercizio": data.data_apertura_esercizio,
        "data_costruzione": data.data_costruzione,
        "data_inizio_incarico": data.data_inizio_incarico,
        "data_fine_incarico": data.data_fine_incarico,
        "banca": data.banca, "iban": data.iban, "swift": data.swift,
        "dati_catastali": data.dati_catastali, "note": data.note,
    }
    await db.condomini.update_one({"id": cond_id}, {"$set": update_data})
    return clean_doc(await db.condomini.find_one({"id": cond_id}, {"_id": 0}))


@router.delete("/condomini/{cond_id}")
async def delete_condominio(cond_id: str, user=Depends(get_admin_user)):
    await db.condomini.delete_one({"id": cond_id})
    return {"message": "Condominio eliminato"}


@router.post("/admin/condomini/import")
async def import_condomini_csv(file: UploadFile = File(...), user=Depends(get_admin_user)):
    """Import condominiums from XLS or CSV file matching the template."""
    content = await file.read()
    filename_lower = (file.filename or "").lower()

    created = 0
    updated = 0
    errors = []
    rows_processed = 0

    def parse_date_val(val, wb_datemode=0):
        """Convert Excel date float or string to DD/MM/YYYY string."""
        if val is None or val == "":
            return ""
        try:
            import xlrd as _xlrd
            if isinstance(val, float):
                return _xlrd.xldate_as_datetime(val, wb_datemode).strftime("%d/%m/%Y")
        except Exception:
            pass
        return str(val).strip()

    def row_to_cond(row_data: dict) -> dict:
        """Map template columns to our schema."""
        return {
            "tipo": str(row_data.get("Tipo", "Condominio")).strip() or "Condominio",
            "nome": str(row_data.get("Nome", "")).strip(),
            "codice_fiscale": str(row_data.get("Cod Fiscale", "") or row_data.get("Codice Fiscale", "")).strip(),
            "indirizzo": str(row_data.get("Indirizzo", "")).strip(),
            "cap": str(row_data.get("CAP", "")).strip(),
            "citta": str(row_data.get("Città", "") or row_data.get("Citta", "") or row_data.get("Città", "")).strip(),
            "provincia": str(row_data.get("Provincia", "")).strip(),
            "data_apertura_esercizio": row_data.get("_data_apertura", ""),
            "data_costruzione": row_data.get("_data_costruzione", ""),
            "data_inizio_incarico": row_data.get("_data_inizio", ""),
            "data_fine_incarico": row_data.get("_data_fine", ""),
            "banca": str(row_data.get("Banca", "")).strip(),
            "iban": str(row_data.get("IBAN", "")).strip(),
            "swift": str(row_data.get("SWIFT", "")).strip(),
            "dati_catastali": str(row_data.get("Dati catastali", "") or row_data.get("Dati Catastali", "")).strip(),
            "note": "",
        }

    if filename_lower.endswith(".xls"):
        try:
            import xlrd as _xlrd
            wb = _xlrd.open_workbook(file_contents=content)
            sh = wb.sheet_by_index(0)
            header_row = None
            headers = []
            for r in range(min(sh.nrows, 10)):
                row_vals = [str(sh.cell(r, c).value).strip() for c in range(sh.ncols)]
                if "Nome" in row_vals or "nome" in row_vals:
                    header_row = r
                    headers = row_vals
                    break
            if header_row is None:
                raise ValueError("Header row not found. Expected a row with 'Nome' column.")
            for r in range(header_row + 1, sh.nrows):
                row_data = {}
                for c in range(len(headers)):
                    if c < sh.ncols:
                        row_data[headers[c]] = sh.cell(r, c).value
                row_data["_data_apertura"] = parse_date_val(row_data.get("Data apertura es.", ""), wb.datemode)
                row_data["_data_costruzione"] = parse_date_val(row_data.get("Data Costruzione", ""), wb.datemode)
                row_data["_data_inizio"] = parse_date_val(row_data.get("Data inizio inc. amministr.", ""), wb.datemode)
                row_data["_data_fine"] = parse_date_val(row_data.get("Data fine inc. amministr.", ""), wb.datemode)
                cond_data = row_to_cond(row_data)
                if not cond_data["nome"]:
                    continue
                rows_processed += 1
                existing = None
                if cond_data["codice_fiscale"]:
                    existing = await db.condomini.find_one({"codice_fiscale": cond_data["codice_fiscale"]})
                if not existing:
                    existing = await db.condomini.find_one({"nome": cond_data["nome"]})
                if existing:
                    await db.condomini.update_one({"id": existing["id"]}, {"$set": cond_data})
                    updated += 1
                else:
                    cond_data["id"] = str(uuid.uuid4())
                    cond_data["created_at"] = now_iso()
                    await db.condomini.insert_one(cond_data)
                    created += 1
        except Exception as e:
            raise HTTPException(400, f"Errore nel file XLS: {str(e)}")

    elif filename_lower.endswith(".csv"):
        try:
            text = content.decode("utf-8-sig").replace("\r\n", "\n")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                if not row.get("Nome", "").strip():
                    continue
                row["_data_apertura"] = parse_date_val(row.get("Data apertura es.", ""))
                row["_data_costruzione"] = parse_date_val(row.get("Data Costruzione", ""))
                row["_data_inizio"] = parse_date_val(row.get("Data inizio inc. amministr.", ""))
                row["_data_fine"] = parse_date_val(row.get("Data fine inc. amministr.", ""))
                cond_data = row_to_cond(row)
                rows_processed += 1
                existing = None
                if cond_data["codice_fiscale"]:
                    existing = await db.condomini.find_one({"codice_fiscale": cond_data["codice_fiscale"]})
                if not existing:
                    existing = await db.condomini.find_one({"nome": cond_data["nome"]})
                if existing:
                    await db.condomini.update_one({"id": existing["id"]}, {"$set": cond_data})
                    updated += 1
                else:
                    cond_data["id"] = str(uuid.uuid4())
                    cond_data["created_at"] = now_iso()
                    await db.condomini.insert_one(cond_data)
                    created += 1
        except Exception as e:
            raise HTTPException(400, f"Errore nel file CSV: {str(e)}")
    else:
        raise HTTPException(400, "Formato non supportato. Usa file .xls o .csv")

    return {
        "message": f"Import completato: {created} creati, {updated} aggiornati",
        "righe_elaborate": rows_processed,
        "creati": created, "aggiornati": updated, "errori": errors,
    }
