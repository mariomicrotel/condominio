import pytest

class TestAdmin:
    """Test admin endpoints"""

    def test_admin_dashboard(self, api_client, base_url, admin_token):
        """Test GET /api/admin/dashboard - admin dashboard stats"""
        response = api_client.get(
            f"{base_url}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "totale_utenti" in data
        assert "totale_condomini" in data
        assert "segnalazioni_aperte" in data
        assert "richieste_in_attesa" in data
        assert "appuntamenti_da_confermare" in data
        assert "totale_avvisi" in data
        print(f"✓ Admin dashboard stats retrieved:")
        print(f"  - Utenti: {data['totale_utenti']}")
        print(f"  - Condomini: {data['totale_condomini']}")
        print(f"  - Segnalazioni aperte: {data['segnalazioni_aperte']}")
        print(f"  - Richieste in attesa: {data['richieste_in_attesa']}")

    def test_admin_segnalazioni(self, api_client, base_url, admin_token):
        """Test GET /api/admin/segnalazioni - admin can see all segnalazioni"""
        response = api_client.get(
            f"{base_url}/api/admin/segnalazioni",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin segnalazioni list: {len(data)} total")

    def test_admin_utenti(self, api_client, base_url, admin_token):
        """Test GET /api/admin/utenti - admin can see all users"""
        response = api_client.get(
            f"{base_url}/api/admin/utenti",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least admin and mario.rossi
        print(f"✓ Admin utenti list: {len(data)} total users")

    def test_admin_access_denied_for_condomino(self, api_client, base_url, condomino_token):
        """Test that condomino cannot access admin endpoints"""
        response = api_client.get(
            f"{base_url}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert response.status_code == 403
        print("✓ Condomino correctly denied admin access")
