import pytest
import requests
import time

# Tests for new features: free registration, admin user association, condominium CRUD

class TestFreeRegistration:
    """Test registration without invite code (free registration)"""

    def test_register_without_invite_code(self, api_client, base_url):
        """Test POST /api/auth/register - register without invite code"""
        timestamp = int(time.time())
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": f"test_user_{timestamp}@email.it",
            "password": "password123",
            "nome": "Test",
            "cognome": "User",
            "telefono": "+39 123 456789",
            "indirizzo": "Via Test, 1",
            "codice_fiscale": "TSTusr80A01H703X",
            "codice_invito": ""  # Empty invite code should be ignored
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == f"test_user_{timestamp}@email.it"
        assert data["user"]["ruolo"] == "condomino"
        print(f"✓ User registered without invite code: {data['user']['email']}")
        return data

    def test_register_minimal_fields(self, api_client, base_url):
        """Test registration with only required fields"""
        timestamp = int(time.time())
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": f"minimal_{timestamp}@email.it",
            "password": "testpass",
            "nome": "Minimal",
            "cognome": "Test",
            "telefono": "",
            "indirizzo": "",
            "codice_fiscale": "",
            "codice_invito": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == f"minimal_{timestamp}@email.it"
        print(f"✓ User registered with minimal fields: {data['user']['email']}")

    def test_register_duplicate_email(self, api_client, base_url):
        """Test that duplicate email is rejected"""
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": "mario.rossi@email.it",  # Already exists
            "password": "password123",
            "nome": "Duplicate",
            "cognome": "User",
            "telefono": "",
            "indirizzo": "",
            "codice_fiscale": "",
            "codice_invito": ""
        })
        assert response.status_code == 400
        print("✓ Duplicate email correctly rejected")


