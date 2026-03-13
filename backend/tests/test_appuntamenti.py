import pytest
from datetime import datetime, timedelta

class TestAppuntamenti:
    """Test appuntamenti (appointments) endpoints"""

    def test_create_appuntamento(self, api_client, base_url, condomino_token):
        """Test POST /api/appuntamenti - create appointment and verify"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        payload = {
            "motivo": "TEST_Consulenza per lavori di ristrutturazione",
            "data_richiesta": future_date,
            "fascia_oraria": "Mattina (9:00-13:00)",
            "note": "Preferibilmente dopo le 10:00"
        }
        response = api_client.post(
            f"{base_url}/api/appuntamenti",
            headers={"Authorization": f"Bearer {condomino_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "TEST_" in data["motivo"]
        assert data["stato"] == "In attesa di conferma"
        assert data["data_richiesta"] == future_date
        print(f"✓ Appuntamento created: {data['motivo'][:50]}")

        # Verify by getting list
        get_response = api_client.get(
            f"{base_url}/api/appuntamenti",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert get_response.status_code == 200
        appuntamenti = get_response.json()
        assert any(a["id"] == data["id"] for a in appuntamenti)
        print(f"✓ Appuntamento persistence verified: {len(appuntamenti)} total")
