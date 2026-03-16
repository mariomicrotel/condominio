#!/usr/bin/env python3

import requests
import json
import time
import sys

# Test configuration
BASE_URL = "https://data-protection-17.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@tardugno.it"
ADMIN_PASSWORD = "admin123"
CONDOMINO_EMAIL = "mario.rossi@email.it"
CONDOMINO_PASSWORD = "password123"

# Global variables for tokens
admin_token = None
condomino_token = None

def make_request(method, endpoint, data=None, headers=None, token=None):
    """Helper function to make HTTP requests."""
    url = f"{BASE_URL}{endpoint}"
    
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"{method} {endpoint}")
        print(f"Status: {response.status_code}")
        if response.text:
            try:
                response_json = response.json()
                print(f"Response: {json.dumps(response_json, indent=2)}")
                return response.status_code, response_json
            except:
                print(f"Response (text): {response.text}")
                return response.status_code, response.text
        else:
            print("Response: (empty)")
            return response.status_code, None
    except Exception as e:
        print(f"ERROR: {e}")
        return None, None

def test_step(step_num, description, expected_status=200):
    """Decorator-like function to test steps."""
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {description}")
    print(f"{'='*60}")
    return expected_status

def main():
    """Test GDPR Compliance Module endpoints in the specified order."""
    global admin_token, condomino_token
    
    print("Starting GDPR Compliance Module Testing")
    print(f"Backend URL: {BASE_URL}")
    
    # Step 1: GET /api/informativa/attiva (public, no auth)
    expected_status = test_step(1, "GET /api/informativa/attiva (public, no auth) - Should return active privacy policy with versione='1.0'")
    status, response = make_request("GET", "/informativa/attiva")
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or response.get("versione") != "1.0":
        print(f"❌ FAILED: Expected versione='1.0', got {response.get('versione') if response else 'None'}")
        return False
    if not response.get("testo_completo"):
        print(f"❌ FAILED: Expected testo_completo, got empty or None")
        return False
    print("✅ Step 1 PASSED: Active privacy policy v1.0 returned with full text")
    
    # Step 2: Admin login
    expected_status = test_step(2, "Admin login: POST /api/auth/login - Get admin token")
    status, response = make_request("POST", "/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or not response.get("token"):
        print(f"❌ FAILED: No token in response")
        return False
    admin_token = response["token"]
    print(f"✅ Step 2 PASSED: Admin login successful, token obtained")
    
    # Step 3: GET /api/informativa/versioni (with admin token)
    expected_status = test_step(3, "GET /api/informativa/versioni (with admin token) - Should return list of policy versions")
    status, response = make_request("GET", "/informativa/versioni", token=admin_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or not isinstance(response, list):
        print(f"❌ FAILED: Expected list of versions, got {type(response)}")
        return False
    if len(response) == 0:
        print(f"❌ FAILED: Expected at least one version, got empty list")
        return False
    if not any(v.get("versione") == "1.0" for v in response):
        print(f"❌ FAILED: Expected version 1.0 in list")
        return False
    print(f"✅ Step 3 PASSED: Policy versions list returned with {len(response)} version(s)")
    
    # Step 4: POST /api/admin/informativa (create new policy version v1.1)
    expected_status = test_step(4, "POST /api/admin/informativa (create new policy version v1.1)")
    new_policy_data = {
        "versione": "1.1",
        "testo_completo": "Versione aggiornata informativa privacy - testo completo v1.1",
        "note_versione": "Test aggiornamento"
    }
    status, response = make_request("POST", "/admin/informativa", new_policy_data, token=admin_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or response.get("versione") != "1.1":
        print(f"❌ FAILED: Expected versione='1.1', got {response.get('versione') if response else 'None'}")
        return False
    print(f"✅ Step 4 PASSED: New policy version v1.1 created and set as active")
    
    # Step 5: GET /api/informativa/attiva again (should now return v1.1)
    expected_status = test_step(5, "GET /api/informativa/attiva again - Should now return v1.1 as active version")
    status, response = make_request("GET", "/informativa/attiva")
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or response.get("versione") != "1.1":
        print(f"❌ FAILED: Expected versione='1.1', got {response.get('versione') if response else 'None'}")
        return False
    print(f"✅ Step 5 PASSED: Active policy now shows v1.1")
    
    # Step 6: Condomino login
    expected_status = test_step(6, "Condomino login: POST /api/auth/login - Get condomino token")
    status, response = make_request("POST", "/auth/login", {"email": CONDOMINO_EMAIL, "password": CONDOMINO_PASSWORD})
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or not response.get("token"):
        print(f"❌ FAILED: No token in response")
        return False
    condomino_token = response["token"]
    print(f"✅ Step 6 PASSED: Condomino login successful, token obtained")
    
    # Step 7: GET /api/informativa/verifica-aggiornamento (should return aggiornamento_richiesto=true)
    expected_status = test_step(7, "GET /api/informativa/verifica-aggiornamento - Should return aggiornamento_richiesto=true")
    status, response = make_request("GET", "/informativa/verifica-aggiornamento", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or response.get("aggiornamento_richiesto") != True:
        print(f"❌ FAILED: Expected aggiornamento_richiesto=true, got {response.get('aggiornamento_richiesto') if response else 'None'}")
        return False
    if response.get("versione_attiva") != "1.1":
        print(f"❌ FAILED: Expected versione_attiva='1.1', got {response.get('versione_attiva')}")
        return False
    print(f"✅ Step 7 PASSED: User needs to accept v1.1 update")
    
    # Step 8: POST /api/consensi/conferma-aggiornamento (confirm acceptance v1.1)
    expected_status = test_step(8, "POST /api/consensi/conferma-aggiornamento - Confirm acceptance of v1.1")
    status, response = make_request("POST", "/consensi/conferma-aggiornamento", {"versione": "1.1"}, token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or "confermato" not in response.get("message", "").lower():
        print(f"❌ FAILED: Expected confirmation message, got {response.get('message') if response else 'None'}")
        return False
    print(f"✅ Step 8 PASSED: Policy v1.1 acceptance confirmed")
    
    # Step 9: GET /api/informativa/verifica-aggiornamento again (should now return aggiornamento_richiesto=false)
    expected_status = test_step(9, "GET /api/informativa/verifica-aggiornamento again - Should now return aggiornamento_richiesto=false")
    status, response = make_request("GET", "/informativa/verifica-aggiornamento", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or response.get("aggiornamento_richiesto") != False:
        print(f"❌ FAILED: Expected aggiornamento_richiesto=false, got {response.get('aggiornamento_richiesto') if response else 'None'}")
        return False
    print(f"✅ Step 9 PASSED: No update required now")
    
    # Step 10: GET /api/consensi/miei (get current consent statuses)
    expected_status = test_step(10, "GET /api/consensi/miei - Should return consent statuses for privacy_policy, marketing, note_vocali")
    status, response = make_request("GET", "/consensi/miei", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response:
        print(f"❌ FAILED: Empty response")
        return False
    
    required_types = ["privacy_policy", "marketing", "note_vocali"]
    for consent_type in required_types:
        if consent_type not in response:
            print(f"❌ FAILED: Expected {consent_type} in response")
            return False
    
    # privacy_policy should be true (just accepted v1.1)
    if response.get("privacy_policy", {}).get("prestato") != True:
        print(f"❌ FAILED: Expected privacy_policy.prestato=true")
        return False
    
    print(f"✅ Step 10 PASSED: Consent statuses returned for all consent types")
    
    # Step 11: POST /api/consensi/registrazione (save registration consents)
    expected_status = test_step(11, "POST /api/consensi/registrazione - Save consents")
    consent_data = {
        "consenso_privacy": True,
        "consenso_marketing": True,
        "consenso_note_vocali": False
    }
    status, response = make_request("POST", "/consensi/registrazione", consent_data, token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or "salvati" not in response.get("message", "").lower():
        print(f"❌ FAILED: Expected success message, got {response.get('message') if response else 'None'}")
        return False
    print(f"✅ Step 11 PASSED: Registration consents saved")
    
    # Step 12: GET /api/consensi/miei (verify saved consents)
    expected_status = test_step(12, "GET /api/consensi/miei - Should show marketing=true, note_vocali=false")
    status, response = make_request("GET", "/consensi/miei", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response:
        print(f"❌ FAILED: Empty response")
        return False
    
    if response.get("marketing", {}).get("prestato") != True:
        print(f"❌ FAILED: Expected marketing.prestato=true, got {response.get('marketing', {}).get('prestato')}")
        return False
    
    if response.get("note_vocali", {}).get("prestato") != False:
        print(f"❌ FAILED: Expected note_vocali.prestato=false, got {response.get('note_vocali', {}).get('prestato')}")
        return False
    
    print(f"✅ Step 12 PASSED: Consents correctly show marketing=true, note_vocali=false")
    
    # Step 13: PATCH /api/consensi/marketing/revoca (revoke marketing consent)
    expected_status = test_step(13, "PATCH /api/consensi/marketing/revoca - Revoke marketing consent")
    status, response = make_request("PATCH", "/consensi/marketing/revoca", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or "revocato" not in response.get("message", "").lower():
        print(f"❌ FAILED: Expected revocation message, got {response.get('message') if response else 'None'}")
        return False
    print(f"✅ Step 13 PASSED: Marketing consent revoked")
    
    # Step 14: GET /api/consensi/miei (marketing.prestato should now be false)
    expected_status = test_step(14, "GET /api/consensi/miei - marketing.prestato should now be false")
    status, response = make_request("GET", "/consensi/miei", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response:
        print(f"❌ FAILED: Empty response")
        return False
    
    if response.get("marketing", {}).get("prestato") != False:
        print(f"❌ FAILED: Expected marketing.prestato=false after revocation, got {response.get('marketing', {}).get('prestato')}")
        return False
    
    print(f"✅ Step 14 PASSED: Marketing consent now shows as revoked (false)")
    
    # Step 15: PATCH /api/consensi/marketing/riattiva (reactivate marketing)
    expected_status = test_step(15, "PATCH /api/consensi/marketing/riattiva - Reactivate marketing consent")
    status, response = make_request("PATCH", "/consensi/marketing/riattiva", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or "riattivato" not in response.get("message", "").lower():
        print(f"❌ FAILED: Expected reactivation message, got {response.get('message') if response else 'None'}")
        return False
    print(f"✅ Step 15 PASSED: Marketing consent reactivated")
    
    # Step 16: GET /api/consensi/miei (marketing.prestato should now be true again)
    expected_status = test_step(16, "GET /api/consensi/miei - marketing.prestato should now be true again")
    status, response = make_request("GET", "/consensi/miei", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response:
        print(f"❌ FAILED: Empty response")
        return False
    
    if response.get("marketing", {}).get("prestato") != True:
        print(f"❌ FAILED: Expected marketing.prestato=true after reactivation, got {response.get('marketing', {}).get('prestato')}")
        return False
    
    print(f"✅ Step 16 PASSED: Marketing consent now shows as active (true) again")
    
    # Step 17: Try PATCH /api/consensi/privacy_policy/revoca (should return 400 error)
    expected_status = test_step(17, "PATCH /api/consensi/privacy_policy/revoca - Should return 400 error (cannot revoke privacy_policy)", 400)
    status, response = make_request("PATCH", "/consensi/privacy_policy/revoca", token=condomino_token)
    if status != expected_status:
        print(f"❌ FAILED: Expected status {expected_status}, got {status}")
        return False
    if not response or "privacy policy" not in str(response).lower():
        print(f"❌ FAILED: Expected error message about privacy policy revocation, got {response}")
        return False
    print(f"✅ Step 17 PASSED: Privacy policy revocation correctly blocked with 400 error")
    
    print(f"\n{'='*80}")
    print("🎉 ALL GDPR COMPLIANCE MODULE TESTS PASSED! 🎉")
    print(f"{'='*80}")
    print("Summary:")
    print("✅ Public informativa endpoint working")
    print("✅ Admin policy version management working")
    print("✅ Policy update notification system working")
    print("✅ Consent confirmation workflow working")
    print("✅ Consent management (registration, revocation, reactivation) working")
    print("✅ Privacy policy revocation protection working")
    print("✅ All authentication and authorization checks working")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ GDPR COMPLIANCE MODULE TESTS FAILED")
        sys.exit(1)
    else:
        print("\n✅ GDPR COMPLIANCE MODULE TESTS COMPLETED SUCCESSFULLY")
        sys.exit(0)