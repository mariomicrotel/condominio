"""Files routes: upload, download."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import uuid, os

from database import db, now_iso, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_TYPES
from auth import get_current_user, get_admin_or_collaboratore

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    content_type = file.content_type or 'application/octet-stream'
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Tipo file non supportato: {content_type}")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File troppo grande (max 50MB)")
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename or '.bin')[1]
    stored_name = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_name
    with open(file_path, 'wb') as f:
        f.write(contents)
    file_doc = {
        "id": file_id, "filename": stored_name, "original_name": file.filename,
        "content_type": content_type, "size": len(contents),
        "uploaded_by": user["id"], "created_at": now_iso()
    }
    await db.uploaded_files.insert_one(file_doc)
    return {"id": file_id, "filename": stored_name, "content_type": content_type, "size": len(contents)}


@router.post("/upload/sopralluogo")
async def upload_sopralluogo_file(file: UploadFile = File(...), user=Depends(get_admin_or_collaboratore)):
    content_type = file.content_type or 'application/octet-stream'
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Tipo file non supportato: {content_type}")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File troppo grande (max 50MB)")
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename or '.bin')[1]
    stored_name = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_name
    with open(file_path, 'wb') as f:
        f.write(contents)
    file_doc = {
        "id": file_id, "filename": stored_name, "original_name": file.filename,
        "content_type": content_type, "size": len(contents),
        "uploaded_by": user["id"], "created_at": now_iso()
    }
    await db.uploaded_files.insert_one(file_doc)
    return {"id": file_id, "filename": stored_name, "content_type": content_type, "size": len(contents)}


@router.get("/files/{file_id}/{filename}")
async def get_file(file_id: str, filename: str):
    file_doc = await db.uploaded_files.find_one({"id": file_id})
    if not file_doc:
        raise HTTPException(404, "File non trovato")
    file_path = UPLOAD_DIR / file_doc["filename"]
    if not file_path.exists():
        raise HTTPException(404, "File non trovato su disco")
    return FileResponse(str(file_path), media_type=file_doc.get("content_type", "application/octet-stream"), filename=file_doc.get("original_name", filename))
