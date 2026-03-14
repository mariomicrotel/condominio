#!/usr/bin/env python3
"""
Backend API Testing for Sopralluoghi Module
Tests the complete sopralluoghi workflow as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://condo-manager-40.preview.emergentagent.com/api"

def log_step(step_num, description, success=True):
    """Log test step with status"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"Step {step_num}: {description} - {status}")

def log_error(step_num, error_msg):
    """Log error details"""
    print(f"   ERROR: {error_msg}")

def test_sopralluoghi_workflow():
    """Test the complete sopralluoghi workflow"""
    print("=" * 60)
    print("TESTING SOPRALLUOGHI MODULE WORKFLOW")
    print("=" * 60)
    
    admin_token = None
    collaboratore_token = None
    condominio_id = None
    sopralluogo_id = None
    checklist_items = []
    
    try:
        # Step 1: Reset database
        print("\n1. Resetting database...")
        response = requests.post(f"{BACKEND_URL}/seed")
        if response.status_code == 200:
            log_step(1, "POST /api/seed - Reset database")
        else:
            log_step(1, f"POST /api/seed failed - Status: {response.status_code}", False)
            log_error(1, response.text)
            return False
        
        # Step 2: Admin login
        print("\n2. Admin login...")
        login_data = {
            "email": "admin@tardugno.it",
            "password": "admin123"
        }
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            admin_token = response.json()["token"]
            log_step(2, "POST /api/auth/login (admin) - Get admin token")
        else:
            log_step(2, f"Admin login failed - Status: {response.status_code}", False)
            log_error(2, response.text)
            return False
        
        # Step 3: Create collaboratore
        print("\n3. Creating collaboratore...")
        collab_data = {
            "nome": "Marco",
            "cognome": "Verdi", 
            "email": "marco.verdi@studio.it",
            "password": "Collab123!",
            "telefono": "+39 333 9876543",
            "qualifica": "Geometra",
            "stato": "Attivo"
        }
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BACKEND_URL}/admin/collaboratori", json=collab_data, headers=headers)
        if response.status_code == 200:
            collaboratore_data = response.json()
            log_step(3, "POST /api/admin/collaboratori - Create collaboratore")
            print(f"   Created collaboratore: {collaboratore_data['nome']} {collaboratore_data['cognome']}")
        else:
            log_step(3, f"Create collaboratore failed - Status: {response.status_code}", False)
            log_error(3, response.text)
            return False
        
        # Step 4: Verify collaboratore appears in list
        print("\n4. Verifying collaboratore in list...")
        response = requests.get(f"{BACKEND_URL}/admin/collaboratori", headers=headers)
        if response.status_code == 200:
            collaboratori = response.json()
            found = any(c["email"] == "marco.verdi@studio.it" for c in collaboratori)
            if found:
                log_step(4, "GET /api/admin/collaboratori - Verify collaboratore appears")
            else:
                log_step(4, "Collaboratore not found in list", False)
                return False
        else:
            log_step(4, f"Get collaboratori failed - Status: {response.status_code}", False)
            log_error(4, response.text)
            return False
        
        # Step 5: Collaboratore login
        print("\n5. Collaboratore login...")
        collab_login_data = {
            "email": "marco.verdi@studio.it",
            "password": "Collab123!"
        }
        response = requests.post(f"{BACKEND_URL}/collaboratore/login", json=collab_login_data)
        if response.status_code == 200:
            collaboratore_token = response.json()["token"]
            log_step(5, "POST /api/collaboratore/login - Get collaboratore token")
        else:
            log_step(5, f"Collaboratore login failed - Status: {response.status_code}", False)
            log_error(5, response.text)
            return False
        
        # Step 6: Get condominio_id
        print("\n6. Getting condominio ID...")
        response = requests.get(f"{BACKEND_URL}/condomini", headers=headers)
        if response.status_code == 200:
            condomini = response.json()
            if condomini:
                condominio_id = condomini[0]["id"]
                log_step(6, f"GET /api/condomini - Got condominio_id: {condominio_id}")
            else:
                log_step(6, "No condomini found", False)
                return False
        else:
            log_step(6, f"Get condomini failed - Status: {response.status_code}", False)
            log_error(6, response.text)
            return False
        
        # Step 7: Create sopralluogo
        print("\n7. Creating sopralluogo...")
        sopralluogo_data = {
            "condominio_id": condominio_id,
            "data": "2026-03-14",
            "ora_inizio": "09:30",
            "motivo": "Controllo periodico",
            "note_generali": "Sopralluogo trimestrale"
        }
        # Use collaboratore token for creation
        collab_headers = {"Authorization": f"Bearer {collaboratore_token}"}
        response = requests.post(f"{BACKEND_URL}/sopralluoghi", json=sopralluogo_data, headers=collab_headers)
        if response.status_code == 200:
            sopralluogo = response.json()
            sopralluogo_id = sopralluogo["id"]
            log_step(7, f"POST /api/sopralluoghi - Created sopralluogo ID: {sopralluogo_id}")
        else:
            log_step(7, f"Create sopralluogo failed - Status: {response.status_code}", False)
            log_error(7, response.text)
            return False
        
        # Step 8: Verify sopralluogo appears with checklist summary
        print("\n8. Verifying sopralluogo in list...")
        response = requests.get(f"{BACKEND_URL}/sopralluoghi", headers=collab_headers)
        if response.status_code == 200:
            sopralluoghi = response.json()
            found_sop = None
            for sop in sopralluoghi:
                if sop["id"] == sopralluogo_id:
                    found_sop = sop
                    break
            
            if found_sop:
                log_step(8, "GET /api/sopralluoghi - Verify sopralluogo appears with checklist summary")
                print(f"   Checklist summary: OK={found_sop.get('checklist_ok', 0)}, Anomalie={found_sop.get('checklist_anomalie', 0)}, Non controllato={found_sop.get('checklist_non_controllato', 0)}")
            else:
                log_step(8, "Sopralluogo not found in list", False)
                return False
        else:
            log_step(8, f"Get sopralluoghi failed - Status: {response.status_code}", False)
            log_error(8, response.text)
            return False
        
        # Step 9: Get full sopralluogo details with 25 checklist items
        print("\n9. Getting sopralluogo details...")
        response = requests.get(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}", headers=collab_headers)
        if response.status_code == 200:
            sop_detail = response.json()
            checklist_items = sop_detail.get("checklist", [])
            if len(checklist_items) == 25:
                log_step(9, f"GET /api/sopralluoghi/{sopralluogo_id} - Got full details with 25 checklist items")
                print(f"   Checklist items count: {len(checklist_items)}")
            else:
                log_step(9, f"Expected 25 checklist items, got {len(checklist_items)}", False)
                return False
        else:
            log_step(9, f"Get sopralluogo detail failed - Status: {response.status_code}", False)
            log_error(9, response.text)
            return False
        
        # Step 10: Mark first item as "ok"
        print("\n10. Marking first checklist item as 'ok'...")
        if checklist_items:
            first_item_id = checklist_items[0]["id"]
            update_data = {"stato": "ok"}
            response = requests.put(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}/checklist/{first_item_id}", 
                                  json=update_data, headers=collab_headers)
            if response.status_code == 200:
                log_step(10, f"PUT /api/sopralluoghi/{sopralluogo_id}/checklist/{first_item_id} - Mark first item as 'ok'")
            else:
                log_step(10, f"Update checklist item failed - Status: {response.status_code}", False)
                log_error(10, response.text)
                return False
        else:
            log_step(10, "No checklist items available", False)
            return False
        
        # Step 11: Mark second item as "anomalia"
        print("\n11. Marking second checklist item as 'anomalia'...")
        if len(checklist_items) > 1:
            second_item_id = checklist_items[1]["id"]
            update_data = {"stato": "anomalia"}
            response = requests.put(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}/checklist/{second_item_id}", 
                                  json=update_data, headers=collab_headers)
            if response.status_code == 200:
                log_step(11, f"PUT /api/sopralluoghi/{sopralluogo_id}/checklist/{second_item_id} - Mark second item as 'anomalia'")
            else:
                log_step(11, f"Update checklist item failed - Status: {response.status_code}", False)
                log_error(11, response.text)
                return False
        else:
            log_step(11, "Second checklist item not available", False)
            return False
        
        # Step 12: Create anomalia for second item
        print("\n12. Creating anomalia for second item...")
        anomalia_data = {
            "descrizione": "Lampada fulminata al terzo piano",
            "gravita": "Moderata",
            "foto_ids": [],
            "apri_segnalazione": False
        }
        response = requests.post(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}/checklist/{second_item_id}/anomalia", 
                               json=anomalia_data, headers=collab_headers)
        if response.status_code == 200:
            log_step(12, f"POST /api/sopralluoghi/{sopralluogo_id}/checklist/{second_item_id}/anomalia - Create anomalia")
        else:
            log_step(12, f"Create anomalia failed - Status: {response.status_code}", False)
            log_error(12, response.text)
            return False
        
        # Step 13: Verify checklist states and anomalia details
        print("\n13. Verifying checklist states and anomalia...")
        response = requests.get(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}", headers=collab_headers)
        if response.status_code == 200:
            sop_detail = response.json()
            checklist = sop_detail.get("checklist", [])
            
            # Check first item is "ok"
            first_ok = checklist[0]["stato"] == "ok" if checklist else False
            # Check second item is "anomalia" and has anomalia details
            second_anomalia = False
            has_anomalia_details = False
            if len(checklist) > 1:
                second_anomalia = checklist[1]["stato"] == "anomalia"
                has_anomalia_details = "anomalia" in checklist[1] and checklist[1]["anomalia"].get("descrizione") == "Lampada fulminata al terzo piano"
            
            if first_ok and second_anomalia and has_anomalia_details:
                log_step(13, "GET /api/sopralluoghi/{id} - Verify checklist states and anomalia details")
                print(f"   First item: {checklist[0]['stato']}")
                print(f"   Second item: {checklist[1]['stato']} with anomalia: {checklist[1].get('anomalia', {}).get('descrizione', 'N/A')}")
            else:
                log_step(13, f"Checklist verification failed - First OK: {first_ok}, Second anomalia: {second_anomalia}, Has details: {has_anomalia_details}", False)
                return False
        else:
            log_step(13, f"Get sopralluogo detail failed - Status: {response.status_code}", False)
            log_error(13, response.text)
            return False
        
        # Step 14: Close sopralluogo
        print("\n14. Closing sopralluogo...")
        close_data = {
            "valutazione": "Discreto",
            "note_finali": "Controllo completato"
        }
        response = requests.post(f"{BACKEND_URL}/sopralluoghi/{sopralluogo_id}/chiudi", 
                               json=close_data, headers=collab_headers)
        if response.status_code == 200:
            log_step(14, f"POST /api/sopralluoghi/{sopralluogo_id}/chiudi - Close sopralluogo")
        else:
            log_step(14, f"Close sopralluogo failed - Status: {response.status_code}", False)
            log_error(14, response.text)
            return False
        
        # Step 15: Verify stato="completato"
        print("\n15. Verifying sopralluogo is completed...")
        response = requests.get(f"{BACKEND_URL}/sopralluoghi", headers=collab_headers)
        if response.status_code == 200:
            sopralluoghi = response.json()
            completed_sop = None
            for sop in sopralluoghi:
                if sop["id"] == sopralluogo_id:
                    completed_sop = sop
                    break
            
            if completed_sop and completed_sop.get("stato") == "completato":
                log_step(15, "GET /api/sopralluoghi - Verify stato='completato'")
                print(f"   Sopralluogo stato: {completed_sop['stato']}")
            else:
                log_step(15, f"Sopralluogo not completed - Status: {completed_sop.get('stato') if completed_sop else 'Not found'}", False)
                return False
        else:
            log_step(15, f"Get sopralluoghi failed - Status: {response.status_code}", False)
            log_error(15, response.text)
            return False
        
        print("\n" + "=" * 60)
        print("✅ ALL SOPRALLUOGHI WORKFLOW TESTS PASSED!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_sopralluoghi_workflow()
    sys.exit(0 if success else 1)