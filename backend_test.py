#!/usr/bin/env python3
"""
Comprehensive Backend Regression Test
Tests all user flows: Condomino, Admin, Fornitore, Collaboratore
"""
import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://backend-refactor-86.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@tardugno.it"
ADMIN_PASSWORD = "admin123"
CONDOMINO_EMAIL = "mario.rossi@email.it"
CONDOMINO_PASSWORD = "password123"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"{GREEN}✓ PASS{RESET}: {test_name}")
    
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append({"test": test_name, "error": error})
        print(f"{RED}✗ FAIL{RESET}: {test_name}")
        print(f"  {RED}Error: {error}{RESET}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*80}")
        print(f"{BLUE}TEST SUMMARY{RESET}")
        print(f"{'='*80}")
        print(f"Total Tests: {total}")
        print(f"{GREEN}Passed: {self.passed}{RESET}")
        print(f"{RED}Failed: {self.failed}{RESET}")
        if self.errors:
            print(f"\n{RED}FAILED TESTS:{RESET}")
            for err in self.errors:
                print(f"  - {err['test']}: {err['error']}")
        print(f"{'='*80}\n")
        return self.failed == 0

results = TestResults()

def make_request(method: str, endpoint: str, token: Optional[str] = None, 
                 data: Optional[Dict] = None, files: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BACKEND_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            if files:
                resp = requests.post(url, headers=headers, files=files, data=data, timeout=10)
            else:
                headers["Content-Type"] = "application/json"
                resp = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            headers["Content-Type"] = "application/json"
            resp = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, {"error": f"Unsupported method: {method}"}, 0
        
        try:
            return resp.status_code < 400, resp.json(), resp.status_code
        except:
            return resp.status_code < 400, {"text": resp.text}, resp.status_code
    except Exception as e:
        return False, {"error": str(e)}, 0

def test_flusso_condomino():
    """FLUSSO 1: UTENTE CONDOMINO"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}FLUSSO 1: UTENTE CONDOMINO{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Step 1: Seed data
    success, data, status = make_request("POST", "/seed")
    if success or status == 200:
        results.add_pass("1. POST /api/seed - Reset dati di test")
    else:
        results.add_fail("1. POST /api/seed - Reset dati di test", f"Status {status}: {data}")
        return None
    
    # Step 2: Login condomino
    success, data, status = make_request("POST", "/auth/login", data={
        "email": CONDOMINO_EMAIL,
        "password": CONDOMINO_PASSWORD
    })
    if success and "token" in data:
        token = data["token"]
        results.add_pass("2. POST /api/auth/login - Login condomino")
    else:
        results.add_fail("2. POST /api/auth/login - Login condomino", f"Status {status}: {data}")
        return None
    
    # Step 3: Get profile
    success, data, status = make_request("GET", "/auth/profile", token=token)
    if success and "nome" in data and "email" in data and "ruolo" in data and "condomini" in data:
        results.add_pass("3. GET /api/auth/profile - Verifica profilo utente")
    else:
        results.add_fail("3. GET /api/auth/profile - Verifica profilo utente", 
                        f"Status {status}: Missing fields in {data}")
    
    # Get condominio_id for next steps
    condominio_id = None
    if "condomini" in data and len(data["condomini"]) > 0:
        condominio_id = data["condomini"][0]["id"]
    
    # Step 4: Create segnalazione
    success, data, status = make_request("POST", "/segnalazioni", token=token, data={
        "condominio_id": condominio_id,
        "tipologia": "Idraulica",
        "descrizione": "Perdita d'acqua nel bagno principale",
        "urgenza": "Alta",
        "qualita": "Proprietario"
    })
    if success and "id" in data:
        segnalazione_id = data["id"]
        results.add_pass("4. POST /api/segnalazioni - Crea nuova segnalazione")
    else:
        results.add_fail("4. POST /api/segnalazioni - Crea nuova segnalazione", 
                        f"Status {status}: {data}")
        segnalazione_id = None
    
    # Step 5: Get segnalazioni list
    success, data, status = make_request("GET", "/segnalazioni", token=token)
    if success and isinstance(data, list):
        results.add_pass("5. GET /api/segnalazioni - Verifica lista segnalazioni")
    else:
        results.add_fail("5. GET /api/segnalazioni - Verifica lista segnalazioni", 
                        f"Status {status}: {data}")
    
    # Step 6: Create richiesta documenti
    success, data, status = make_request("POST", "/richieste-documenti", token=token, data={
        "condominio_id": condominio_id,
        "tipo_documento": "Estratto conto",
        "note": "Richiesta estratto conto anno 2025"
    })
    if success and "id" in data:
        results.add_pass("6. POST /api/richieste-documenti - Crea richiesta documenti")
    else:
        results.add_fail("6. POST /api/richieste-documenti - Crea richiesta documenti", 
                        f"Status {status}: {data}")
    
    # Step 7: Get richieste documenti
    success, data, status = make_request("GET", "/richieste-documenti", token=token)
    if success and isinstance(data, list):
        results.add_pass("7. GET /api/richieste-documenti - Verifica lista richieste")
    else:
        results.add_fail("7. GET /api/richieste-documenti - Verifica lista richieste", 
                        f"Status {status}: {data}")
    
    # Step 8: Create appuntamento
    success, data, status = make_request("POST", "/appuntamenti", token=token, data={
        "condominio_id": condominio_id,
        "motivo": "Consulenza amministrativa",
        "data_richiesta": "2026-03-20",
        "fascia_oraria": "Mattina (9-13)"
    })
    if success and "id" in data:
        results.add_pass("8. POST /api/appuntamenti - Crea appuntamento")
    else:
        results.add_fail("8. POST /api/appuntamenti - Crea appuntamento", 
                        f"Status {status}: {data}")
    
    # Step 9: Get appuntamenti
    success, data, status = make_request("GET", "/appuntamenti", token=token)
    if success and isinstance(data, list):
        results.add_pass("9. GET /api/appuntamenti - Verifica lista appuntamenti")
    else:
        results.add_fail("9. GET /api/appuntamenti - Verifica lista appuntamenti", 
                        f"Status {status}: {data}")
    
    # Step 10: Get notifiche
    success, data, status = make_request("GET", "/notifiche", token=token)
    if success and isinstance(data, list):
        results.add_pass("10. GET /api/notifiche - Verifica notifiche")
    else:
        results.add_fail("10. GET /api/notifiche - Verifica notifiche", 
                        f"Status {status}: {data}")
    
    # Step 11: Get avvisi
    success, data, status = make_request("GET", "/avvisi", token=token)
    if success and isinstance(data, list):
        results.add_pass("11. GET /api/avvisi - Verifica bacheca avvisi")
    else:
        results.add_fail("11. GET /api/avvisi - Verifica bacheca avvisi", 
                        f"Status {status}: {data}")
    
    return {"token": token, "segnalazione_id": segnalazione_id, "condominio_id": condominio_id}

def test_flusso_admin(condomino_data):
    """FLUSSO 2: ADMIN"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}FLUSSO 2: ADMIN{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Step 1: Login admin
    success, data, status = make_request("POST", "/auth/login", data={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if success and "token" in data:
        admin_token = data["token"]
        results.add_pass("1. POST /api/auth/login - Login admin")
    else:
        results.add_fail("1. POST /api/auth/login - Login admin", f"Status {status}: {data}")
        return None
    
    # Step 2: Get dashboard
    success, data, status = make_request("GET", "/admin/dashboard", token=admin_token)
    if success and isinstance(data, dict) and "totale_utenti" in data:
        results.add_pass("2. GET /api/admin/dashboard - Verifica dashboard stats")
    else:
        results.add_fail("2. GET /api/admin/dashboard - Verifica dashboard stats", 
                        f"Status {status}: {data}")
    
    # Step 3: Get utenti list
    success, data, status = make_request("GET", "/admin/utenti", token=admin_token)
    if success and isinstance(data, list):
        results.add_pass("3. GET /api/admin/utenti - Lista utenti")
    else:
        results.add_fail("3. GET /api/admin/utenti - Lista utenti", 
                        f"Status {status}: {data}")
    
    # Step 4: Get admin segnalazioni
    success, data, status = make_request("GET", "/admin/segnalazioni", token=admin_token)
    if success and isinstance(data, list):
        results.add_pass("4. GET /api/admin/segnalazioni - Lista segnalazioni")
    else:
        results.add_fail("4. GET /api/admin/segnalazioni - Lista segnalazioni", 
                        f"Status {status}: {data}")
    
    # Step 5: Admin create segnalazione
    condominio_id = condomino_data.get("condominio_id") if condomino_data else None
    success, data, status = make_request("POST", "/admin/segnalazioni", token=admin_token, data={
        "condominio_id": condominio_id,
        "tipologia": "Elettrica",
        "descrizione": "Guasto impianto elettrico scale",
        "urgenza": "Critica",
        "note_admin": "Da gestire con urgenza"
    })
    if success and "id" in data:
        admin_segnalazione_id = data["id"]
        results.add_pass("5. POST /api/admin/segnalazioni - Admin crea segnalazione")
    else:
        results.add_fail("5. POST /api/admin/segnalazioni - Admin crea segnalazione", 
                        f"Status {status}: {data}")
        admin_segnalazione_id = None
    
    # Step 6: Admin modify segnalazione
    if admin_segnalazione_id:
        success, data, status = make_request("PUT", f"/admin/segnalazioni/{admin_segnalazione_id}", 
                                            token=admin_token, data={
            "tipologia": "Elettrica",
            "descrizione": "Guasto impianto elettrico scale - AGGIORNATO",
            "urgenza": "Alta",
            "note_admin": "Fornitore contattato"
        })
        if success:
            results.add_pass("6. PUT /api/admin/segnalazioni/{id} - Admin modifica segnalazione")
        else:
            results.add_fail("6. PUT /api/admin/segnalazioni/{id} - Admin modifica segnalazione", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("6. PUT /api/admin/segnalazioni/{id} - Admin modifica segnalazione", 
                        "Skipped - no segnalazione_id")
    
    # Step 7: Get admin appuntamenti
    success, data, status = make_request("GET", "/admin/appuntamenti", token=admin_token)
    if success and isinstance(data, list):
        appuntamenti = data
        results.add_pass("7. GET /api/admin/appuntamenti - Lista appuntamenti")
    else:
        results.add_fail("7. GET /api/admin/appuntamenti - Lista appuntamenti", 
                        f"Status {status}: {data}")
        appuntamenti = []
    
    # Step 8: Confirm appuntamento
    if appuntamenti and len(appuntamenti) > 0:
        app_id = appuntamenti[0]["id"]
        success, data, status = make_request("PUT", f"/admin/appuntamenti/{app_id}", 
                                            token=admin_token, data={
            "stato": "Confermato",
            "data_confermata": "2026-03-20T10:00:00"
        })
        if success:
            results.add_pass("8. PUT /api/admin/appuntamenti/{id} - Conferma appuntamento")
        else:
            results.add_fail("8. PUT /api/admin/appuntamenti/{id} - Conferma appuntamento", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("8. PUT /api/admin/appuntamenti/{id} - Conferma appuntamento", 
                        "Skipped - no appuntamenti")
    
    # Step 9: Create avviso
    success, data, status = make_request("POST", "/admin/avvisi", token=admin_token, data={
        "condominio_id": condominio_id,
        "titolo": "Test Avviso Regressione",
        "testo": "Questo è un avviso di test per la regressione completa",
        "categoria": "Avviso generico"
    })
    if success and "id" in data:
        results.add_pass("9. POST /api/admin/avvisi - Crea avviso bacheca")
    else:
        results.add_fail("9. POST /api/admin/avvisi - Crea avviso bacheca", 
                        f"Status {status}: {data}")
    
    # Step 10: Get condomini
    success, data, status = make_request("GET", "/condomini", token=admin_token)
    if success and isinstance(data, list):
        condomini = data
        results.add_pass("10. GET /api/condomini - Lista condomini")
    else:
        results.add_fail("10. GET /api/condomini - Lista condomini", 
                        f"Status {status}: {data}")
        condomini = []
    
    # Step 11: Create condominio
    success, data, status = make_request("POST", "/condomini", token=admin_token, data={
        "nome": "Test Condominio Regressione",
        "indirizzo": "Via Test Regressione, 123",
        "codice_fiscale": "90012345678",
        "note": "Condominio di test"
    })
    if success and "id" in data:
        results.add_pass("11. POST /api/condomini - Crea condominio")
    else:
        results.add_fail("11. POST /api/condomini - Crea condominio", 
                        f"Status {status}: {data}")
    
    # Step 12: Get richieste documenti
    success, data, status = make_request("GET", "/admin/richieste-documenti", token=admin_token)
    if success and isinstance(data, list):
        richieste = data
        results.add_pass("12. GET /api/admin/richieste-documenti - Lista richieste documenti")
    else:
        results.add_fail("12. GET /api/admin/richieste-documenti - Lista richieste documenti", 
                        f"Status {status}: {data}")
        richieste = []
    
    # Step 13: Manage richiesta
    if richieste and len(richieste) > 0:
        richiesta_id = richieste[0]["id"]
        success, data, status = make_request("PUT", f"/admin/richieste-documenti/{richiesta_id}", 
                                            token=admin_token, data={
            "stato": "In lavorazione",
            "note_admin": "Documento in preparazione"
        })
        if success:
            results.add_pass("13. PUT /api/admin/richieste-documenti/{id} - Gestisci richiesta")
        else:
            results.add_fail("13. PUT /api/admin/richieste-documenti/{id} - Gestisci richiesta", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("13. PUT /api/admin/richieste-documenti/{id} - Gestisci richiesta", 
                        "Skipped - no richieste")
    
    return {"admin_token": admin_token, "condominio_id": condominio_id}

def test_flusso_fornitore(admin_data, condomino_data):
    """FLUSSO 3: FORNITORE"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}FLUSSO 3: FORNITORE{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    admin_token = admin_data.get("admin_token") if admin_data else None
    if not admin_token:
        results.add_fail("FLUSSO 3 - Fornitore", "No admin token available")
        return None
    
    # Step 1: Admin create fornitore with unique email
    timestamp = int(time.time())
    fornitore_email = f"test.fornitore.{timestamp}@email.it"
    fornitore_password = "Fornitore123!"
    success, data, status = make_request("POST", "/admin/fornitori", token=admin_token, data={
        "ragione_sociale": "Test Fornitore Regressione SRL",
        "email": fornitore_email,
        "password": fornitore_password,
        "telefono": "+39 333 9876543",
        "partita_iva": "12345678901",
        "codice_fiscale": "12345678901",
        "indirizzo": "Via Fornitori, 1",
        "iban": "IT60X0542811101000000123456",
        "settori": ["Idraulica", "Elettrica"]
    })
    if success and "id" in data:
        fornitore_id = data["id"]
        results.add_pass("1. POST /api/admin/fornitori - Admin crea fornitore")
    else:
        results.add_fail("1. POST /api/admin/fornitori - Admin crea fornitore", 
                        f"Status {status}: {data}")
        return None
    
    # Step 2: Get fornitori list
    success, data, status = make_request("GET", "/admin/fornitori", token=admin_token)
    if success and isinstance(data, list) and any(f["id"] == fornitore_id for f in data):
        results.add_pass("2. GET /api/admin/fornitori - Verifica fornitore creato")
    else:
        results.add_fail("2. GET /api/admin/fornitori - Verifica fornitore creato", 
                        f"Status {status}: Fornitore not found in list")
    
    # Step 3: Admin assign segnalazione to fornitore
    segnalazione_id = condomino_data.get("segnalazione_id") if condomino_data else None
    if segnalazione_id:
        success, data, status = make_request("POST", f"/admin/segnalazioni/{segnalazione_id}/assegna", 
                                            token=admin_token, data={
            "fornitore_id": fornitore_id
        })
        if success:
            results.add_pass("3. POST /api/admin/segnalazioni/{id}/assegna - Admin assegna segnalazione")
        else:
            results.add_fail("3. POST /api/admin/segnalazioni/{id}/assegna - Admin assegna segnalazione", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("3. POST /api/admin/segnalazioni/{id}/assegna - Admin assegna segnalazione", 
                        "Skipped - no segnalazione_id")
    
    # Step 4: Fornitore login
    success, data, status = make_request("POST", "/fornitore/login", data={
        "email": fornitore_email,
        "password": fornitore_password
    })
    if success and "token" in data:
        fornitore_token = data["token"]
        results.add_pass("4. POST /api/fornitore/login - Login fornitore")
    else:
        results.add_fail("4. POST /api/fornitore/login - Login fornitore", 
                        f"Status {status}: {data}")
        return None
    
    # Step 5: Get fornitore dashboard
    success, data, status = make_request("GET", "/fornitore/dashboard", token=fornitore_token)
    if success and isinstance(data, dict) and "totale" in data:
        results.add_pass("5. GET /api/fornitore/dashboard - Verifica dashboard fornitore")
    else:
        results.add_fail("5. GET /api/fornitore/dashboard - Verifica dashboard fornitore", 
                        f"Status {status}: {data}")
    
    # Step 6: Get interventi list
    success, data, status = make_request("GET", "/fornitore/interventi", token=fornitore_token)
    if success and isinstance(data, list):
        results.add_pass("6. GET /api/fornitore/interventi - Lista interventi assegnati")
    else:
        results.add_fail("6. GET /api/fornitore/interventi - Lista interventi assegnati", 
                        f"Status {status}: {data}")
    
    # Step 7: Create rapportino
    if segnalazione_id:
        success, data, status = make_request("POST", f"/fornitore/rapportino/{segnalazione_id}", 
                                            token=fornitore_token, data={
            "descrizione_intervento": "Riparata perdita d'acqua nel bagno",
            "materiali_utilizzati": "Guarnizione rubinetto, silicone",
            "ore_lavoro": 2.5,
            "costo_materiali": 45.00,
            "costo_manodopera": 80.00,
            "note": "Intervento completato con successo"
        })
        if success:
            results.add_pass("7. POST /api/fornitore/rapportino/{id} - Crea rapportino intervento")
        else:
            results.add_fail("7. POST /api/fornitore/rapportino/{id} - Crea rapportino intervento", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("7. POST /api/fornitore/rapportino/{id} - Crea rapportino intervento", 
                        "Skipped - no segnalazione_id")
    
    # Step 8: Admin view rapportino
    if segnalazione_id:
        success, data, status = make_request("GET", f"/admin/segnalazioni/{segnalazione_id}/rapportino", 
                                            token=admin_token)
        if success and "descrizione_intervento" in data:
            results.add_pass("8. GET /api/admin/segnalazioni/{id}/rapportino - Admin vede rapportino")
        else:
            results.add_fail("8. GET /api/admin/segnalazioni/{id}/rapportino - Admin vede rapportino", 
                            f"Status {status}: {data}")
    else:
        results.add_fail("8. GET /api/admin/segnalazioni/{id}/rapportino - Admin vede rapportino", 
                        "Skipped - no segnalazione_id")
    
    return {"fornitore_token": fornitore_token, "fornitore_id": fornitore_id}

def test_flusso_collaboratore(admin_data):
    """FLUSSO 4: COLLABORATORE & SOPRALLUOGHI"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}FLUSSO 4: COLLABORATORE & SOPRALLUOGHI{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    admin_token = admin_data.get("admin_token") if admin_data else None
    condominio_id = admin_data.get("condominio_id") if admin_data else None
    if not admin_token:
        results.add_fail("FLUSSO 4 - Collaboratore", "No admin token available")
        return None
    
    # Step 1: Admin create collaboratore with unique email
    timestamp = int(time.time())
    collab_email = f"test.collaboratore.{timestamp}@email.it"
    collab_password = "Collab123!"
    success, data, status = make_request("POST", "/admin/collaboratori", token=admin_token, data={
        "nome": "Test",
        "cognome": "Collaboratore Regressione",
        "email": collab_email,
        "password": collab_password,
        "telefono": "+39 333 5555555"
    })
    if success and "id" in data:
        collab_id = data["id"]
        results.add_pass("1. POST /api/admin/collaboratori - Admin crea collaboratore")
    else:
        results.add_fail("1. POST /api/admin/collaboratori - Admin crea collaboratore", 
                        f"Status {status}: {data}")
        return None
    
    # Step 2: Collaboratore login
    success, data, status = make_request("POST", "/collaboratore/login", data={
        "email": collab_email,
        "password": collab_password
    })
    if success and "token" in data:
        collab_token = data["token"]
        results.add_pass("2. POST /api/collaboratore/login - Login collaboratore")
    else:
        results.add_fail("2. POST /api/collaboratore/login - Login collaboratore", 
                        f"Status {status}: {data}")
        return None
    
    # Step 3: Create sopralluogo
    success, data, status = make_request("POST", "/sopralluoghi", token=collab_token, data={
        "condominio_id": condominio_id,
        "data": "2026-03-25",
        "note_generali": "Sopralluogo di test regressione"
    })
    if success and "id" in data:
        sopralluogo_id = data["id"]
        results.add_pass("3. POST /api/sopralluoghi - Crea sopralluogo")
    else:
        results.add_fail("3. POST /api/sopralluoghi - Crea sopralluogo", 
                        f"Status {status}: {data}")
        return None
    
    # Step 4: Get sopralluoghi list
    success, data, status = make_request("GET", "/sopralluoghi", token=collab_token)
    if success and isinstance(data, list) and any(s["id"] == sopralluogo_id for s in data):
        results.add_pass("4. GET /api/sopralluoghi - Lista sopralluoghi")
    else:
        results.add_fail("4. GET /api/sopralluoghi - Lista sopralluoghi", 
                        f"Status {status}: Sopralluogo not found")
    
    # Step 5: Update checklist item
    success, data, status = make_request("PUT", f"/sopralluoghi/{sopralluogo_id}/checklist/1", 
                                        token=collab_token, data={
        "stato": "ok"
    })
    if success:
        results.add_pass("5. PUT /api/sopralluoghi/{id}/checklist/{item_id} - Aggiorna checklist")
    else:
        results.add_fail("5. PUT /api/sopralluoghi/{id}/checklist/{item_id} - Aggiorna checklist", 
                        f"Status {status}: {data}")
    
    # Step 6: Close sopralluogo
    success, data, status = make_request("POST", f"/sopralluoghi/{sopralluogo_id}/chiudi", 
                                        token=collab_token, data={
        "valutazione": "Buono",
        "note_finali": "Sopralluogo completato con successo"
    })
    if success:
        results.add_pass("6. POST /api/sopralluoghi/{id}/chiudi - Chiudi sopralluogo")
    else:
        results.add_fail("6. POST /api/sopralluoghi/{id}/chiudi - Chiudi sopralluogo", 
                        f"Status {status}: {data}")
    
    return {"collab_token": collab_token, "sopralluogo_id": sopralluogo_id}

def main():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}COMPREHENSIVE BACKEND REGRESSION TEST{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Run all test flows
    condomino_data = test_flusso_condomino()
    admin_data = test_flusso_admin(condomino_data)
    fornitore_data = test_flusso_fornitore(admin_data, condomino_data)
    collaboratore_data = test_flusso_collaboratore(admin_data)
    
    # Print summary
    success = results.summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
