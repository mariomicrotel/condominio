#!/usr/bin/env python3
"""
Backend API Testing for Studio Tardugno & Bonifacio
Testing Fase 2 endpoints with proper authentication and data flow.
"""

import requests
import json
import sys
import time
from typing import Dict, Optional

# Configuration
BASE_URL = "https://studio-condomini.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDS = {"email": "admin@tardugno.it", "password": "admin123"}
CONDOMINO_CREDS = {"email": "mario.rossi@email.it", "password": "password123"}

class TestClient:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.condomino_token = None
        self.mario_user_id = None
        self.condominio_id = None
        
    def log(self, message: str):
        print(f"[TEST] {message}")
        
    def error(self, message: str):
        print(f"[ERROR] {message}")
        
    def success(self, message: str):
        print(f"[SUCCESS] ✅ {message}")
        
    def authenticate(self) -> bool:
        """Authenticate both admin and condomino users"""
        try:
            # Admin login
            resp = self.session.post(f"{API_BASE}/auth/login", json=ADMIN_CREDS)
            if resp.status_code == 200:
                self.admin_token = resp.json()["token"]
                self.success("Admin authentication successful")
            else:
                self.error(f"Admin auth failed: {resp.status_code} - {resp.text}")
                return False
                
            # Condomino login  
            resp = self.session.post(f"{API_BASE}/auth/login", json=CONDOMINO_CREDS)
            if resp.status_code == 200:
                data = resp.json()
                self.condomino_token = data["token"]
                self.success("Condomino authentication successful")
            else:
                self.error(f"Condomino auth failed: {resp.status_code} - {resp.text}")
                return False
                
            return True
        except Exception as e:
            self.error(f"Authentication error: {e}")
            return False
    
    def seed_data(self) -> bool:
        """Seed initial data"""
        try:
            resp = self.session.post(f"{API_BASE}/seed")
            if resp.status_code == 200:
                self.success("Seed data loaded successfully")
                return True
            else:
                self.log(f"Seed response: {resp.status_code} - may already exist")
                return True
        except Exception as e:
            self.error(f"Seed error: {e}")
            return False
    
    def get_mario_info(self) -> bool:
        """Get Mario's user ID and condominio ID for testing"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            resp = self.session.get(f"{API_BASE}/admin/utenti", headers=headers)
            if resp.status_code == 200:
                users = resp.json()
                mario = next((u for u in users if u["email"] == "mario.rossi@email.it"), None)
                if mario and mario["associazioni"]:
                    self.mario_user_id = mario["id"]
                    self.condominio_id = mario["associazioni"][0]["condominio_id"]
                    self.success(f"Got Mario info: user_id={self.mario_user_id[:8]}..., cond_id={self.condominio_id[:8]}...")
                    return True
                else:
                    self.error("Mario user not found or not associated")
                    return False
            else:
                self.error(f"Failed to get users: {resp.status_code}")
                return False
        except Exception as e:
            self.error(f"Error getting Mario info: {e}")
            return False

    def test_config_endpoints(self) -> Dict[str, bool]:
        """Test admin config endpoints"""
        results = {}
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /api/admin/config
            self.log("Testing GET /api/admin/config")
            resp = self.session.get(f"{API_BASE}/admin/config", headers=headers)
            if resp.status_code == 200:
                config = resp.json()
                self.success(f"Admin config retrieved: {list(config.keys())}")
                results["get_admin_config"] = True
            else:
                self.error(f"GET admin config failed: {resp.status_code}")
                results["get_admin_config"] = False
            
            # Test PUT /api/admin/config  
            self.log("Testing PUT /api/admin/config")
            config_data = {
                "google_maps_api_key": "test_key_12345",
                "firebase_key": "test_fb_key", 
                "studio_telefono": "+39 089 999999",
                "studio_email": "test@studio.it",
                "studio_pec": "test@pec.it"
            }
            resp = self.session.put(f"{API_BASE}/admin/config", headers=headers, json=config_data)
            if resp.status_code == 200:
                self.success("Admin config updated successfully")
                results["put_admin_config"] = True
            else:
                self.error(f"PUT admin config failed: {resp.status_code} - {resp.text}")
                results["put_admin_config"] = False
                
            # Test GET /api/config/public (no auth)
            self.log("Testing GET /api/config/public")
            resp = self.session.get(f"{API_BASE}/config/public")
            if resp.status_code == 200:
                public_config = resp.json()
                self.success(f"Public config retrieved: {list(public_config.keys())}")
                results["get_public_config"] = True
            else:
                self.error(f"GET public config failed: {resp.status_code}")
                results["get_public_config"] = False
                
        except Exception as e:
            self.error(f"Config test error: {e}")
            results = {k: False for k in ["get_admin_config", "put_admin_config", "get_public_config"]}
            
        return results

    def test_notification_endpoints(self) -> Dict[str, bool]:
        """Test notification endpoints"""
        results = {}
        
        try:
            # First create a notification by creating a segnalazione as condomino
            self.log("Creating segnalazione to generate notification")
            condomino_headers = {"Authorization": f"Bearer {self.condomino_token}"}
            segnalazione_data = {
                "condominio_id": self.condominio_id,
                "qualita": "Proprietario",
                "tipologia": "Ascensore",
                "descrizione": "Test segnalazione per generare notifica",
                "urgenza": "Alta"
            }
            resp = self.session.post(f"{API_BASE}/segnalazioni", headers=condomino_headers, json=segnalazione_data)
            if resp.status_code == 200:
                self.success("Segnalazione created to generate notifications")
            else:
                self.log(f"Segnalazione creation response: {resp.status_code}")
            
            # Give time for notification to be created
            time.sleep(1)
            
            # Test GET /api/notifiche (condomino)
            self.log("Testing GET /api/notifiche")
            resp = self.session.get(f"{API_BASE}/notifiche", headers=condomino_headers)
            if resp.status_code == 200:
                notifiche = resp.json()
                self.success(f"Notifiche retrieved: {len(notifiche)} notifications")
                results["get_notifiche"] = True
                
                # Store a notification ID for testing mark as read
                notifica_id = notifiche[0]["id"] if notifiche else None
            else:
                self.error(f"GET notifiche failed: {resp.status_code}")
                results["get_notifiche"] = False
                notifica_id = None
                
            # Test GET /api/notifiche/count
            self.log("Testing GET /api/notifiche/count")
            resp = self.session.get(f"{API_BASE}/notifiche/count", headers=condomino_headers)
            if resp.status_code == 200:
                count = resp.json()
                self.success(f"Notification count retrieved: {count}")
                results["get_notifiche_count"] = True
            else:
                self.error(f"GET notifiche count failed: {resp.status_code}")
                results["get_notifiche_count"] = False
                
            # Test PUT /api/notifiche/{id}/letto
            if notifica_id:
                self.log(f"Testing PUT /api/notifiche/{notifica_id[:8]}.../letto")
                resp = self.session.put(f"{API_BASE}/notifiche/{notifica_id}/letto", headers=condomino_headers)
                if resp.status_code == 200:
                    self.success("Notification marked as read")
                    results["put_notifica_letto"] = True
                else:
                    self.error(f"PUT notifica letto failed: {resp.status_code}")
                    results["put_notifica_letto"] = False
            else:
                self.log("Skipping mark as read test - no notification ID")
                results["put_notifica_letto"] = False
                
            # Test PUT /api/notifiche/letto-tutte
            self.log("Testing PUT /api/notifiche/letto-tutte")
            resp = self.session.put(f"{API_BASE}/notifiche/letto-tutte", headers=condomino_headers)
            if resp.status_code == 200:
                self.success("All notifications marked as read")
                results["put_letto_tutte"] = True
            else:
                self.error(f"PUT letto tutte failed: {resp.status_code}")
                results["put_letto_tutte"] = False
                
        except Exception as e:
            self.error(f"Notification test error: {e}")
            results = {k: False for k in ["get_notifiche", "get_notifiche_count", "put_notifica_letto", "put_letto_tutte"]}
            
        return results

    def test_trasmissioni_endpoints(self) -> Dict[str, bool]:
        """Test trasmissioni endpoints"""
        results = {}
        
        try:
            condomino_headers = {"Authorization": f"Bearer {self.condomino_token}"}
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test POST /api/trasmissioni (condomino)
            self.log("Testing POST /api/trasmissioni")
            trasm_data = {
                "oggetto": "Test documento trasmissione",
                "condominio_id": self.condominio_id,
                "note": "Test note per trasmissione",
                "files": [{"filename": "test.pdf", "data": "dGVzdCBkYXRh"}]  # base64 encoded "test data"
            }
            resp = self.session.post(f"{API_BASE}/trasmissioni", headers=condomino_headers, json=trasm_data)
            if resp.status_code == 200:
                trasm = resp.json()
                trasm_id = trasm["id"]
                self.success(f"Trasmissione created: {trasm['oggetto']}")
                results["post_trasmissioni"] = True
            else:
                self.error(f"POST trasmissioni failed: {resp.status_code} - {resp.text}")
                results["post_trasmissioni"] = False
                trasm_id = None
                
            # Test GET /api/trasmissioni (condomino)
            self.log("Testing GET /api/trasmissioni")
            resp = self.session.get(f"{API_BASE}/trasmissioni", headers=condomino_headers)
            if resp.status_code == 200:
                trasmissioni = resp.json()
                self.success(f"Trasmissioni retrieved: {len(trasmissioni)} items")
                results["get_trasmissioni"] = True
            else:
                self.error(f"GET trasmissioni failed: {resp.status_code}")
                results["get_trasmissioni"] = False
                
            # Test GET /api/admin/trasmissioni (admin)
            self.log("Testing GET /api/admin/trasmissioni")
            resp = self.session.get(f"{API_BASE}/admin/trasmissioni", headers=admin_headers)
            if resp.status_code == 200:
                admin_trasmissioni = resp.json()
                self.success(f"Admin trasmissioni retrieved: {len(admin_trasmissioni)} items")
                results["get_admin_trasmissioni"] = True
            else:
                self.error(f"GET admin trasmissioni failed: {resp.status_code}")
                results["get_admin_trasmissioni"] = False
                
            # Test PUT /api/admin/trasmissioni/{id}?stato=Ricevuto (admin)
            if trasm_id:
                self.log(f"Testing PUT /api/admin/trasmissioni/{trasm_id[:8]}...?stato=Ricevuto")
                resp = self.session.put(f"{API_BASE}/admin/trasmissioni/{trasm_id}?stato=Ricevuto", headers=admin_headers)
                if resp.status_code == 200:
                    updated_trasm = resp.json()
                    self.success(f"Trasmissione status updated to: {updated_trasm.get('stato', 'Unknown')}")
                    results["put_admin_trasmissioni"] = True
                else:
                    self.error(f"PUT admin trasmissioni failed: {resp.status_code} - {resp.text}")
                    results["put_admin_trasmissioni"] = False
            else:
                self.log("Skipping trasmissioni update test - no trasmissione ID")
                results["put_admin_trasmissioni"] = False
                
        except Exception as e:
            self.error(f"Trasmissioni test error: {e}")
            results = {k: False for k in ["post_trasmissioni", "get_trasmissioni", "get_admin_trasmissioni", "put_admin_trasmissioni"]}
            
        return results

    def test_estratto_conto_endpoints(self) -> Dict[str, bool]:
        """Test estratto conto endpoints"""
        results = {}
        
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            condomino_headers = {"Authorization": f"Bearer {self.condomino_token}"}
            
            # Test POST /api/admin/estratto-conto (admin)
            self.log("Testing POST /api/admin/estratto-conto")
            estratto_data = {
                "user_id": self.mario_user_id,
                "condominio_id": self.condominio_id,
                "periodo": "Gen-Giu 2026",
                "quote_versate": 1500.00,
                "quote_da_versare": 2000.00,
                "scadenza": "30/06/2026",
                "saldo": -500.00,
                "note": "Rate pending for test"
            }
            resp = self.session.post(f"{API_BASE}/admin/estratto-conto", headers=admin_headers, json=estratto_data)
            if resp.status_code == 200:
                self.success("Estratto conto created/updated successfully")
                results["post_admin_estratto"] = True
            else:
                self.error(f"POST admin estratto-conto failed: {resp.status_code} - {resp.text}")
                results["post_admin_estratto"] = False
                
            # Test GET /api/estratto-conto (condomino)
            self.log("Testing GET /api/estratto-conto")
            resp = self.session.get(f"{API_BASE}/estratto-conto", headers=condomino_headers)
            if resp.status_code == 200:
                estratti = resp.json()
                self.success(f"Estratti conto retrieved: {len(estratti)} items")
                results["get_estratto_conto"] = True
            else:
                self.error(f"GET estratto-conto failed: {resp.status_code}")
                results["get_estratto_conto"] = False
                
            # Test GET /api/admin/estratti-conto (admin)
            self.log("Testing GET /api/admin/estratti-conto")
            resp = self.session.get(f"{API_BASE}/admin/estratti-conto", headers=admin_headers)
            if resp.status_code == 200:
                admin_estratti = resp.json()
                self.success(f"Admin estratti conto retrieved: {len(admin_estratti)} items")
                results["get_admin_estratti"] = True
            else:
                self.error(f"GET admin estratti-conto failed: {resp.status_code}")
                results["get_admin_estratti"] = False
                
        except Exception as e:
            self.error(f"Estratto conto test error: {e}")
            results = {k: False for k in ["post_admin_estratto", "get_estratto_conto", "get_admin_estratti"]}
            
        return results

    def test_csv_export_endpoints(self) -> Dict[str, bool]:
        """Test CSV export endpoints (admin only)"""
        results = {}
        
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /api/admin/export/segnalazioni
            self.log("Testing GET /api/admin/export/segnalazioni")
            resp = self.session.get(f"{API_BASE}/admin/export/segnalazioni", headers=admin_headers)
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("text/csv"):
                csv_content = resp.content.decode("utf-8-sig")
                lines = csv_content.split('\n')
                self.success(f"Segnalazioni CSV exported: {len(lines)} lines")
                results["export_segnalazioni"] = True
            else:
                self.error(f"Export segnalazioni failed: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
                results["export_segnalazioni"] = False
                
            # Test GET /api/admin/export/appuntamenti
            self.log("Testing GET /api/admin/export/appuntamenti")
            resp = self.session.get(f"{API_BASE}/admin/export/appuntamenti", headers=admin_headers)
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("text/csv"):
                csv_content = resp.content.decode("utf-8-sig")
                lines = csv_content.split('\n')
                self.success(f"Appuntamenti CSV exported: {len(lines)} lines")
                results["export_appuntamenti"] = True
            else:
                self.error(f"Export appuntamenti failed: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
                results["export_appuntamenti"] = False
                
            # Test GET /api/admin/export/utenti  
            self.log("Testing GET /api/admin/export/utenti")
            resp = self.session.get(f"{API_BASE}/admin/export/utenti", headers=admin_headers)
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("text/csv"):
                csv_content = resp.content.decode("utf-8-sig")
                lines = csv_content.split('\n')
                self.success(f"Utenti CSV exported: {len(lines)} lines")
                results["export_utenti"] = True
            else:
                self.error(f"Export utenti failed: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
                results["export_utenti"] = False
                
        except Exception as e:
            self.error(f"CSV export test error: {e}")
            results = {k: False for k in ["export_segnalazioni", "export_appuntamenti", "export_utenti"]}
            
        return results

    def test_existing_endpoints(self) -> Dict[str, bool]:
        """Quick test of existing endpoints for regression"""
        results = {}
        
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /api/admin/dashboard
            self.log("Testing GET /api/admin/dashboard")
            resp = self.session.get(f"{API_BASE}/admin/dashboard", headers=admin_headers)
            if resp.status_code == 200:
                dashboard = resp.json()
                self.success(f"Dashboard retrieved: {list(dashboard.keys())}")
                results["get_admin_dashboard"] = True
            else:
                self.error(f"GET admin dashboard failed: {resp.status_code}")
                results["get_admin_dashboard"] = False
                
            # Test GET /api/condomini
            self.log("Testing GET /api/condomini")
            resp = self.session.get(f"{API_BASE}/condomini", headers=admin_headers)
            if resp.status_code == 200:
                condomini = resp.json()
                self.success(f"Condomini retrieved: {len(condomini)} items")
                results["get_condomini"] = True
            else:
                self.error(f"GET condomini failed: {resp.status_code}")
                results["get_condomini"] = False
                
        except Exception as e:
            self.error(f"Existing endpoints test error: {e}")
            results = {k: False for k in ["get_admin_dashboard", "get_condomini"]}
            
        return results

def main():
    print("=== Studio Tardugno & Bonifacio Backend API Testing ===")
    print(f"Testing against: {BASE_URL}")
    print()
    
    client = TestClient()
    all_results = {}
    
    # Initialize
    if not client.seed_data():
        print("❌ Failed to seed data - exiting")
        return False
        
    if not client.authenticate():
        print("❌ Authentication failed - exiting")
        return False
        
    if not client.get_mario_info():
        print("❌ Failed to get Mario info - exiting")
        return False
    
    print("\n=== TESTING FASE 2 ENDPOINTS ===\n")
    
    # Test new Fase 2 endpoints
    print("1. Testing Config Endpoints")
    all_results.update(client.test_config_endpoints())
    
    print("\n2. Testing Notification Endpoints")
    all_results.update(client.test_notification_endpoints())
    
    print("\n3. Testing Trasmissioni Endpoints")
    all_results.update(client.test_trasmissioni_endpoints())
    
    print("\n4. Testing Estratto Conto Endpoints")
    all_results.update(client.test_estratto_conto_endpoints())
    
    print("\n5. Testing CSV Export Endpoints")
    all_results.update(client.test_csv_export_endpoints())
    
    print("\n6. Testing Existing Endpoints (Regression)")
    all_results.update(client.test_existing_endpoints())
    
    # Summary
    print("\n=== TEST SUMMARY ===")
    total_tests = len(all_results)
    passed_tests = sum(1 for result in all_results.values() if result)
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    
    if failed_tests > 0:
        print("\nFAILED TESTS:")
        for test_name, result in all_results.items():
            if not result:
                print(f"  ❌ {test_name}")
    
    print("\nPASSED TESTS:")
    for test_name, result in all_results.items():
        if result:
            print(f"  ✅ {test_name}")
    
    # Return success if no critical failures
    success_rate = passed_tests / total_tests if total_tests > 0 else 0
    return success_rate >= 0.8  # 80% success rate threshold

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)