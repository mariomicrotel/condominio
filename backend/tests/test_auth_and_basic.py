import pytest
import requests

class TestSeedAndAuth:
    """Test seed data creation and authentication"""

    def test_seed_data_creation(self, api_client, base_url):
        """Test POST /api/seed - seed data creation"""
        response = api_client.post(f"{base_url}/api/seed")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "admin_email" in data or "admin" in data
        print(f"✓ Seed endpoint working: {data.get('message', '')}")

    def test_login_condomino_success(self, api_client, base_url):
        """Test POST /api/auth/login - login with mario.rossi@email.it"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "mario.rossi@email.it",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "mario.rossi@email.it"
        assert data["user"]["ruolo"] == "condomino"
        assert data["user"]["nome"] == "Mario"
        assert data["user"]["cognome"] == "Rossi"
        print(f"✓ Condomino login successful: {data['user']['nome']} {data['user']['cognome']}")

    def test_login_admin_success(self, api_client, base_url):
        """Test POST /api/auth/login - login with admin@tardugno.it"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "admin@tardugno.it",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@tardugno.it"
        assert data["user"]["ruolo"] == "admin"
        print(f"✓ Admin login successful: {data['user']['email']}")

    def test_login_invalid_credentials(self, api_client, base_url):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")

    def test_get_profile_with_token(self, api_client, base_url, condomino_token):
        """Test GET /api/auth/profile - get user profile with token"""
        response = api_client.get(
            f"{base_url}/api/auth/profile",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "mario.rossi@email.it"
        assert "condomini" in data
        assert isinstance(data["condomini"], list)
        print(f"✓ Profile retrieved: {data['nome']} {data['cognome']}, condomini: {len(data['condomini'])}")

    def test_get_profile_without_token(self, api_client, base_url):
        """Test profile access without token returns 403"""
        response = api_client.get(f"{base_url}/api/auth/profile")
        assert response.status_code == 403
        print("✓ Unauthenticated profile access correctly rejected")
