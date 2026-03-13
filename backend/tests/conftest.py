import pytest
import requests
import os

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def base_url():
    """Base URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.skip("EXPO_PUBLIC_BACKEND_URL not set")
    return url.rstrip('/')

@pytest.fixture
def condomino_token(api_client, base_url):
    """Login as condomino and return token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "mario.rossi@email.it",
        "password": "password123"
    })
    if response.status_code != 200:
        pytest.skip("Cannot login as condomino")
    return response.json()["token"]

@pytest.fixture
def admin_token(api_client, base_url):
    """Login as admin and return token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "admin@tardugno.it",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.skip("Cannot login as admin")
    return response.json()["token"]
