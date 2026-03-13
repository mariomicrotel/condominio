import pytest

class TestRichiesteDocumenti:
    """Test richieste documenti (document requests) endpoints"""

    def test_create_richiesta_documento(self, api_client, base_url, condomino_token):
        """Test POST /api/richieste-documenti - create document request and verify"""
        # Get condominio ID
        cond_response = api_client.get(
            f"{base_url}/api/condomini",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        condomini = cond_response.json()
        cond_id = condomini[0]["id"]

        # Create richiesta
        payload = {
            "condominio_id": cond_id,
            "tipo_documento": "Certificato di agibilità",
            "note": "TEST_Richiesta urgente per pratica bancaria",
            "formato": "PDF"
        }
        response = api_client.post(
            f"{base_url}/api/richieste-documenti",
            headers={"Authorization": f"Bearer {condomino_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["tipo_documento"] == "Certificato di agibilità"
        assert data["stato"] == "In attesa"
        assert data["formato"] == "PDF"
        assert "TEST_" in data["note"]
        print(f"✓ Richiesta documento created: {data['tipo_documento']}")

        # Verify by getting list
        get_response = api_client.get(
            f"{base_url}/api/richieste-documenti",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert get_response.status_code == 200
        richieste = get_response.json()
        assert any(r["id"] == data["id"] for r in richieste)
        print(f"✓ Richiesta documento persistence verified")