class TestAdminCondominiumCRUD:
    """Test admin condominium CRUD operations"""

    def test_create_condominium(self, api_client, base_url, admin_token):
        """Test POST /api/condomini - admin creates new condominium"""
        timestamp = int(time.time())
        response = api_client.post(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": f"Test Condominio {timestamp}",
                "indirizzo": "Via Test, 100",
                "codice_fiscale": "12345678901",
                "note": "Created during test"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["nome"] == f"Test Condominio {timestamp}"
        assert data["indirizzo"] == "Via Test, 100"
        print(f"✓ Condominium created: {data['nome']}")
        
        # Verify it appears in the list
        list_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        condomini = list_response.json()
        assert any(c["id"] == data["id"] for c in condomini)
        print("✓ Created condominium appears in list")
        
        return data["id"]

    def test_delete_condominium(self, api_client, base_url, admin_token):
        """Test DELETE /api/condomini/{id} - admin deletes condominium"""
        # First create a condominium to delete
        timestamp = int(time.time())
        create_response = api_client.post(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": f"To Delete {timestamp}",
                "indirizzo": "Via Delete, 1",
                "codice_fiscale": "",
                "note": ""
            }
        )
        assert create_response.status_code == 200
        cond_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = api_client.delete(
            f"{base_url}/api/condomini/{cond_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print(f"✓ Condominium deleted: {cond_id}")
        
        # Verify it's gone from the list
        list_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        condomini = list_response.json()
        assert not any(c["id"] == cond_id for c in condomini)
        print("✓ Deleted condominium no longer in list")

    def test_condomino_cannot_create_condominium(self, api_client, base_url, condomino_token):
        """Test that condomino cannot create condominium (admin only)"""
        response = api_client.post(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {condomino_token}"},
            json={
                "nome": "Unauthorized",
                "indirizzo": "Via Test",
                "codice_fiscale": "",
                "note": ""
            }
        )
        assert response.status_code == 403
        print("✓ Condomino correctly denied condominium creation")


class TestUserAssociation:
    """Test admin user-condominium association features"""

    def test_get_admin_utenti_with_associations(self, api_client, base_url, admin_token):
        """Test GET /api/admin/utenti - returns users with associazioni array and abilitato flag"""
        response = api_client.get(
            f"{base_url}/api/admin/utenti",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        
        # Check structure of each user
        for user in users:
            assert "id" in user
            assert "email" in user
            assert "associazioni" in user
            assert "abilitato" in user
            assert isinstance(user["associazioni"], list)
            assert isinstance(user["abilitato"], bool)
            
            # If user has associations, verify structure
            for assoc in user["associazioni"]:
                assert "assoc_id" in assoc
                assert "condominio_id" in assoc
                assert "condominio_nome" in assoc
                assert "unita_immobiliare" in assoc
                assert "qualita" in assoc
        
        print(f"✓ Admin utenti list retrieved: {len(users)} users")
        # Check that mario.rossi is enabled (has associations)
        mario = next((u for u in users if u["email"] == "mario.rossi@email.it"), None)
        if mario:
            assert mario["abilitato"] == True
            assert len(mario["associazioni"]) > 0
            print(f"✓ mario.rossi@email.it is abilitato with {len(mario['associazioni'])} association(s)")

    def test_associate_user_to_condominium(self, api_client, base_url, admin_token):
        """Test POST /api/admin/associa-utente - associate user to condominium"""
        # First create a test user
        timestamp = int(time.time())
        reg_response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": f"assoc_test_{timestamp}@email.it",
            "password": "password123",
            "nome": "Assoc",
            "cognome": "Test",
            "telefono": "",
            "indirizzo": "",
            "codice_fiscale": "",
            "codice_invito": ""
        })
        assert reg_response.status_code == 200
        user = reg_response.json()["user"]
        
        # Get a condominium ID
        cond_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert cond_response.status_code == 200
        condomini = cond_response.json()
        assert len(condomini) > 0
        cond_id = condomini[0]["id"]
        
        # Associate user to condominium
        assoc_response = api_client.post(
            f"{base_url}/api/admin/associa-utente",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": user["id"],
                "condominio_id": cond_id,
                "unita_immobiliare": "Interno 99, Piano 1",
                "qualita": "Proprietario"
            }
        )
        assert assoc_response.status_code == 200
        data = assoc_response.json()
        assert "message" in data
        assert "assoc_id" in data
        assert "condominio_nome" in data
        print(f"✓ User associated to condominium: {data['condominio_nome']}")
        
        # Verify association appears in admin utenti list
        utenti_response = api_client.get(
            f"{base_url}/api/admin/utenti",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = utenti_response.json()
        assoc_user = next((u for u in users if u["id"] == user["id"]), None)
        assert assoc_user is not None
        assert assoc_user["abilitato"] == True
        assert len(assoc_user["associazioni"]) >= 1
        assert any(a["assoc_id"] == data["assoc_id"] for a in assoc_user["associazioni"])
        print("✓ Association verified in admin utenti list")
        
        return data["assoc_id"]

    def test_disassociate_user(self, api_client, base_url, admin_token):
        """Test DELETE /api/admin/associazione/{id} - remove association"""
        # First create user and associate
        timestamp = int(time.time())
        reg_response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": f"disassoc_test_{timestamp}@email.it",
            "password": "password123",
            "nome": "Disassoc",
            "cognome": "Test",
            "telefono": "",
            "indirizzo": "",
            "codice_fiscale": "",
            "codice_invito": ""
        })
        user = reg_response.json()["user"]
        
        # Get a condominium
        cond_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        cond_id = cond_response.json()[0]["id"]
        
        # Associate
        assoc_response = api_client.post(
            f"{base_url}/api/admin/associa-utente",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": user["id"],
                "condominio_id": cond_id,
                "unita_immobiliare": "Test",
                "qualita": "Proprietario"
            }
        )
        assoc_id = assoc_response.json()["assoc_id"]
        
        # Now disassociate
        disassoc_response = api_client.delete(
            f"{base_url}/api/admin/associazione/{assoc_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert disassoc_response.status_code == 200
        data = disassoc_response.json()
        assert "message" in data
        print(f"✓ Association removed: {assoc_id}")
        
        # Verify user is now not abilitato
        utenti_response = api_client.get(
            f"{base_url}/api/admin/utenti",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = utenti_response.json()
        disassoc_user = next((u for u in users if u["id"] == user["id"]), None)
        assert disassoc_user is not None
        assert disassoc_user["abilitato"] == False
        assert len(disassoc_user["associazioni"]) == 0
        print("✓ User now shows abilitato=False with 0 associations")

    def test_duplicate_association_rejected(self, api_client, base_url, admin_token):
        """Test that associating same user to same condominium twice is rejected"""
        # Use existing mario.rossi user
        utenti_response = api_client.get(
            f"{base_url}/api/admin/utenti",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = utenti_response.json()
        mario = next((u for u in users if u["email"] == "mario.rossi@email.it"), None)
        assert mario is not None
        assert len(mario["associazioni"]) > 0
        
        # Try to associate mario to the same condominium again
        existing_cond_id = mario["associazioni"][0]["condominio_id"]
        
        response = api_client.post(
            f"{base_url}/api/admin/associa-utente",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": mario["id"],
                "condominio_id": existing_cond_id,
                "unita_immobiliare": "Different unit",
                "qualita": "Inquilino"
            }
        )
        assert response.status_code == 400
        print("✓ Duplicate association correctly rejected")

    def test_condomino_cannot_associate_users(self, api_client, base_url, condomino_token):
        """Test that condomino cannot access admin association endpoints"""
        response = api_client.post(
            f"{base_url}/api/admin/associa-utente",
            headers={"Authorization": f"Bearer {condomino_token}"},
            json={
                "user_id": "dummy",
                "condominio_id": "dummy",
                "unita_immobiliare": "",
                "qualita": "Proprietario"
            }
        )
        assert response.status_code == 403
        print("✓ Condomino correctly denied access to association endpoint")
