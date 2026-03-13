#!/usr/bin/env python3
"""
Quick test to check notification behavior
"""

import requests
import json

BASE_URL = "https://studio-condomini.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

ADMIN_CREDS = {"email": "admin@tardugno.it", "password": "admin123"}

def test_admin_notifications():
    session = requests.Session()
    
    # Admin login
    resp = session.post(f"{API_BASE}/auth/login", json=ADMIN_CREDS)
    admin_token = resp.json()["token"]
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Check admin notifications
    resp = session.get(f"{API_BASE}/notifiche", headers=headers)
    if resp.status_code == 200:
        notifiche = resp.json()
        print(f"Admin has {len(notifiche)} notifications")
        for n in notifiche[:3]:  # Show first 3
            print(f"  - {n.get('titolo', 'No title')}: {n.get('messaggio', 'No message')[:50]}...")
            
        if notifiche:
            # Test marking one as read
            notifica_id = notifiche[0]["id"]
            resp = session.put(f"{API_BASE}/notifiche/{notifica_id}/letto", headers=headers)
            print(f"Mark as read result: {resp.status_code}")
    else:
        print(f"Failed to get admin notifications: {resp.status_code}")

if __name__ == "__main__":
    test_admin_notifications()