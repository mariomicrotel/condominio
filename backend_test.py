#!/usr/bin/env python3
"""
Backend Testing Script for Privacy Rights Module (GDPR Art. 15-22)
Testing FastAPI backend endpoints for data protection requests.
"""

import json
import requests
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://data-protection-17.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@tardugno.it"
ADMIN_PASSWORD = "admin123"
CONDOMINO_EMAIL = "mario.rossi@email.it" 
CONDOMINO_PASSWORD = "password123"

class PrivacyTestRunner:
    def __init__(self):
        self.admin_token = None
        self.condomino_token = None
        self.test_results = []
        self.cancellazione_id = None
        self.limitazione_id = None
        
    def log_result(self, step, description, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{step}. {description}: {status}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            "step": step,
            "description": description,
            "success": success,
            "details": details
        })
        
    def make_request(self, method, endpoint, token=None, data=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None
            
    def test_authentication(self):
        """Test authentication for both users"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test 1: Condomino login
        response = self.make_request("POST", "/auth/login", data={
            "email": CONDOMINO_EMAIL,
            "password": CONDOMINO_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.condomino_token = data.get("token")
            self.log_result(1, "Condomino login", True, f"Token received for {CONDOMINO_EMAIL}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(1, "Condomino login", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False
            
        # Test 8: Admin login
        response = self.make_request("POST", "/auth/login", data={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("token")
            self.log_result(8, "Admin login", True, f"Token received for {ADMIN_EMAIL}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(8, "Admin login", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False
            
        return True
        
    def test_privacy_data_access(self):
        """Test privacy data access endpoints"""
        print("\n=== PRIVACY DATA ACCESS TESTS ===")
        
        # Test 2: GET /api/privacy/miei-dati
        response = self.make_request("GET", "/privacy/miei-dati", token=self.condomino_token)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["profilo", "condomini_associati", "consensi", "segnalazioni", "richieste_documenti", "trasmissioni", "appuntamenti"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                self.log_result(2, "GET /api/privacy/miei-dati structure", True, f"All required fields present: {required_fields}")
            else:
                self.log_result(2, "GET /api/privacy/miei-dati structure", False, f"Missing fields: {missing_fields}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(2, "GET /api/privacy/miei-dati", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 3: GET /api/privacy/export
        response = self.make_request("GET", "/privacy/export", token=self.condomino_token)
        
        if response and response.status_code == 200:
            try:
                # Response should be a JSON string, not a JSON object
                content = response.text
                # Try to parse the JSON string to verify it's valid JSON
                parsed_data = json.loads(content)
                
                # Check for required top-level fields
                required_fields = ["titolare", "utente"]
                missing_fields = [f for f in required_fields if f not in parsed_data]
                
                if not missing_fields:
                    self.log_result(3, "GET /api/privacy/export format", True, f"Valid JSON string with required fields: {required_fields}")
                else:
                    self.log_result(3, "GET /api/privacy/export format", False, f"Missing top-level fields: {missing_fields}")
                    
            except json.JSONDecodeError as e:
                self.log_result(3, "GET /api/privacy/export format", False, f"Invalid JSON response: {e}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(3, "GET /api/privacy/export", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
    def test_privacy_requests(self):
        """Test privacy request creation and management"""
        print("\n=== PRIVACY REQUEST TESTS ===")
        
        # Test 4: POST /api/privacy/richiesta (cancellazione)
        response = self.make_request("POST", "/privacy/richiesta", token=self.condomino_token, data={
            "tipo": "cancellazione"
        })
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["id", "protocollo", "tipo", "stato", "scadenza", "created_at"]
            missing_fields = [f for f in required_fields if f not in data]
            
            # Check protocollo format (should be PRIV-CAN-YYYY-XXXXXX)
            protocollo = data.get("protocollo", "")
            protocollo_valid = protocollo.startswith("PRIV-CAN-") and len(protocollo.split("-")) >= 3
            
            # Check stato is "ricevuta"
            stato_valid = data.get("stato") == "ricevuta"
            
            if not missing_fields and protocollo_valid and stato_valid:
                self.cancellazione_id = data.get("id")
                self.log_result(4, "POST /api/privacy/richiesta (cancellazione)", True, 
                               f"Created request with protocollo: {protocollo}, stato: {data.get('stato')}")
            else:
                self.log_result(4, "POST /api/privacy/richiesta (cancellazione)", False, 
                               f"Missing fields: {missing_fields}, protocollo valid: {protocollo_valid}, stato valid: {stato_valid}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(4, "POST /api/privacy/richiesta (cancellazione)", False, 
                           f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 5: GET /api/privacy/mie-richieste
        response = self.make_request("GET", "/privacy/mie-richieste", token=self.condomino_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 1:
                self.log_result(5, "GET /api/privacy/mie-richieste", True, f"Found {len(data)} request(s)")
            else:
                self.log_result(5, "GET /api/privacy/mie-richieste", False, f"Expected array with at least 1 request, got: {type(data)} with {len(data) if isinstance(data, list) else 0} items")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(5, "GET /api/privacy/mie-richieste", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 6: POST /api/privacy/richiesta (duplicate cancellazione - should fail)
        response = self.make_request("POST", "/privacy/richiesta", token=self.condomino_token, data={
            "tipo": "cancellazione"
        })
        
        if response and response.status_code == 400:
            error_msg = response.text
            if "già una richiesta" in error_msg.lower():
                self.log_result(6, "POST /api/privacy/richiesta (duplicate prevention)", True, "Correctly rejected duplicate request")
            else:
                self.log_result(6, "POST /api/privacy/richiesta (duplicate prevention)", False, f"Wrong error message: {error_msg}")
        else:
            self.log_result(6, "POST /api/privacy/richiesta (duplicate prevention)", False, 
                           f"Expected 400 error, got status: {response.status_code if response else 'None'}")
            
        # Test 7: POST /api/privacy/richiesta (limitazione)
        response = self.make_request("POST", "/privacy/richiesta", token=self.condomino_token, data={
            "tipo": "limitazione"
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.limitazione_id = data.get("id")
            self.log_result(7, "POST /api/privacy/richiesta (limitazione)", True, f"Created limitazione request with ID: {self.limitazione_id}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(7, "POST /api/privacy/richiesta (limitazione)", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
    def test_admin_privacy_management(self):
        """Test admin privacy request management"""
        print("\n=== ADMIN PRIVACY MANAGEMENT TESTS ===")
        
        # Test 9: GET /api/admin/privacy/richieste
        response = self.make_request("GET", "/admin/privacy/richieste", token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 2:  # Should have at least cancellazione and limitazione requests
                self.log_result(9, "GET /api/admin/privacy/richieste", True, f"Found {len(data)} request(s)")
            else:
                self.log_result(9, "GET /api/admin/privacy/richieste", False, f"Expected array with at least 2 requests, got {len(data) if isinstance(data, list) else 0}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(9, "GET /api/admin/privacy/richieste", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 10: GET /api/admin/privacy/richieste?stato=ricevuta (filter)
        response = self.make_request("GET", "/admin/privacy/richieste", token=self.admin_token, params={"stato": "ricevuta"})
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Check all returned items have stato=ricevuta
                all_ricevuta = all(req.get("stato") == "ricevuta" for req in data)
                if all_ricevuta:
                    self.log_result(10, "GET /api/admin/privacy/richieste?stato=ricevuta", True, f"Filter working, found {len(data)} 'ricevuta' request(s)")
                else:
                    self.log_result(10, "GET /api/admin/privacy/richieste?stato=ricevuta", False, "Filter not working, found requests with different stati")
            else:
                self.log_result(10, "GET /api/admin/privacy/richieste?stato=ricevuta", False, f"Expected array, got {type(data)}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(10, "GET /api/admin/privacy/richieste?stato=ricevuta", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 11: GET /api/admin/privacy/richieste/count-scadenza
        response = self.make_request("GET", "/admin/privacy/richieste/count-scadenza", token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if "scadenza_imminente" in data and "totale_in_attesa" in data:
                self.log_result(11, "GET /api/admin/privacy/richieste/count-scadenza", True, 
                               f"scadenza_imminente: {data['scadenza_imminente']}, totale_in_attesa: {data['totale_in_attesa']}")
            else:
                self.log_result(11, "GET /api/admin/privacy/richieste/count-scadenza", False, f"Missing required fields in response: {data}")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(11, "GET /api/admin/privacy/richieste/count-scadenza", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
        # Test 12: PUT /api/admin/privacy/richieste/{cancellazione_id}/evadi (reject)
        if self.cancellazione_id:
            response = self.make_request("PUT", f"/admin/privacy/richieste/{self.cancellazione_id}/evadi", 
                                       token=self.admin_token, data={
                "azione": "rifiutata",
                "motivazione_rifiuto": "Richiesta non conforme",
                "note_admin": "Verificare la documentazione"
            })
            
            if response and response.status_code == 200:
                self.log_result(12, "PUT /api/admin/privacy/richieste/{id}/evadi (rifiutata)", True, "Request rejected successfully")
            else:
                error_msg = response.text if response else "No response"
                self.log_result(12, "PUT /api/admin/privacy/richieste/{id}/evadi (rifiutata)", False, 
                               f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        else:
            self.log_result(12, "PUT /api/admin/privacy/richieste/{id}/evadi (rifiutata)", False, "No cancellazione_id available")
            
        # Test 13: GET /api/admin/privacy/richieste?stato=rifiutata (verify rejection)
        response = self.make_request("GET", "/admin/privacy/richieste", token=self.admin_token, params={"stato": "rifiutata"})
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and any(req.get("id") == self.cancellazione_id for req in data):
                self.log_result(13, "GET /api/admin/privacy/richieste?stato=rifiutata", True, "Rejected request visible in filtered results")
            else:
                self.log_result(13, "GET /api/admin/privacy/richieste?stato=rifiutata", False, "Rejected request not found in filtered results")
        else:
            error_msg = response.text if response else "No response"
            self.log_result(13, "GET /api/admin/privacy/richieste?stato=rifiutata", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
    def test_edge_cases(self):
        """Test edge cases and error conditions"""
        print("\n=== EDGE CASE TESTS ===")
        
        # Test 14: POST /api/privacy/richiesta with invalid tipo
        response = self.make_request("POST", "/privacy/richiesta", token=self.condomino_token, data={
            "tipo": "tipo_invalido"
        })
        
        if response and response.status_code == 400:
            self.log_result(14, "POST /api/privacy/richiesta (invalid tipo)", True, "Correctly rejected invalid tipo")
        else:
            self.log_result(14, "POST /api/privacy/richiesta (invalid tipo)", False, 
                           f"Expected 400 error, got status: {response.status_code if response else 'None'}")
            
        # Test 15: PUT /api/admin/privacy/richieste/{limitazione_id}/evadi (approve limitazione)
        if self.limitazione_id:
            response = self.make_request("PUT", f"/admin/privacy/richieste/{self.limitazione_id}/evadi", 
                                       token=self.admin_token, data={
                "azione": "evasa"
            })
            
            if response and response.status_code == 200:
                self.log_result(15, "PUT /api/admin/privacy/richieste/{id}/evadi (evasa)", True, "Limitazione request approved successfully")
            else:
                error_msg = response.text if response else "No response"
                self.log_result(15, "PUT /api/admin/privacy/richieste/{id}/evadi (evasa)", False, 
                               f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        else:
            self.log_result(15, "PUT /api/admin/privacy/richieste/{id}/evadi (evasa)", False, "No limitazione_id available")
            
    def test_authentication_requirements(self):
        """Test that endpoints require proper authentication"""
        print("\n=== AUTHENTICATION REQUIREMENT TESTS ===")
        
        endpoints_to_test = [
            ("GET", "/privacy/miei-dati"),
            ("GET", "/privacy/export"),
            ("POST", "/privacy/richiesta"),
            ("GET", "/privacy/mie-richieste"),
            ("GET", "/admin/privacy/richieste"),
            ("GET", "/admin/privacy/richieste/count-scadenza")
        ]
        
        auth_test_passed = 0
        auth_test_total = len(endpoints_to_test)
        
        for method, endpoint in endpoints_to_test:
            response = self.make_request(method, endpoint)  # No token
            
            if response and response.status_code in [401, 403]:
                auth_test_passed += 1
            else:
                print(f"   ❌ {method} {endpoint} - Expected 401/403, got {response.status_code if response else 'None'}")
                
        if auth_test_passed == auth_test_total:
            self.log_result("Auth", "Authentication requirements", True, f"All {auth_test_total} endpoints properly protected")
        else:
            self.log_result("Auth", "Authentication requirements", False, f"Only {auth_test_passed}/{auth_test_total} endpoints properly protected")
            
    def run_all_tests(self):
        """Run all privacy rights module tests"""
        print("🔐 PRIVACY RIGHTS MODULE TESTING (GDPR Art. 15-22)")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing with Admin: {ADMIN_EMAIL}, Condomino: {CONDOMINO_EMAIL}")
        print("=" * 60)
        
        # Run test sequences
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
            
        self.test_privacy_data_access()
        self.test_privacy_requests()
        self.test_admin_privacy_management()
        self.test_edge_cases()
        self.test_authentication_requirements()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{result['step']}. {result['description']}: {status}")
            if result["details"] and not result["success"]:
                print(f"   Details: {result['details']}")
                
        print(f"\n🎯 OVERALL: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
        
        if passed == total:
            print("🎉 ALL PRIVACY RIGHTS MODULE TESTS PASSED!")
            return True
        else:
            print(f"⚠️  {total-passed} tests failed - see details above")
            return False

if __name__ == "__main__":
    runner = PrivacyTestRunner()
    success = runner.run_all_tests()
    sys.exit(0 if success else 1)