#!/usr/bin/env python3
"""
Backend API Testing for Studio Tardugno & Bonifacio
Focus: Admin create/edit segnalazioni endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://backend-refactor-86.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def log_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def log_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.ENDC}")

def log_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.ENDC}")

def test_admin_segnalazioni_endpoints():
    """Test the NEW admin create/edit segnalazioni endpoints"""
    
    print(f"\n{Colors.BOLD}=== TESTING ADMIN CREATE/EDIT SEGNALAZIONI ENDPOINTS ==={Colors.ENDC}")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Step 1: Seed data
    log_info("Step 1: Setting up seed data...")
    try:
        response = requests.post(f"{API_BASE}/seed")
        if response.status_code == 200:
            log_success("Seed data setup successful")
            seed_data = response.json()
            print(f"  Admin credentials: {seed_data.get('admin', {})}")
        else:
            log_warning(f"Seed endpoint returned {response.status_code} - may already exist")
    except Exception as e:
        log_error(f"Failed to seed data: {e}")
        return False
    
    # Step 2: Admin login
    log_info("Step 2: Admin login...")
    try:
        login_data = {
            "email": "admin@tardugno.it",
            "password": "admin123"
        }
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            admin_token = auth_data["token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            log_success("Admin login successful")
        else:
            log_error(f"Admin login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Admin login error: {e}")
        return False
    
    # Step 3: Get condomini list to get a condominio_id
    log_info("Step 3: Getting condomini list...")
    try:
        response = requests.get(f"{API_BASE}/condomini", headers=admin_headers)
        if response.status_code == 200:
            condomini = response.json()
            if condomini:
                condominio_id = condomini[0]["id"]
                condominio_nome = condomini[0]["nome"]
                log_success(f"Got condominio: {condominio_nome} (ID: {condominio_id})")
            else:
                log_error("No condomini found")
                return False
        else:
            log_error(f"Failed to get condomini: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Error getting condomini: {e}")
        return False
    
    # Step 4: Create new segnalazione via admin endpoint
    log_info("Step 4: Creating segnalazione via admin endpoint...")
    try:
        create_data = {
            "condominio_id": condominio_id,
            "tipologia": "Guasto idraulico",
            "descrizione": "Test segnalazione creata dall'admin",
            "urgenza": "Alta",
            "note_admin": "Nota interna admin",
            "allegati": []
        }
        response = requests.post(f"{API_BASE}/admin/segnalazioni", json=create_data, headers=admin_headers)
        if response.status_code == 200:
            created_seg = response.json()
            seg_id = created_seg["id"]
            protocollo = created_seg.get("protocollo", "N/A")
            stato = created_seg.get("stato", "N/A")
            log_success(f"Segnalazione created successfully")
            print(f"  ID: {seg_id}")
            print(f"  Protocollo: {protocollo}")
            print(f"  Stato: {stato}")
            
            # Verify required fields
            if created_seg.get("protocollo") and created_seg.get("id") and created_seg.get("stato") == "Inviata":
                log_success("All required fields present (protocollo, id, stato='Inviata')")
            else:
                log_error("Missing required fields in response")
                return False
        else:
            log_error(f"Failed to create segnalazione: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Error creating segnalazione: {e}")
        return False
    
    # Step 5: Verify segnalazione appears in admin list
    log_info("Step 5: Verifying segnalazione appears in admin list...")
    try:
        response = requests.get(f"{API_BASE}/admin/segnalazioni", headers=admin_headers)
        if response.status_code == 200:
            segnalazioni = response.json()
            found_seg = None
            for seg in segnalazioni:
                if seg["id"] == seg_id:
                    found_seg = seg
                    break
            
            if found_seg:
                log_success("Segnalazione found in admin list")
                print(f"  Tipologia: {found_seg.get('tipologia')}")
                print(f"  Descrizione: {found_seg.get('descrizione')}")
                print(f"  Urgenza: {found_seg.get('urgenza')}")
            else:
                log_error("Segnalazione not found in admin list")
                return False
        else:
            log_error(f"Failed to get admin segnalazioni: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Error getting admin segnalazioni: {e}")
        return False
    
    # Step 6: Update segnalazione via admin endpoint
    log_info("Step 6: Updating segnalazione via admin endpoint...")
    try:
        update_data = {
            "tipologia": "Guasto elettrico",
            "descrizione": "Descrizione modificata dall'admin",
            "urgenza": "Urgente",
            "note_admin": "Nota aggiornata",
            "allegati": []
        }
        response = requests.put(f"{API_BASE}/admin/segnalazioni/{seg_id}", json=update_data, headers=admin_headers)
        if response.status_code == 200:
            updated_seg = response.json()
            log_success("Segnalazione updated successfully")
            print(f"  New Tipologia: {updated_seg.get('tipologia')}")
            print(f"  New Descrizione: {updated_seg.get('descrizione')}")
            print(f"  New Urgenza: {updated_seg.get('urgenza')}")
            print(f"  New Note Admin: {updated_seg.get('note_admin')}")
        else:
            log_error(f"Failed to update segnalazione: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Error updating segnalazione: {e}")
        return False
    
    # Step 7: Verify changes are persisted
    log_info("Step 7: Verifying changes are persisted...")
    try:
        response = requests.get(f"{API_BASE}/admin/segnalazioni", headers=admin_headers)
        if response.status_code == 200:
            segnalazioni = response.json()
            found_seg = None
            for seg in segnalazioni:
                if seg["id"] == seg_id:
                    found_seg = seg
                    break
            
            if found_seg:
                # Check if all updates were persisted
                expected_values = {
                    "tipologia": "Guasto elettrico",
                    "descrizione": "Descrizione modificata dall'admin",
                    "urgenza": "Urgente",
                    "note_admin": "Nota aggiornata"
                }
                
                all_correct = True
                for field, expected in expected_values.items():
                    actual = found_seg.get(field)
                    if actual == expected:
                        log_success(f"✓ {field}: {actual}")
                    else:
                        log_error(f"✗ {field}: expected '{expected}', got '{actual}'")
                        all_correct = False
                
                if all_correct:
                    log_success("All changes persisted correctly")
                    return True
                else:
                    log_error("Some changes were not persisted correctly")
                    return False
            else:
                log_error("Updated segnalazione not found in list")
                return False
        else:
            log_error(f"Failed to verify changes: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Error verifying changes: {e}")
        return False

def main():
    """Main test runner"""
    print(f"{Colors.BOLD}Studio Tardugno & Bonifacio - Backend API Testing{Colors.ENDC}")
    print(f"Testing Admin Create/Edit Segnalazioni Endpoints")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    success = test_admin_segnalazioni_endpoints()
    
    print(f"\n{Colors.BOLD}=== TEST SUMMARY ==={Colors.ENDC}")
    if success:
        log_success("All tests passed! Admin create/edit segnalazioni endpoints are working correctly.")
        sys.exit(0)
    else:
        log_error("Some tests failed. Check the output above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()