import pytest

class TestSegnalazioni:
    """Test segnalazioni (fault reports) endpoints"""

    def test_create_segnalazione(self, api_client, base_url, condomino_token):
        """Test POST /api/segnalazioni - create fault report and verify persistence"""
        # First, get condomini to get a valid ID
        cond_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert cond_response.status_code == 200
        condomini = cond_response.json()
        assert len(condomini) > 0
        cond_id = condomini[0]["id"]

        # Create segnalazione
        payload = {
            "condominio_id": cond_id,
            "qualita": "Proprietario",
            "tipologia": "Guasto idraulico",
            "descrizione": "TEST_Perdita d'acqua dal soffitto del bagno",
            "urgenza": "Alta"
        }
        response = api_client.post(
            f"{base_url}/api/segnalazioni",
            headers={"Authorization": f"Bearer {condomino_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "protocollo" in data
        assert data["tipologia"] == "Guasto idraulico"
        assert data["stato"] == "Inviata"
        assert data["urgenza"] == "Alta"
        seg_id = data["id"]
        print(f"✓ Segnalazione created: {data['protocollo']}")

        # Verify persistence by getting it back
        get_response = api_client.get(
            f"{base_url}/api/segnalazioni/{seg_id}",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert get_response.status_code == 200
        retrieved = get_response.json()
        assert retrieved["id"] == seg_id
        assert retrieved["tipologia"] == "Guasto idraulico"
        assert "TEST_" in retrieved["descrizione"]
        print(f"✓ Segnalazione persistence verified: {seg_id}")

    def test_get_segnalazioni_list(self, api_client, base_url, condomino_token):
        """Test GET /api/segnalazioni - list fault reports"""
        response = api_client.get(
            f"{base_url}/api/segnalazioni",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Segnalazioni list retrieved: {len(data)} segnalazione(i)")
        if len(data) > 0:
            assert "id" in data[0]
            assert "protocollo" in data[0]
            assert "stato" in data[0]
