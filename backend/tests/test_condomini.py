import pytest

class TestCondomini:
    """Test condomini endpoints"""

    def test_get_condomini_as_condomino(self, api_client, base_url, condomino_token):
        """Test GET /api/condomini - list user condomini"""
        response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check first condominio structure
        assert "id" in data[0]
        assert "nome" in data[0]
        assert "indirizzo" in data[0]
        print(f"✓ Condomini list retrieved: {len(data)} condominio(i)")
        for cond in data:
            print(f"  - {cond['nome']}")

    def test_get_condomini_as_admin(self, api_client, base_url, admin_token):
        """Test GET /api/condomini - admin can see all condomini"""
        response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least 2 from seed
        print(f"✓ Admin condomini list: {len(data)} total")
