#!/usr/bin/env python3
"""
Backend API Testing Script for Collaboratore Login Ruolo Field
Test focus: Verify 'ruolo' field is included in collaboratore login and profile responses
"""

import requests
import os
import json

# Configuration
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://backend-refactor-86.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test data
ADMIN_CREDS = {"email": "admin@tardugno.it", "password": "admin123"}

def test_collaboratore_login_ruolo_field():
    """Test the collaboratore login endpoint to verify 'ruolo' field is included in response."""
    
    print(f"🔧 Testing Collaboratore Login Ruolo Field at: {API_BASE}")
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
            
        # Verify admin login includes ruolo='admin'
        user_data = login_data.get("user", {})
        if user_data.get("ruolo") != "admin":
            print(f"   ❌ FAILED: Admin user should have ruolo='admin', got: {user_data.get('ruolo')}")
            return
            
        print(f"   ✅ SUCCESS: Admin logged in with ruolo='admin', token obtained")
        headers = {"Authorization": f"Bearer {admin_token}"}
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 2: Create test collaboratore via admin
    print("\n2. Create test collaboratore: POST /api/admin/collaboratori")
    collaboratore_data = {
        "nome": "Test",
        "cognome": "Collab",
        "email": "test.collab@test.it",
        "password": "test123",
        "telefono": "+39 123456789",
        "qualifica": "Tecnico",
        "stato": "Attivo"
    }
    
    try:
        create_response = requests.post(f"{API_BASE}/admin/collaboratori", json=collaboratore_data, headers=headers, timeout=10)
        print(f"   Status: {create_response.status_code}")
        
        if create_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {create_response.status_code}")
            print(f"   Response: {create_response.text}")
            return
            
        created_collab = create_response.json()
        collaboratore_id = created_collab.get("id")
        if not collaboratore_id:
            print(f"   ❌ FAILED: No id in response")
            print(f"   Response: {created_collab}")
            return
            
        print(f"   ✅ SUCCESS: Collaboratore created with ID {collaboratore_id}")
        print(f"   - Nome: {created_collab.get('nome')} {created_collab.get('cognome')}")
        print(f"   - Email: {created_collab.get('email')}")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 3: Login as collaboratore
    print("\n3. Collaboratore login: POST /api/collaboratore/login")
    collaboratore_creds = {"email": "test.collab@test.it", "password": "test123"}
    
    try:
        collab_login_response = requests.post(f"{API_BASE}/collaboratore/login", json=collaboratore_creds, timeout=10)
        print(f"   Status: {collab_login_response.status_code}")
        
        if collab_login_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {collab_login_response.status_code}")
            print(f"   Response: {collab_login_response.text}")
            return
            
        collab_login_data = collab_login_response.json()
        collaboratore_token = collab_login_data.get("token")
        if not collaboratore_token:
            print(f"   ❌ FAILED: No token in response")
            print(f"   Response: {collab_login_data}")
            return
        
        # CRITICAL TEST: Verify user.ruolo='collaboratore' is included in response
        user_data = collab_login_data.get("user", {})
        if "ruolo" not in user_data:
            print(f"   ❌ FAILED: 'ruolo' field missing from user object")
            print(f"   User object: {json.dumps(user_data, indent=2)}")
            return
            
        if user_data.get("ruolo") != "collaboratore":
            print(f"   ❌ FAILED: Expected ruolo='collaboratore', got: '{user_data.get('ruolo')}'")
            return
            
        print(f"   ✅ SUCCESS: Collaboratore logged in successfully")
        print(f"   ✅ CRITICAL: user.ruolo='collaboratore' field is present and correct")
        print(f"   - User ID: {user_data.get('id')}")
        print(f"   - Nome: {user_data.get('nome')} {user_data.get('cognome')}")
        print(f"   - Email: {user_data.get('email')}")
        print(f"   - Ruolo: {user_data.get('ruolo')}")
        
        collab_headers = {"Authorization": f"Bearer {collaboratore_token}"}
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 4: Get collaboratore profile
    print("\n4. Get collaboratore profile: GET /api/collaboratore/profilo")
    try:
        profile_response = requests.get(f"{API_BASE}/collaboratore/profilo", headers=collab_headers, timeout=10)
        print(f"   Status: {profile_response.status_code}")
        
        if profile_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {profile_response.status_code}")
            print(f"   Response: {profile_response.text}")
            return
            
        profile_data = profile_response.json()
        
        # CRITICAL TEST: Verify ruolo='collaboratore' is included in profile response
        if "ruolo" not in profile_data:
            print(f"   ❌ FAILED: 'ruolo' field missing from profile response")
            print(f"   Profile data: {json.dumps(profile_data, indent=2)}")
            return
            
        if profile_data.get("ruolo") != "collaboratore":
            print(f"   ❌ FAILED: Expected ruolo='collaboratore' in profile, got: '{profile_data.get('ruolo')}'")
            return
            
        print(f"   ✅ SUCCESS: Profile retrieved successfully")
        print(f"   ✅ CRITICAL: ruolo='collaboratore' field is present and correct in profile")
        print(f"   - Nome: {profile_data.get('nome')} {profile_data.get('cognome')}")
        print(f"   - Email: {profile_data.get('email')}")
        print(f"   - Ruolo: {profile_data.get('ruolo')}")
        print(f"   - Qualifica: {profile_data.get('qualifica')}")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    # Step 5: Verify collaboratore can access sopralluoghi
    print("\n5. Verify collaboratore access: GET /api/sopralluoghi")
    try:
        sopralluoghi_response = requests.get(f"{API_BASE}/sopralluoghi", headers=collab_headers, timeout=10)
        print(f"   Status: {sopralluoghi_response.status_code}")
        
        if sopralluoghi_response.status_code != 200:
            print(f"   ❌ FAILED: Expected 200, got {sopralluoghi_response.status_code}")
            print(f"   Response: {sopralluoghi_response.text}")
            return
            
        sopralluoghi_data = sopralluoghi_response.json()
        
        if not isinstance(sopralluoghi_data, list):
            print(f"   ❌ FAILED: Expected list response, got {type(sopralluoghi_data)}")
            return
            
        print(f"   ✅ SUCCESS: Collaboratore can access sopralluoghi endpoint")
        print(f"   - Sopralluoghi count: {len(sopralluoghi_data)}")
        
        if len(sopralluoghi_data) > 0:
            print(f"   - Sample sopralluogo: {sopralluoghi_data[0].get('id')} - {sopralluoghi_data[0].get('stato', 'N/A')}")
        else:
            print(f"   - No sopralluoghi found (expected for new collaboratore)")
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return

    print("\n" + "=" * 80)
    print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    print("✅ Admin login working with ruolo='admin'")
    print("✅ Collaboratore creation working correctly")
    print("✅ CRITICAL: Collaboratore login returns user.ruolo='collaboratore'")
    print("✅ CRITICAL: Collaboratore profile returns ruolo='collaboratore'") 
    print("✅ Collaboratore has access to sopralluoghi endpoint")
    print("\n🔑 KEY FINDINGS:")
    print("   - POST /api/collaboratore/login now includes ruolo='collaboratore' in user object")
    print("   - GET /api/collaboratore/profilo now includes ruolo='collaboratore' in response")
    print("   - Authentication and authorization working correctly")
    print("   - Backend changes are working as expected")

if __name__ == "__main__":
    test_collaboratore_login_ruolo_field()