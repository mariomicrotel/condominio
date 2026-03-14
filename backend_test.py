#!/usr/bin/env python3
"""
Test script for Portale Fornitori module - Full backend test
Testing all endpoints in the fornitore workflow
"""
import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env 
BASE_URL = "https://condo-manager-40.preview.emergentagent.com/api"

def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def test_endpoint(method, url, headers=None, data=None, expected_status=200, step_name=""):
    """Helper function to test endpoints with proper logging"""
    try:
        log(f"Step {step_name}: {method} {url}")
        
        response = requests.request(
            method=method, 
            url=url, 
            headers=headers or {}, 
            json=data,
            timeout=30
        )
        
        log(f"Response: {response.status_code}")
        
        if response.status_code != expected_status:
            log(f"❌ ERROR: Expected {expected_status}, got {response.status_code}")
            if response.text:
                log(f"Response text: {response.text}")
            return None
            
        try:
            result = response.json() if response.text else {}
            log(f"✅ SUCCESS: {step_name}")
            return result
        except json.JSONDecodeError:
            log(f"✅ SUCCESS: {step_name} (no JSON response)")
            return {}
            
    except Exception as e:
        log(f"❌ EXCEPTION in {step_name}: {str(e)}")
        return None

def main():
    """Test the complete Portale Fornitori workflow"""
    log("=== PORTALE FORNITORI BACKEND TEST ===")
    log(f"Testing against: {BASE_URL}")
    
    # Variables to store test data
    admin_token = None
    condomino_token = None
    fornitore_token = None
    fornitore_id = None
    password_temp = None
    segnalazione_id = None
    first_condo_id = None
    
    # Step 1: Seed demo data
    log("\n=== STEP 1: SETUP - SEED DATA ===")
    seed_result = test_endpoint("POST", f"{BASE_URL}/seed", step_name="1 - Seed Data")
    if not seed_result:
        log("❌ FAILED: Could not seed data")
        return False
    
    # Step 2: Login as Admin
    log("\n=== STEP 2: ADMIN LOGIN ===")
    admin_login_data = {
        "email": "admin@tardugno.it",
        "password": "admin123"
    }
    admin_login_result = test_endpoint("POST", f"{BASE_URL}/auth/login", 
                                     data=admin_login_data, step_name="2 - Admin Login")
    if not admin_login_result or "token" not in admin_login_result:
        log("❌ FAILED: Admin login failed")
        return False
    
    admin_token = admin_login_result["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    log(f"✅ Admin logged in successfully")
    
    # Step 3: Create a Fornitore
    log("\n=== STEP 3: CREATE FORNITORE ===")
    fornitore_data = {
        "ragione_sociale": "Idraulica Test Srl",
        "partita_iva": "12345678901",
        "settori": ["Idraulica", "Edilizia"],
        "telefono": "+39 333 9999999",
        "email": "fornitore.test@email.it",
        "indirizzo": "Via Roma 10, Salerno",
        "iban": "IT60X0542811101000000123456"
    }
    fornitore_result = test_endpoint("POST", f"{BASE_URL}/admin/fornitori", 
                                   headers=admin_headers, data=fornitore_data, step_name="3 - Create Fornitore")
    if not fornitore_result or "id" not in fornitore_result:
        log("❌ FAILED: Could not create fornitore")
        return False
        
    fornitore_id = fornitore_result["id"]
    password_temp = fornitore_result["password_temp"]
    log(f"✅ Fornitore created: ID={fornitore_id}, temp_password={password_temp}")
    
    # Step 4: List Fornitori
    log("\n=== STEP 4: LIST FORNITORI ===")
    fornitori_list = test_endpoint("GET", f"{BASE_URL}/admin/fornitori", 
                                  headers=admin_headers, step_name="4 - List Fornitori")
    if not fornitori_list or not isinstance(fornitori_list, list):
        log("❌ FAILED: Could not list fornitori")
        return False
        
    log(f"✅ Found {len(fornitori_list)} fornitori")
    found_our_fornitore = any(f.get("id") == fornitore_id for f in fornitori_list)
    if not found_our_fornitore:
        log("❌ ERROR: Our created fornitore not found in list")
        return False
    log(f"✅ Our fornitore found in the list")
    
    # Step 5: Login as Condomino & Create Segnalazione
    log("\n=== STEP 5: CONDOMINO LOGIN & CREATE SEGNALAZIONE ===")
    condomino_login_data = {
        "email": "mario.rossi@email.it",
        "password": "password123"
    }
    condomino_login_result = test_endpoint("POST", f"{BASE_URL}/auth/login", 
                                         data=condomino_login_data, step_name="5a - Condomino Login")
    if not condomino_login_result or "token" not in condomino_login_result:
        log("❌ FAILED: Condomino login failed")
        return False
        
    condomino_token = condomino_login_result["token"]
    condomino_headers = {"Authorization": f"Bearer {condomino_token}"}
    log(f"✅ Condomino logged in successfully")
    
    # Get first condominio ID
    condomini_result = test_endpoint("GET", f"{BASE_URL}/condomini", 
                                   headers=condomino_headers, step_name="5b - Get Condomini")
    if not condomini_result or not isinstance(condomini_result, list) or len(condomini_result) == 0:
        log("❌ FAILED: Could not get condomini")
        return False
        
    first_condo_id = condomini_result[0]["id"]
    log(f"✅ Found condominio: {first_condo_id}")
    
    # Create segnalazione
    segnalazione_data = {
        "condominio_id": first_condo_id,
        "qualita": "Proprietario",
        "tipologia": "Guasto idraulico",
        "descrizione": "Perdita acqua nel bagno comune",
        "urgenza": "Alta"
    }
    segnalazione_result = test_endpoint("POST", f"{BASE_URL}/segnalazioni", 
                                      headers=condomino_headers, data=segnalazione_data, step_name="5c - Create Segnalazione")
    if not segnalazione_result or "id" not in segnalazione_result:
        log("❌ FAILED: Could not create segnalazione")
        return False
        
    segnalazione_id = segnalazione_result["id"]
    log(f"✅ Segnalazione created: {segnalazione_id}")
    
    # Step 6: Admin Assigns Fornitore to Segnalazione
    log("\n=== STEP 6: ADMIN ASSIGNS FORNITORE ===")
    assign_data = {
        "fornitore_id": fornitore_id,
        "note_admin": "Verificare perdita urgente",
        "data_prevista": "20/03/2026"
    }
    assign_result = test_endpoint("POST", f"{BASE_URL}/admin/segnalazioni/{segnalazione_id}/assegna", 
                                headers=admin_headers, data=assign_data, step_name="6 - Assign Fornitore")
    if not assign_result:
        log("❌ FAILED: Could not assign fornitore to segnalazione")
        return False
        
    log(f"✅ Fornitore assigned to segnalazione successfully")
    
    # Step 7: Login as Fornitore
    log("\n=== STEP 7: FORNITORE LOGIN ===")
    fornitore_login_data = {
        "email": "fornitore.test@email.it",
        "password": password_temp
    }
    fornitore_login_result = test_endpoint("POST", f"{BASE_URL}/auth/login", 
                                         data=fornitore_login_data, step_name="7 - Fornitore Login")
    if not fornitore_login_result or "token" not in fornitore_login_result:
        log("❌ FAILED: Fornitore login failed")
        return False
        
    fornitore_token = fornitore_login_result["token"]
    fornitore_headers = {"Authorization": f"Bearer {fornitore_token}"}
    log(f"✅ Fornitore logged in successfully")
    
    # Step 8: Fornitore Dashboard
    log("\n=== STEP 8: FORNITORE DASHBOARD ===")
    dashboard_result = test_endpoint("GET", f"{BASE_URL}/fornitore/dashboard", 
                                   headers=fornitore_headers, step_name="8 - Fornitore Dashboard")
    if not dashboard_result or "totale" not in dashboard_result:
        log("❌ FAILED: Could not get fornitore dashboard")
        return False
        
    log(f"✅ Dashboard stats: total={dashboard_result.get('totale')}, da_eseguire={dashboard_result.get('da_eseguire')}")
    
    # Verify we have at least 1 intervention
    if dashboard_result.get("totale", 0) == 0:
        log("❌ ERROR: Dashboard shows 0 total interventions")
        return False
        
    # Step 9: Fornitore List Interventions
    log("\n=== STEP 9: FORNITORE INTERVENTIONS LIST ===")
    interventi_result = test_endpoint("GET", f"{BASE_URL}/fornitore/interventi", 
                                    headers=fornitore_headers, step_name="9 - List Interventions")
    if not interventi_result or not isinstance(interventi_result, list):
        log("❌ FAILED: Could not get fornitore interventions")
        return False
        
    log(f"✅ Found {len(interventi_result)} interventions")
    if len(interventi_result) == 0:
        log("❌ ERROR: No interventions found for fornitore")
        return False
        
    # Verify our segnalazione is in the list
    found_our_segnalazione = any(i.get("id") == segnalazione_id for i in interventi_result)
    if not found_our_segnalazione:
        log("❌ ERROR: Our segnalazione not found in fornitore interventions")
        return False
    log(f"✅ Our segnalazione found in interventions list")
    
    # Step 10: Fornitore Gets Intervention Detail
    log("\n=== STEP 10: FORNITORE INTERVENTION DETAIL ===")
    detail_result = test_endpoint("GET", f"{BASE_URL}/fornitore/interventi/{segnalazione_id}", 
                                headers=fornitore_headers, step_name="10 - Intervention Detail")
    if not detail_result or detail_result.get("id") != segnalazione_id:
        log("❌ FAILED: Could not get intervention detail")
        return False
        
    log(f"✅ Intervention detail retrieved successfully")
    
    # Step 11: Fornitore Creates Rapportino
    log("\n=== STEP 11: FORNITORE CREATES RAPPORTINO ===")
    rapportino_data = {
        "data_intervento": "2026-03-13",
        "ora_inizio": "09:00",
        "ora_fine": "12:00",
        "descrizione_lavori": "Sostituzione tubo rotto e guarnizioni",
        "esito": "Risolto completamente",
        "materiali": "1 tubo PVC 50mm, 2 guarnizioni",
        "note": "Consiglio controllo periodico",
        "foto": []
    }
    rapportino_result = test_endpoint("POST", f"{BASE_URL}/fornitore/rapportino/{segnalazione_id}", 
                                    headers=fornitore_headers, data=rapportino_data, step_name="11 - Create Rapportino")
    if not rapportino_result:
        log("❌ FAILED: Could not create rapportino")
        return False
        
    log(f"✅ Rapportino created successfully")
    
    # Step 12: Admin Views Rapportino
    log("\n=== STEP 12: ADMIN VIEWS RAPPORTINO ===")
    admin_rapportino_result = test_endpoint("GET", f"{BASE_URL}/admin/segnalazioni/{segnalazione_id}/rapportino", 
                                          headers=admin_headers, step_name="12 - Admin View Rapportino")
    if not admin_rapportino_result:
        log("❌ FAILED: Admin could not view rapportino")
        return False
        
    log(f"✅ Admin viewed rapportino successfully")
    
    # Step 13: Admin Closes Segnalazione
    log("\n=== STEP 13: ADMIN CLOSES SEGNALAZIONE ===")
    close_result = test_endpoint("POST", f"{BASE_URL}/admin/segnalazioni/{segnalazione_id}/chiudi", 
                                headers=admin_headers, step_name="13 - Close Segnalazione")
    if not close_result:
        log("❌ FAILED: Could not close segnalazione")
        return False
        
    log(f"✅ Segnalazione closed successfully")
    
    # Step 14: Admin Reopens (test reopen flow)
    log("\n=== STEP 14: ADMIN REOPENS SEGNALAZIONE ===")
    reopen_result = test_endpoint("POST", f"{BASE_URL}/admin/segnalazioni/{segnalazione_id}/riapri", 
                                headers=admin_headers, step_name="14 - Reopen Segnalazione")
    if not reopen_result:
        log("❌ FAILED: Could not reopen segnalazione")
        return False
        
    log(f"✅ Segnalazione reopened successfully")
    
    # Step 15: Admin Timeline
    log("\n=== STEP 15: ADMIN TIMELINE ===")
    timeline_result = test_endpoint("GET", f"{BASE_URL}/admin/segnalazioni/{segnalazione_id}/timeline", 
                                  headers=admin_headers, step_name="15 - Get Timeline")
    if not timeline_result or not isinstance(timeline_result, list):
        log("❌ FAILED: Could not get timeline")
        return False
        
    log(f"✅ Timeline retrieved: {len(timeline_result)} events")
    
    # Step 16: Delete Fornitore
    log("\n=== STEP 16: DELETE FORNITORE ===")
    delete_result = test_endpoint("DELETE", f"{BASE_URL}/admin/fornitori/{fornitore_id}", 
                                headers=admin_headers, step_name="16 - Delete Fornitore")
    if not delete_result:
        log("❌ FAILED: Could not delete fornitore")
        return False
        
    log(f"✅ Fornitore deleted successfully")
    
    # Final summary
    log("\n" + "="*60)
    log("🎉 ALL PORTALE FORNITORI TESTS PASSED SUCCESSFULLY! 🎉")
    log("="*60)
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        log("\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        log(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)