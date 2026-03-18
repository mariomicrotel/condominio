#!/usr/bin/env python3
"""
Backend API Testing Script for Enriched Condominio Schema and XLS Import
Test focus: POST/PUT/GET /api/condomini and POST /api/admin/condomini/import
"""

import requests
import os
import json
from pathlib import Path

# Configuration
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://property-manager-208.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test data
ADMIN_CREDS = {"email": "admin@tardugno.it", "password": "admin123"}

def test_condominio_enriched_schema_and_import():
    """Test the enriched Condominio schema and XLS import endpoint."""
    
    print(f"🔧 Testing Backend API at: {API_BASE}")
    print("=" * 80)
    
    # Step 1: Admin login
    print("1. Admin login: POST /api/auth/login")
    try:
        login_response = requests.post(f"{API_BASE}/auth/login", json=ADMIN_CREDS, timeout=10)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return
            
        login_data = login_response.json()
        admin_token = login_data.get("token") or login_data.get("access_token")
        if not admin_token:
            print(f"   ❌ FAILED: No token in response")
            print(f"   Response: {login_data}")
            return
            
        print(f"   ✅ SUCCESS: Admin logged in, token obtained")
        headers = {"Authorization": f"Bearer {admin_token}"}
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 2: POST /api/condomini (admin token) - Create a condominio with ALL new fields
    print("\n2. POST /api/condomini (admin token) - Create condominio with ALL new fields")
    new_condominio = {
        "tipo": "Condominio",
        "nome": "Test Palazzo Verde",
        "indirizzo": "Via Roma 10",
        "cap": "84121",
        "citta": "Salerno",
        "provincia": "SA",
        "codice_fiscale": "90012345678",
        "data_apertura_esercizio": "01/01/2024",
        "data_costruzione": "15/03/1985",
        "data_inizio_incarico": "01/01/2023",
        "data_fine_incarico": "31/12/2025",
        "banca": "Banca Intesa Sanpaolo",
        "iban": "IT60X0542811101000000123456",
        "swift": "BCITITMM",
        "dati_catastali": "Comune catastale H703, Fg. 35, Part. 511",
        "note": "Test condominio"
    }
    
    try:
        create_response = requests.post(f"{API_BASE}/condomini", json=new_condominio, headers=headers, timeout=10)
        print(f"   Status: {create_response.status_code}")
        
        if create_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {create_response.status_code}")
            print(f"   Response: {create_response.text}")
            return
            
        created_cond = create_response.json()
        condominio_id = created_cond.get("id")
        if not condominio_id:
            print(f"   ❌ FAILED: No id in response")
            print(f"   Response: {created_cond}")
            return
            
        # Verify all fields are returned in the response
        required_fields = [
            "tipo", "nome", "indirizzo", "cap", "citta", "provincia", "codice_fiscale",
            "data_apertura_esercizio", "data_costruzione", "data_inizio_incarico", 
            "data_fine_incarico", "banca", "iban", "swift", "dati_catastali", "note"
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in created_cond:
                missing_fields.append(field)
                
        if missing_fields:
            print(f"   ❌ FAILED: Missing fields in response: {missing_fields}")
            return
            
        print(f"   ✅ SUCCESS: Condominio created with ID {condominio_id}")
        print(f"   ✅ All required fields present in response")
        
        # Verify specific field values
        for field, expected_value in new_condominio.items():
            actual_value = created_cond.get(field)
            if actual_value != expected_value:
                print(f"   ❌ FAILED: Field '{field}' mismatch. Expected: '{expected_value}', Got: '{actual_value}'")
                return
                
        print(f"   ✅ All field values match expected values")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 3: GET /api/condomini (admin token) - Verify the new condominio appears with all fields
    print("\n3. GET /api/condomini (admin token) - Verify new condominio appears with all fields")
    try:
        list_response = requests.get(f"{API_BASE}/condomini", headers=headers, timeout=10)
        print(f"   Status: {list_response.status_code}")
        
        if list_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {list_response.status_code}")
            print(f"   Response: {list_response.text}")
            return
            
        condomini_list = list_response.json()
        if not isinstance(condomini_list, list):
            print(f"   ❌ FAILED: Expected list, got {type(condomini_list)}")
            return
            
        # Find our condominio
        our_cond = None
        for cond in condomini_list:
            if cond.get("id") == condominio_id:
                our_cond = cond
                break
                
        if not our_cond:
            print(f"   ❌ FAILED: Condominio {condominio_id} not found in list")
            return
            
        print(f"   ✅ SUCCESS: Condominio found in list")
        
        # Verify all fields are present
        for field in required_fields:
            if field not in our_cond:
                print(f"   ❌ FAILED: Field '{field}' missing from list response")
                return
                
        print(f"   ✅ All required fields present in list response")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 4: PUT /api/condomini/{id} (admin token) - Update the condominio
    print(f"\n4. PUT /api/condomini/{condominio_id} (admin token) - Update condominio")
    update_data = {
        "tipo": "Condominio",
        "nome": "Test Palazzo Verde UPDATED",
        "indirizzo": "Via Roma 10",
        "cap": "84121",
        "citta": "Salerno",
        "provincia": "SA",
        "codice_fiscale": "90012345678",
        "data_apertura_esercizio": "01/01/2024",
        "data_costruzione": "15/03/1985",
        "data_inizio_incarico": "01/01/2023",
        "data_fine_incarico": "31/12/2025",
        "banca": "Unicredit",
        "iban": "IT60X0542811101000000123456",
        "swift": "BCITITMM",
        "dati_catastali": "Comune catastale H703, Fg. 35, Part. 511",
        "note": "Test condominio"
    }
    
    try:
        update_response = requests.put(f"{API_BASE}/condomini/{condominio_id}", json=update_data, headers=headers, timeout=10)
        print(f"   Status: {update_response.status_code}")
        
        if update_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {update_response.status_code}")
            print(f"   Response: {update_response.text}")
            return
            
        updated_cond = update_response.json()
        print(f"   ✅ SUCCESS: Condominio updated")
        
        # Verify changes
        if updated_cond.get("nome") != "Test Palazzo Verde UPDATED":
            print(f"   ❌ FAILED: Nome not updated. Expected: 'Test Palazzo Verde UPDATED', Got: '{updated_cond.get('nome')}'")
            return
            
        if updated_cond.get("banca") != "Unicredit":
            print(f"   ❌ FAILED: Banca not updated. Expected: 'Unicredit', Got: '{updated_cond.get('banca')}'")
            return
            
        print(f"   ✅ Changes verified: nome and banca updated correctly")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 5: GET /api/condomini (admin token) - Verify changes saved
    print(f"\n5. GET /api/condomini (admin token) - Verify changes saved")
    try:
        verify_response = requests.get(f"{API_BASE}/condomini", headers=headers, timeout=10)
        print(f"   Status: {verify_response.status_code}")
        
        if verify_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {verify_response.status_code}")
            return
            
        condomini_list = verify_response.json()
        
        # Find our updated condominio
        updated_cond = None
        for cond in condomini_list:
            if cond.get("id") == condominio_id:
                updated_cond = cond
                break
                
        if not updated_cond:
            print(f"   ❌ FAILED: Condominio {condominio_id} not found")
            return
            
        # Verify changes persisted
        if updated_cond.get("nome") != "Test Palazzo Verde UPDATED":
            print(f"   ❌ FAILED: Nome change not persisted")
            return
            
        if updated_cond.get("banca") != "Unicredit":
            print(f"   ❌ FAILED: Banca change not persisted")
            return
            
        print(f"   ✅ SUCCESS: Changes persisted correctly")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 6: POST /api/admin/condomini/import (admin token) - Upload XLS file
    print("\n6. POST /api/admin/condomini/import (admin token) - Upload XLS file")
    try:
        xls_file_path = "/tmp/condominielenco_template.xls"
        if not os.path.exists(xls_file_path):
            print(f"   ❌ FAILED: XLS file not found at {xls_file_path}")
            return
            
        with open(xls_file_path, "rb") as f:
            files = {"file": ("condominielenco_template.xls", f, "application/vnd.ms-excel")}
            import_response = requests.post(f"{API_BASE}/admin/condomini/import", files=files, headers=headers, timeout=30)
            
        print(f"   Status: {import_response.status_code}")
        
        if import_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {import_response.status_code}")
            print(f"   Response: {import_response.text}")
            return
            
        import_data = import_response.json()
        print(f"   Response: {json.dumps(import_data, indent=2)}")
        
        # Verify response structure
        required_response_fields = ["message", "righe_elaborate", "creati", "aggiornati"]
        for field in required_response_fields:
            if field not in import_data:
                print(f"   ❌ FAILED: Missing field '{field}' in import response")
                return
                
        righe_elaborate = import_data.get("righe_elaborate", 0)
        creati = import_data.get("creati", 0)
        aggiornati = import_data.get("aggiornati", 0)
        
        if righe_elaborate <= 0:
            print(f"   ❌ FAILED: No rows processed (righe_elaborate: {righe_elaborate})")
            return
            
        if creati <= 0 and aggiornati <= 0:
            print(f"   ❌ FAILED: No condominiums created or updated (creati: {creati}, aggiornati: {aggiornati})")
            return
            
        print(f"   ✅ SUCCESS: Import completed successfully")
        print(f"   - Righe elaborate: {righe_elaborate}")
        print(f"   - Creati: {creati}")
        print(f"   - Aggiornati: {aggiornati}")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 7: GET /api/condomini (admin token) - Verify new condominiums from XLS are present
    print("\n7. GET /api/condomini (admin token) - Verify new condominiums from XLS are present")
    try:
        final_list_response = requests.get(f"{API_BASE}/condomini", headers=headers, timeout=10)
        print(f"   Status: {final_list_response.status_code}")
        
        if final_list_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {final_list_response.status_code}")
            return
            
        final_condomini = final_list_response.json()
        
        # Count total condominiums (should be more than before)
        print(f"   Total condominiums after import: {len(final_condomini)}")
        
        # Look for some expected condominio names that should be in the template
        # We don't know exact names, but check that we have at least some new ones
        if len(final_condomini) <= 1:  # Should have more than just our test one
            print(f"   ❌ FAILED: Expected more condominiums after import, got {len(final_condomini)}")
            return
            
        print(f"   ✅ SUCCESS: Condominiums from XLS import are present")
        
        # Show sample of imported condominiums (excluding our test one)
        imported_conds = [c for c in final_condomini if c.get("id") != condominio_id]
        print(f"   Sample of imported condominiums:")
        for i, cond in enumerate(imported_conds[:3]):
            print(f"     - {cond.get('nome', 'N/A')} ({cond.get('citta', 'N/A')})")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 8: Test with invalid file type - POST /api/admin/condomini/import with a .txt file
    print("\n8. Test invalid file format - POST /api/admin/condomini/import with .txt file")
    try:
        # Create a temporary text file
        with open("/tmp/test_invalid.txt", "w") as f:
            f.write("This is not a valid XLS/CSV file")
            
        with open("/tmp/test_invalid.txt", "rb") as f:
            files = {"file": ("test_invalid.txt", f, "text/plain")}
            invalid_response = requests.post(f"{API_BASE}/admin/condomini/import", files=files, headers=headers, timeout=10)
            
        print(f"   Status: {invalid_response.status_code}")
        
        if invalid_response.status_code != 400:
            print(f"   ❌ FAILED: Expected 400, got {invalid_response.status_code}")
            print(f"   Response: {invalid_response.text}")
            return
            
        error_data = invalid_response.json()
        error_message = error_data.get("detail", "")
        
        if "Formato non supportato" not in error_message:
            print(f"   ❌ FAILED: Expected 'Formato non supportato' in error message")
            print(f"   Got: {error_message}")
            return
            
        print(f"   ✅ SUCCESS: Invalid file format correctly rejected")
        print(f"   Error message: {error_message}")
        
        # Clean up
        os.remove("/tmp/test_invalid.txt")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    print("\n" + "=" * 80)
    print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    print("✅ Enriched Condominio schema working correctly")
    print("✅ XLS import functionality working correctly")
    print("✅ Error handling for invalid formats working correctly")

if __name__ == "__main__":
    test_condominio_enriched_schema_and_import()