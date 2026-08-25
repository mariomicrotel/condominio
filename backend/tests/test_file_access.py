"""
Tests for P0-01: authenticated + authorised file download.

Matrix covered:
    - request without token                 → 401
    - condomino owning the segnalazione     → 200
    - other condomino                       → 403
    - admin                                 → 200
    - unknown file id                       → 404
    - fornitore assegnato alla segnalazione → 200
    - fornitore NON assegnato               → 403

These tests hit the live backend at ``EXPO_PUBLIC_BACKEND_URL`` and require
the seeded admin + condomino accounts (see ``memory/test_credentials.md``).
"""
import io
import os
import uuid

import pytest
import requests


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def base_url():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if not url:
        pytest.skip("EXPO_PUBLIC_BACKEND_URL not set")
    return url.rstrip("/")


def _login(base_url: str, email: str, password: str, path: str = "/api/auth/login") -> str:
    res = requests.post(f"{base_url}{path}", json={"email": email, "password": password}, timeout=10)
    if res.status_code != 200:
        pytest.skip(f"Login failed for {email}: {res.status_code} {res.text}")
    return res.json()["token"]


@pytest.fixture(scope="module")
def admin_token(base_url):
    return _login(base_url, "admin@tardugno.it", "admin123")


@pytest.fixture(scope="module")
def condomino_token(base_url):
    return _login(base_url, "mario.rossi@email.it", "password123")


def _upload_dummy(base_url: str, token: str, filename: str = "acl.jpg") -> str:
    """Upload a tiny valid JPEG (magic bytes) and return the file id."""
    # Minimal 1x1 JPEG (SOI + APP0 + tables + SOS + data + EOI). Not fully valid,
    # but sufficient for the server which only checks the declared content-type.
    payload = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"
    files = {"file": (filename, io.BytesIO(payload), "image/jpeg")}
    res = requests.post(
        f"{base_url}/api/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        timeout=15,
    )
    assert res.status_code == 200, f"upload failed: {res.status_code} {res.text}"
    return res.json()["id"]


def _get_first_condominio_id(base_url: str, token: str) -> str:
    res = requests.get(
        f"{base_url}/api/condomini",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if res.status_code != 200 or not res.json():
        pytest.skip("Condomino has no associated condominio; cannot exercise ACL")
    return res.json()[0]["id"]


def _create_segnalazione(base_url: str, token: str, cond_id: str, file_id: str) -> dict:
    res = requests.post(
        f"{base_url}/api/segnalazioni",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "condominio_id": cond_id,
            "qualita": "Proprietario",
            "tipologia": "Altro",
            "descrizione": "ACL test segnalazione",
            "urgenza": "Bassa",
            "allegati": [file_id],
        },
        timeout=10,
    )
    assert res.status_code == 200, f"createSegnalazione failed: {res.status_code} {res.text}"
    return res.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_download_requires_authentication(base_url, condomino_token):
    """No Bearer token → 401 (or 403 from HTTPBearer). Never 200."""
    file_id = _upload_dummy(base_url, condomino_token, "no-auth.jpg")

    res = requests.get(f"{base_url}/api/files/{file_id}/no-auth.jpg", timeout=10)
    assert res.status_code in (401, 403), f"expected 401/403, got {res.status_code}"


