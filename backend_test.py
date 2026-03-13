#!/usr/bin/env python3

import requests
import json
import tempfile
import os
from pathlib import Path

# Backend URL from the frontend config
BACKEND_URL = "https://studio-condomini.preview.emergentagent.com/api"

def print_test(step, description):
    print(f"\n{step}. {description}")
    print("=" * 60)

def test_file_upload_and_segnalazioni():
    """Test file upload and segnalazioni with allegati"""
    
    # Step 1: Login as condomino
    print_test("1", "Login as condomino (mario.rossi@email.it)")
    
    login_data = {
        "email": "mario.rossi@email.it", 
        "password": "password123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("❌ LOGIN FAILED")
        return
        
    login_response = response.json()
    condomino_token = login_response.get("token")
    print(f"✅ Login successful. Token: {condomino_token[:20]}...")
    
    # Step 2: Upload a test file
    print_test("2", "Upload a test file (test_photo.jpg)")
    
    # Create a small test file
    test_content = b"This is a test image file for testing file upload functionality. " * 10  # ~640 bytes
    
    files = {
        'file': ('test_photo.jpg', test_content, 'image/jpeg')
    }
    
    headers = {
        'Authorization': f'Bearer {condomino_token}'
    }
    
    response = requests.post(f"{BACKEND_URL}/upload", files=files, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("❌ FILE UPLOAD FAILED")
        return
        
    upload_response = response.json()
    file_id = upload_response.get("id")
    filename = upload_response.get("filename")
    file_url = upload_response.get("url")
    
    print(f"✅ File uploaded successfully")
    print(f"   File ID: {file_id}")
    print(f"   Filename: {filename}")
    print(f"   URL: {file_url}")
    print(f"   Content Type: {upload_response.get('content_type')}")
    print(f"   Size: {upload_response.get('size')} bytes")
    
    # Step 3: Download the uploaded file
    print_test("3", "Download the uploaded file")
    
    download_url = f"{BACKEND_URL.replace('/api', '')}{file_url}"
    response = requests.get(download_url)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Content-Length: {len(response.content)} bytes")
    
    if response.status_code == 200 and response.content == test_content:
        print("✅ File download successful and content matches")
    else:
        print("❌ File download failed or content mismatch")
    
    # Step 4: Test file type validation
    print_test("4", "Test file type validation (unsupported .zip file)")
    
    zip_files = {
        'file': ('test.zip', b'PK\x03\x04', 'application/zip')
    }
    
    response = requests.post(f"{BACKEND_URL}/upload", files=zip_files, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 400:
        print("✅ File type validation working correctly")
    else:
        print("❌ File type validation failed")
    
    # Step 5: Create segnalazione with allegati
    print_test("5", "Create segnalazione with allegati")
    
    # First get condomini list
    response = requests.get(f"{BACKEND_URL}/condomini", headers=headers)
    print(f"Condomini list status: {response.status_code}")
    
    if response.status_code != 200:
        print("❌ Failed to get condomini list")
        return
    
    condomini = response.json()
    if not condomini:
        print("❌ No condomini available")
        return
    
    first_condo_id = condomini[0]["id"]
    print(f"Using condominio ID: {first_condo_id}")
    
    # Create segnalazione with uploaded file
    segnalazione_data = {
        "condominio_id": first_condo_id,
        "qualita": "Proprietario", 
        "tipologia": "Guasto idraulico",
        "descrizione": "Test segnalazione con allegati",
        "urgenza": "Alta",
        "allegati": [file_id]
    }
    
    response = requests.post(f"{BACKEND_URL}/segnalazioni", json=segnalazione_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("❌ Failed to create segnalazione with allegati")
        return
    
    segnalazione_response = response.json()
    seg_id = segnalazione_response.get("id")
    protocollo = segnalazione_response.get("protocollo")
    
    print(f"✅ Segnalazione created successfully")
    print(f"   ID: {seg_id}")
    print(f"   Protocollo: {protocollo}")
    print(f"   Allegati: {segnalazione_response.get('allegati')}")
    
    # Step 6: Get segnalazione detail as admin
    print_test("6", "Get segnalazione detail as admin")
    
    # Login as admin
    admin_login_data = {
        "email": "admin@tardugno.it",
        "password": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login_data)
    print(f"Admin login status: {response.status_code}")
    
    if response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_response = response.json()
    admin_token = admin_response.get("token")
    print(f"✅ Admin login successful. Token: {admin_token[:20]}...")
    
    # Get segnalazione detail
    admin_headers = {
        'Authorization': f'Bearer {admin_token}'
    }
    
    response = requests.get(f"{BACKEND_URL}/segnalazioni/{seg_id}", headers=admin_headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        seg_detail = response.json()
        allegati_dettagli = seg_detail.get("allegati_dettagli", [])
        
        if allegati_dettagli:
            print("✅ Segnalazione detail retrieved with allegati_dettagli")
            for allegato in allegati_dettagli:
                print(f"   Allegato: {allegato.get('filename')} ({allegato.get('content_type')}, {allegato.get('size')} bytes)")
        else:
            print("❌ No allegati_dettagli found in response")
    else:
        print("❌ Failed to get segnalazione detail")
    
    # Step 7: Test upload without auth
    print_test("7", "Test upload without authentication")
    
    no_auth_files = {
        'file': ('test_no_auth.jpg', b'test content', 'image/jpeg')
    }
    
    response = requests.post(f"{BACKEND_URL}/upload", files=no_auth_files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code in [401, 403]:
        print("✅ Authentication requirement working correctly")
    else:
        print("❌ Authentication requirement failed")
    
    print("\n" + "=" * 60)
    print("FILE UPLOAD AND SEGNALAZIONI TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_file_upload_and_segnalazioni()