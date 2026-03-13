import pytest

class TestAvvisi:
    """Test avvisi (announcements/bulletin board) endpoints"""

    def test_get_avvisi(self, api_client, base_url, condomino_token):
        """Test GET /api/avvisi - list announcements"""
        response = api_client.get(
            f"{base_url}/api/avvisi",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # At least 3 from seed
        print(f"✓ Avvisi list retrieved: {len(data)} avviso(i)")
        
        # Check structure
        if len(data) > 0:
            assert "id" in data[0]
            assert "titolo" in data[0]
            assert "testo" in data[0]
            assert "categoria" in data[0]
            assert "letto" in data[0]
            print(f"  First avviso: {data[0]['titolo']}")

    def test_mark_avviso_letto(self, api_client, base_url, condomino_token):
        """Test PUT /api/avvisi/{id}/letto - mark announcement as read"""
        # Get avvisi first
        response = api_client.get(
            f"{base_url}/api/avvisi",
            headers={"Authorization": f"Bearer {condomino_token}"}
        )
        avvisi = response.json()
        if len(avvisi) > 0:
            avviso_id = avvisi[0]["id"]
            mark_response = api_client.put(
                f"{base_url}/api/avvisi/{avviso_id}/letto",
                headers={"Authorization": f"Bearer {condomino_token}"}
            )
            assert mark_response.status_code == 200
            print(f"✓ Avviso marked as read: {avviso_id}")