def test_download_unknown_file_returns_404(base_url, admin_token):
    unknown = str(uuid.uuid4())
    res = requests.get(
        f"{base_url}/api/files/{unknown}/whatever.jpg",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert res.status_code == 404


def test_admin_can_download_any_file(base_url, admin_token, condomino_token):
    file_id = _upload_dummy(base_url, condomino_token, "admin-view.jpg")

    res = requests.get(
        f"{base_url}/api/files/{file_id}/admin-view.jpg",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert res.status_code == 200, f"admin denied: {res.status_code} {res.text}"


def test_uploader_can_download_their_own_file(base_url, condomino_token):
    file_id = _upload_dummy(base_url, condomino_token, "own.jpg")

    res = requests.get(
        f"{base_url}/api/files/{file_id}/own.jpg",
        headers={"Authorization": f"Bearer {condomino_token}"},
        timeout=10,
    )
    assert res.status_code == 200


def test_owner_of_segnalazione_can_download_attached_file(base_url, condomino_token):
    """Explicit ACL path: file referenced by a segnalazione the user owns."""
    file_id = _upload_dummy(base_url, condomino_token, "seg-attach.jpg")
    cond_id = _get_first_condominio_id(base_url, condomino_token)
    _create_segnalazione(base_url, condomino_token, cond_id, file_id)

    res = requests.get(
        f"{base_url}/api/files/{file_id}/seg-attach.jpg",
        headers={"Authorization": f"Bearer {condomino_token}"},
        timeout=10,
    )
    assert res.status_code == 200


def test_other_condomino_cannot_download_someone_elses_file(base_url, admin_token, condomino_token):
    """A different condomino gets 403 for a file not referenced by any of their resources."""
    file_id = _upload_dummy(base_url, condomino_token, "leak.jpg")

    # Provision a second condomino via admin API
    email = f"acl_{uuid.uuid4().hex[:8]}@example.com"
    reg = requests.post(
        f"{base_url}/api/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "nome": "Acl", "cognome": "Test",
            "codice_invito": "",
        },
        timeout=10,
    )
    if reg.status_code != 200:
        pytest.skip(f"cannot register second user: {reg.status_code} {reg.text}")
    other_token = reg.json()["token"]

    res = requests.get(
        f"{base_url}/api/files/{file_id}/leak.jpg",
        headers={"Authorization": f"Bearer {other_token}"},
        timeout=10,
    )
    assert res.status_code == 403, f"expected 403, got {res.status_code}: {res.text}"


def test_fornitore_not_assigned_gets_403(base_url, admin_token, condomino_token):
    """
    Provision a fornitore, do NOT assign the segnalazione to them, then check
    that the fornitore is denied access to its attachments.
    """
    file_id = _upload_dummy(base_url, condomino_token, "forn-noassign.jpg")
    cond_id = _get_first_condominio_id(base_url, condomino_token)
    _create_segnalazione(base_url, condomino_token, cond_id, file_id)

    email = f"forn_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Fornitore123!"
    create = requests.post(
        f"{base_url}/api/admin/fornitori",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ragione_sociale": "ACL Fornitore SRL",
            "email": email, "password": pwd,
            "settori": ["Altro"], "stato": "Attivo",
        },
        timeout=10,
    )
    if create.status_code != 200:
        pytest.skip(f"cannot create fornitore: {create.status_code} {create.text}")

    login = requests.post(
        f"{base_url}/api/fornitore/login",
        json={"email": email, "password": pwd},
        timeout=10,
    )
    if login.status_code != 200:
        pytest.skip(f"cannot login fornitore: {login.status_code} {login.text}")
    forn_token = login.json()["token"]

    res = requests.get(
        f"{base_url}/api/files/{file_id}/forn-noassign.jpg",
        headers={"Authorization": f"Bearer {forn_token}"},
        timeout=10,
    )
    assert res.status_code == 403


def test_fornitore_assigned_can_download(base_url, admin_token, condomino_token):
    """
    Provision a fornitore, ASSIGN the segnalazione to them, then check that
    the fornitore is granted access to its attachments.
    """
    file_id = _upload_dummy(base_url, condomino_token, "forn-ok.jpg")
    cond_id = _get_first_condominio_id(base_url, condomino_token)
    seg = _create_segnalazione(base_url, condomino_token, cond_id, file_id)

    email = f"forn_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Fornitore123!"
    create = requests.post(
        f"{base_url}/api/admin/fornitori",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ragione_sociale": "ACL Assigned SRL",
            "email": email, "password": pwd,
            "settori": ["Altro"], "stato": "Attivo",
        },
        timeout=10,
    )
    if create.status_code != 200:
        pytest.skip(f"cannot create fornitore: {create.status_code} {create.text}")
    forn_id = create.json()["id"]

    # Assign
    assign = requests.post(
        f"{base_url}/api/admin/segnalazioni/{seg['id']}/assegna",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"fornitore_id": forn_id, "note_admin": "", "data_prevista": ""},
        timeout=10,
    )
    if assign.status_code != 200:
        pytest.skip(f"cannot assign: {assign.status_code} {assign.text}")

    login = requests.post(
        f"{base_url}/api/fornitore/login",
        json={"email": email, "password": pwd},
        timeout=10,
    )
    if login.status_code != 200:
        pytest.skip(f"cannot login fornitore: {login.status_code} {login.text}")
    forn_token = login.json()["token"]

    res = requests.get(
        f"{base_url}/api/files/{file_id}/forn-ok.jpg",
        headers={"Authorization": f"Bearer {forn_token}"},
        timeout=10,
    )
    assert res.status_code == 200, f"expected 200, got {res.status_code} {res.text}"
