#!/usr/bin/env python3
"""
Comprehensive Backend Regression Test for Modular Router Architecture
Tests all major endpoint groups to verify zero regressions after refactoring.
"""
import requests
import json
import time
import os

# Backend URL from environment
BACKEND_URL = "https://backend-refactor-86.preview.emergentagent.com"
BASE_URL = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@tardugno.it"
ADMIN_PASSWORD = "admin123"
CONDOMINO_EMAIL = "mario.rossi@email.it"
CONDOMINO_PASSWORD = "password123"

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.condomino_token = None
        self.collaboratore_token = None
        self.fornitore_token = None
        self.results = []
        self.test_data = {}
        
    def log(self, message, success=True):
        status = "✅" if success else "❌"
        print(f"{status} {message}")
        self.results.append({"message": message, "success": success})
        
    def test_auth_flow(self):
        """Test authentication endpoints"""
        self.log("=== 1. AUTH FLOW TESTING ===")
        
        # Test admin login
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                self.log(f"Admin login successful - Token: {self.admin_token[:20]}...")
            else:
                self.log(f"Admin login failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"Admin login error: {str(e)}", False)
            return False
            
        # Test condomino login  
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": CONDOMINO_EMAIL,
                "password": CONDOMINO_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                self.condomino_token = data["token"]
                self.log(f"Condomino login successful - Token: {self.condomino_token[:20]}...")
            else:
                self.log(f"Condomino login failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"Condomino login error: {str(e)}", False)
            return False
            
        # Test profile endpoint
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Admin profile: {data['nome']} {data['cognome']} (ruolo: {data['ruolo']})")
            else:
                self.log(f"Profile endpoint failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"Profile endpoint error: {str(e)}", False)
            return False
            
        return True
        
    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        self.log("=== 2. ADMIN DASHBOARD TESTING ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/dashboard", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Dashboard data - Utenti: {data.get('utenti_totali', 0)}, Condomini: {data.get('condomini_totali', 0)}, Segnalazioni: {data.get('segnalazioni_totali', 0)}")
                return True
            else:
                self.log(f"Dashboard failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"Dashboard error: {str(e)}", False)
            return False
            
    def test_condomini(self):
        """Test condomini endpoints"""
        self.log("=== 3. CONDOMINI TESTING ===")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # GET condomini
        try:
            response = requests.get(f"{BASE_URL}/condomini", headers=headers)
            if response.status_code == 200:
                condomini = response.json()
                self.log(f"Found {len(condomini)} condomini")
                if condomini:
                    self.test_data['condominio_id'] = condomini[0]['id']
            else:
                self.log(f"GET condomini failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET condomini error: {str(e)}", False)
            return False
            
        # POST new condominio
        try:
            new_condo = {
                "nome": "Test Condominio Refactoring",
                "indirizzo": "Via Test, 123",
                "codice_fiscale": "90012345678",
                "note": "Created during regression testing"
            }
            response = requests.post(f"{BASE_URL}/condomini", headers=headers, json=new_condo)
            if response.status_code == 200:
                data = response.json()
                self.test_data['new_condo_id'] = data['id']
                self.log(f"Created condominio: {data['nome']} (ID: {data['id']})")
            else:
                self.log(f"POST condominio failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST condominio error: {str(e)}", False)
            return False
            
        # PUT update condominio
        try:
            if 'new_condo_id' in self.test_data:
                update_data = {"nome": "Test Condominio UPDATED"}
                response = requests.put(f"{BASE_URL}/condomini/{self.test_data['new_condo_id']}", 
                                      headers=headers, json=update_data)
                if response.status_code == 200:
                    self.log("Condominio update successful")
                else:
                    self.log(f"PUT condominio failed: {response.status_code}", False)
                    return False
        except Exception as e:
            self.log(f"PUT condominio error: {str(e)}", False)
            return False
            
        return True
        
    def test_segnalazioni(self):
        """Test segnalazioni endpoints"""
        self.log("=== 4. SEGNALAZIONI TESTING ===")
        
        # Create segnalazione as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            seg_data = {
                "tipologia": "Guasto elettrico",
                "descrizione": "Test segnalazione per regression test",
                "urgenza": "Media",
                "allegati": []
            }
            response = requests.post(f"{BASE_URL}/segnalazioni", headers=headers, json=seg_data)
            if response.status_code == 200:
                data = response.json()
                self.test_data['segnalazione_id'] = data['id']
                self.log(f"Created segnalazione: {data['protocollo']} (ID: {data['id']})")
            else:
                self.log(f"POST segnalazione failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST segnalazione error: {str(e)}", False)
            return False
            
        # GET segnalazioni as condomino
        try:
            response = requests.get(f"{BASE_URL}/segnalazioni", headers=headers)
            if response.status_code == 200:
                segnalazioni = response.json()
                self.log(f"Condomino sees {len(segnalazioni)} segnalazioni")
            else:
                self.log(f"GET segnalazioni (condomino) failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET segnalazioni (condomino) error: {str(e)}", False)
            
        # GET segnalazioni as admin
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/segnalazioni", headers=admin_headers)
            if response.status_code == 200:
                segnalazioni = response.json()
                self.log(f"Admin sees {len(segnalazioni)} segnalazioni")
            else:
                self.log(f"GET admin segnalazioni failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin segnalazioni error: {str(e)}", False)
            
        # Admin create segnalazione
        try:
            if 'condominio_id' in self.test_data:
                admin_seg = {
                    "condominio_id": self.test_data['condominio_id'],
                    "tipologia": "Manutenzione ordinaria",
                    "descrizione": "Admin created segnalazione for testing",
                    "urgenza": "Bassa",
                    "note_admin": "Test note",
                    "allegati": []
                }
                response = requests.post(f"{BASE_URL}/admin/segnalazioni", headers=admin_headers, json=admin_seg)
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"Admin created segnalazione: {data['protocollo']}")
                else:
                    self.log(f"Admin POST segnalazione failed: {response.status_code} - {response.text}", False)
        except Exception as e:
            self.log(f"Admin POST segnalazione error: {str(e)}", False)
            
        # Update segnalazione as admin
        try:
            if 'segnalazione_id' in self.test_data:
                update_data = {
                    "tipologia": "Guasto elettrico UPDATED",
                    "descrizione": "Updated description",
                    "urgenza": "Alta",
                    "note_admin": "Admin updated this"
                }
                response = requests.put(f"{BASE_URL}/admin/segnalazioni/{self.test_data['segnalazione_id']}", 
                                      headers=admin_headers, json=update_data)
                if response.status_code == 200:
                    self.log("Admin segnalazione update successful")
                else:
                    self.log(f"Admin PUT segnalazione failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"Admin PUT segnalazione error: {str(e)}", False)
            
        return True
        
    def test_appuntamenti(self):
        """Test appuntamenti endpoints"""
        self.log("=== 5. APPUNTAMENTI TESTING ===")
        
        # Create appuntamento as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            app_data = {
                "tipo": "Sopralluogo",
                "descrizione": "Test appuntamento for regression",
                "data_preferita": "2026-04-15",
                "ora_preferita": "10:00",
                "note": "Test note"
            }
            response = requests.post(f"{BASE_URL}/appuntamenti", headers=headers, json=app_data)
            if response.status_code == 200:
                data = response.json()
                self.test_data['appuntamento_id'] = data['id']
                self.log(f"Created appuntamento: {data['tipo']} (ID: {data['id']})")
            else:
                self.log(f"POST appuntamento failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST appuntamento error: {str(e)}", False)
            return False
            
        # GET appuntamenti as condomino
        try:
            response = requests.get(f"{BASE_URL}/appuntamenti", headers=headers)
            if response.status_code == 200:
                appuntamenti = response.json()
                self.log(f"Condomino sees {len(appuntamenti)} appuntamenti")
            else:
                self.log(f"GET appuntamenti failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET appuntamenti error: {str(e)}", False)
            
        # GET admin appuntamenti
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/appuntamenti", headers=admin_headers)
            if response.status_code == 200:
                appuntamenti = response.json()
                self.log(f"Admin sees {len(appuntamenti)} appuntamenti")
            else:
                self.log(f"GET admin appuntamenti failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin appuntamenti error: {str(e)}", False)
            
        return True
        
    def test_avvisi(self):
        """Test avvisi endpoints"""
        self.log("=== 6. AVVISI TESTING ===")
        
        # GET avvisi as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            response = requests.get(f"{BASE_URL}/avvisi", headers=headers)
            if response.status_code == 200:
                avvisi = response.json()
                self.log(f"Found {len(avvisi)} avvisi")
                if avvisi:
                    self.test_data['avviso_id'] = avvisi[0]['id']
            else:
                self.log(f"GET avvisi failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET avvisi error: {str(e)}", False)
            return False
            
        # Create avviso as admin
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            if 'condominio_id' in self.test_data:
                avviso_data = {
                    "condominio_id": self.test_data['condominio_id'],
                    "titolo": "Test Avviso Regression",
                    "testo": "Questo è un avviso di test per la regression",
                    "categoria": "Avviso generico"
                }
                response = requests.post(f"{BASE_URL}/admin/avvisi", headers=admin_headers, json=avviso_data)
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"Created avviso: {data['titolo']}")
                else:
                    self.log(f"POST avviso failed: {response.status_code} - {response.text}", False)
        except Exception as e:
            self.log(f"POST avviso error: {str(e)}", False)
            
        # Mark avviso as read
        try:
            if 'avviso_id' in self.test_data:
                response = requests.put(f"{BASE_URL}/avvisi/{self.test_data['avviso_id']}/letto", headers=headers)
                if response.status_code == 200:
                    self.log("Avviso marked as read")
                else:
                    self.log(f"PUT avviso letto failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"PUT avviso letto error: {str(e)}", False)
            
        return True
        
    def test_notifiche(self):
        """Test notifiche endpoints"""
        self.log("=== 7. NOTIFICHE TESTING ===")
        
        headers = {"Authorization": f"Bearer {self.condomino_token}"}
        
        # GET notifiche
        try:
            response = requests.get(f"{BASE_URL}/notifiche", headers=headers)
            if response.status_code == 200:
                notifiche = response.json()
                self.log(f"Found {len(notifiche)} notifiche")
            else:
                self.log(f"GET notifiche failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET notifiche error: {str(e)}", False)
            return False
            
        # GET notifiche count
        try:
            response = requests.get(f"{BASE_URL}/notifiche/count", headers=headers)
            if response.status_code == 200:
                count_data = response.json()
                self.log(f"Notifiche count - Non lette: {count_data.get('non_lette', 0)}, Totali: {count_data.get('totali', 0)}")
            else:
                self.log(f"GET notifiche count failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET notifiche count error: {str(e)}", False)
            
        # Mark all as read
        try:
            response = requests.put(f"{BASE_URL}/notifiche/letto-tutte", headers=headers)
            if response.status_code == 200:
                self.log("All notifiche marked as read")
            else:
                self.log(f"PUT letto-tutte failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"PUT letto-tutte error: {str(e)}", False)
            
        return True
        
    def test_trasmissioni(self):
        """Test trasmissioni endpoints"""
        self.log("=== 8. TRASMISSIONI TESTING ===")
        
        # Create trasmissione as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            tras_data = {
                "oggetto": "Test Trasmissione Regression",
                "messaggio": "Messaggio di test per la regression",
                "allegati": []
            }
            response = requests.post(f"{BASE_URL}/trasmissioni", headers=headers, json=tras_data)
            if response.status_code == 200:
                data = response.json()
                self.test_data['trasmissione_id'] = data['id']
                self.log(f"Created trasmissione: {data['oggetto']} (ID: {data['id']})")
            else:
                self.log(f"POST trasmissione failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST trasmissione error: {str(e)}", False)
            return False
            
        # GET trasmissioni as condomino
        try:
            response = requests.get(f"{BASE_URL}/trasmissioni", headers=headers)
            if response.status_code == 200:
                trasmissioni = response.json()
                self.log(f"Condomino sees {len(trasmissioni)} trasmissioni")
            else:
                self.log(f"GET trasmissioni failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET trasmissioni error: {str(e)}", False)
            
        # GET admin trasmissioni
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/trasmissioni", headers=admin_headers)
            if response.status_code == 200:
                trasmissioni = response.json()
                self.log(f"Admin sees {len(trasmissioni)} trasmissioni")
            else:
                self.log(f"GET admin trasmissioni failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin trasmissioni error: {str(e)}", False)
            
        return True
        
    def test_richieste_documenti(self):
        """Test richieste documenti endpoints"""
        self.log("=== 9. RICHIESTE DOCUMENTI TESTING ===")
        
        # Create richiesta as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            req_data = {
                "tipo_documento": "Estratto conto",
                "descrizione": "Test richiesta per regression",
                "note": "Note di test"
            }
            response = requests.post(f"{BASE_URL}/richieste-documenti", headers=headers, json=req_data)
            if response.status_code == 200:
                data = response.json()
                self.test_data['richiesta_id'] = data['id']
                self.log(f"Created richiesta: {data['tipo_documento']} (ID: {data['id']})")
            else:
                self.log(f"POST richiesta failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST richiesta error: {str(e)}", False)
            return False
            
        # GET richieste as condomino
        try:
            response = requests.get(f"{BASE_URL}/richieste-documenti", headers=headers)
            if response.status_code == 200:
                richieste = response.json()
                self.log(f"Condomino sees {len(richieste)} richieste")
            else:
                self.log(f"GET richieste failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET richieste error: {str(e)}", False)
            
        # GET admin richieste
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/richieste-documenti", headers=admin_headers)
            if response.status_code == 200:
                richieste = response.json()
                self.log(f"Admin sees {len(richieste)} richieste")
            else:
                self.log(f"GET admin richieste failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin richieste error: {str(e)}", False)
            
        return True
        
    def test_estratto_conto(self):
        """Test estratto conto endpoints"""
        self.log("=== 10. ESTRATTO CONTO TESTING ===")
        
        # GET estratto conto as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            response = requests.get(f"{BASE_URL}/estratto-conto", headers=headers)
            if response.status_code == 200:
                estratti = response.json()
                self.log(f"Found {len(estratti)} estratti conto")
            else:
                self.log(f"GET estratto-conto failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET estratto-conto error: {str(e)}", False)
            return False
            
        # Create estratto as admin
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            if 'condominio_id' in self.test_data:
                estratto_data = {
                    "condominio_id": self.test_data['condominio_id'],
                    "user_email": CONDOMINO_EMAIL,
                    "periodo": "2026-Q1",
                    "saldo_precedente": 1000.00,
                    "entrate": 500.00,
                    "uscite": 300.00,
                    "saldo_attuale": 1200.00,
                    "dettaglio": "Estratto conto test per regression"
                }
                response = requests.post(f"{BASE_URL}/admin/estratto-conto", headers=admin_headers, json=estratto_data)
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"Created estratto conto: {data['periodo']} (saldo: €{data['saldo_attuale']})")
                else:
                    self.log(f"POST estratto failed: {response.status_code} - {response.text}", False)
        except Exception as e:
            self.log(f"POST estratto error: {str(e)}", False)
            
        # GET admin estratti
        try:
            response = requests.get(f"{BASE_URL}/admin/estratti-conto", headers=admin_headers)
            if response.status_code == 200:
                estratti = response.json()
                self.log(f"Admin sees {len(estratti)} estratti conto")
            else:
                self.log(f"GET admin estratti failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin estratti error: {str(e)}", False)
            
        return True
        
    def test_config(self):
        """Test config endpoints"""
        self.log("=== 11. CONFIG TESTING ===")
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # GET admin config
        try:
            response = requests.get(f"{BASE_URL}/admin/config", headers=admin_headers)
            if response.status_code == 200:
                config = response.json()
                self.log(f"Admin config retrieved - Keys: {list(config.keys())}")
            else:
                self.log(f"GET admin config failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET admin config error: {str(e)}", False)
            return False
            
        # PUT admin config
        try:
            config_update = {
                "nome_studio": "Studio Tardugno & Bonifacio TEST",
                "email_contatto": "test@tardugno.it"
            }
            response = requests.put(f"{BASE_URL}/admin/config", headers=admin_headers, json=config_update)
            if response.status_code == 200:
                self.log("Admin config update successful")
            else:
                self.log(f"PUT admin config failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"PUT admin config error: {str(e)}", False)
            
        # GET public config
        try:
            response = requests.get(f"{BASE_URL}/config/public")
            if response.status_code == 200:
                public_config = response.json()
                self.log(f"Public config retrieved - Keys: {list(public_config.keys())}")
            else:
                self.log(f"GET public config failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET public config error: {str(e)}", False)
            
        return True
        
    def test_csv_export(self):
        """Test CSV export endpoints"""
        self.log("=== 12. CSV EXPORT TESTING ===")
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        exports = [
            ("segnalazioni", "segnalazioni"),
            ("appuntamenti", "appuntamenti"), 
            ("utenti", "users")
        ]
        
        for export_name, expected_type in exports:
            try:
                response = requests.get(f"{BASE_URL}/admin/export/{export_name}", headers=admin_headers)
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'csv' in content_type or 'text' in content_type:
                        lines = response.text.strip().split('\n')
                        self.log(f"CSV export {export_name}: {len(lines)} lines")
                    else:
                        self.log(f"CSV export {export_name}: Unexpected content-type {content_type}", False)
                else:
                    self.log(f"CSV export {export_name} failed: {response.status_code}", False)
            except Exception as e:
                self.log(f"CSV export {export_name} error: {str(e)}", False)
                
        return True
        
    def test_fornitori(self):
        """Test fornitori endpoints"""
        self.log("=== 13. FORNITORI TESTING ===")
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create fornitore
        try:
            fornitore_data = {
                "nome": "Test Fornitore Regression",
                "cognome": "Test",
                "email": "fornitore.test@example.com",
                "password": "Fornitore123!",
                "telefono": "+39 333 999 8888",
                "azienda": "Test Forniture Srl",
                "specializzazione": "Elettricista"
            }
            response = requests.post(f"{BASE_URL}/admin/fornitori", headers=admin_headers, json=fornitore_data)
            if response.status_code == 200:
                data = response.json()
                self.test_data['fornitore_id'] = data['id']
                self.log(f"Created fornitore: {data['nome']} {data['cognome']} (ID: {data['id']})")
            else:
                self.log(f"POST fornitore failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"POST fornitore error: {str(e)}", False)
            return False
            
        # GET fornitori
        try:
            response = requests.get(f"{BASE_URL}/admin/fornitori", headers=admin_headers)
            if response.status_code == 200:
                fornitori = response.json()
                self.log(f"Found {len(fornitori)} fornitori")
            else:
                self.log(f"GET fornitori failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET fornitori error: {str(e)}", False)
            
        return True
        
    def test_collaboratori(self):
        """Test collaboratori endpoints"""
        self.log("=== 14. COLLABORATORI TESTING ===")
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # GET collaboratori
        try:
            response = requests.get(f"{BASE_URL}/admin/collaboratori", headers=admin_headers)
            if response.status_code == 200:
                collaboratori = response.json()
                self.log(f"Found {len(collaboratori)} collaboratori")
            else:
                self.log(f"GET collaboratori failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET collaboratori error: {str(e)}", False)
            return False
            
        return True
        
    def test_sopralluoghi(self):
        """Test sopralluoghi endpoints"""
        self.log("=== 15. SOPRALLUOGHI TESTING ===")
        
        # Create collaboratore first
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            collab_data = {
                "nome": "Test",
                "cognome": "Collaboratore",
                "email": "collab.test@example.com",
                "password": "Collab123!"
            }
            response = requests.post(f"{BASE_URL}/admin/collaboratori", headers=admin_headers, json=collab_data)
            if response.status_code == 200:
                self.log("Collaboratore created for sopralluoghi test")
                
                # Login as collaboratore
                login_response = requests.post(f"{BASE_URL}/collaboratore/login", json={
                    "email": "collab.test@example.com",
                    "password": "Collab123!"
                })
                if login_response.status_code == 200:
                    collab_data = login_response.json()
                    self.collaboratore_token = collab_data["token"]
                    self.log("Collaboratore login successful")
                else:
                    self.log(f"Collaboratore login failed: {login_response.status_code}", False)
                    return False
            else:
                self.log(f"Create collaboratore failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"Collaboratore setup error: {str(e)}", False)
            return False
            
        # GET sopralluoghi
        try:
            collab_headers = {"Authorization": f"Bearer {self.collaboratore_token}"}
            response = requests.get(f"{BASE_URL}/sopralluoghi", headers=collab_headers)
            if response.status_code == 200:
                sopralluoghi = response.json()
                self.log(f"Found {len(sopralluoghi)} sopralluoghi")
            else:
                self.log(f"GET sopralluoghi failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET sopralluoghi error: {str(e)}", False)
            
        return True
        
    def test_privacy_gdpr(self):
        """Test privacy/GDPR endpoints"""
        self.log("=== 16. PRIVACY/GDPR TESTING ===")
        
        # GET active informativa (public)
        try:
            response = requests.get(f"{BASE_URL}/informativa/attiva")
            if response.status_code == 200:
                informativa = response.json()
                self.log(f"Active informativa: v{informativa['versione']}")
            else:
                self.log(f"GET informativa/attiva failed: {response.status_code}", False)
                return False
        except Exception as e:
            self.log(f"GET informativa/attiva error: {str(e)}", False)
            return False
            
        # GET consensi as condomino
        try:
            headers = {"Authorization": f"Bearer {self.condomino_token}"}
            response = requests.get(f"{BASE_URL}/consensi/miei", headers=headers)
            if response.status_code == 200:
                consensi = response.json()
                self.log(f"Found {len(consensi)} consensi")
            else:
                self.log(f"GET consensi failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET consensi error: {str(e)}", False)
            
        # GET privacy data
        try:
            response = requests.get(f"{BASE_URL}/privacy/miei-dati", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Privacy data - Keys: {list(data.keys())}")
            else:
                self.log(f"GET miei-dati failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET miei-dati error: {str(e)}", False)
            
        # GET privacy requests
        try:
            response = requests.get(f"{BASE_URL}/privacy/mie-richieste", headers=headers)
            if response.status_code == 200:
                richieste = response.json()
                self.log(f"Found {len(richieste)} privacy requests")
            else:
                self.log(f"GET privacy requests failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET privacy requests error: {str(e)}", False)
            
        # Admin privacy endpoints
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/privacy/richieste", headers=admin_headers)
            if response.status_code == 200:
                richieste = response.json()
                self.log(f"Admin sees {len(richieste)} privacy requests")
            else:
                self.log(f"GET admin privacy requests failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET admin privacy requests error: {str(e)}", False)
            
        try:
            response = requests.get(f"{BASE_URL}/admin/privacy/richieste/count-scadenza", headers=admin_headers)
            if response.status_code == 200:
                count_data = response.json()
                self.log(f"Privacy requests count - Scadenza imminente: {count_data.get('scadenza_imminente', 0)}")
            else:
                self.log(f"GET privacy count failed: {response.status_code}", False)
        except Exception as e:
            self.log(f"GET privacy count error: {str(e)}", False)
            
        return True
        
    def test_seed(self):
        """Test seed endpoint"""
        self.log("=== 17. SEED TESTING ===")
        
        try:
            response = requests.post(f"{BASE_URL}/seed")
            if response.status_code == 200:
                data = response.json()
                self.log(f"Seed response: {data['message']}")
                return True
            else:
                self.log(f"Seed failed: {response.status_code} - {response.text}", False)
                return False
        except Exception as e:
            self.log(f"Seed error: {str(e)}", False)
            return False
            
    def run_comprehensive_test(self):
        """Run all regression tests"""
        self.log("🚀 STARTING COMPREHENSIVE BACKEND REGRESSION TEST")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        test_methods = [
            self.test_auth_flow,
            self.test_admin_dashboard, 
            self.test_condomini,
            self.test_segnalazioni,
            self.test_appuntamenti,
            self.test_avvisi,
            self.test_notifiche,
            self.test_trasmissioni,
            self.test_richieste_documenti,
            self.test_estratto_conto,
            self.test_config,
            self.test_csv_export,
            self.test_fornitori,
            self.test_collaboratori,
            self.test_sopralluoghi,
            self.test_privacy_gdpr,
            self.test_seed
        ]
        
        success_count = 0
        for test_method in test_methods:
            try:
                if test_method():
                    success_count += 1
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                self.log(f"Test {test_method.__name__} crashed: {str(e)}", False)
                
        self.log(f"\n📊 REGRESSION TEST SUMMARY:")
        self.log(f"✅ Successful test groups: {success_count}/{len(test_methods)}")
        
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            self.log(f"❌ Failed tests: {len(failed_tests)}")
            for failed in failed_tests:
                self.log(f"  - {failed['message']}")
        else:
            self.log("🎉 ALL REGRESSION TESTS PASSED! Zero regressions detected.")
            
        return len(failed_tests) == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n✅ BACKEND REFACTORING REGRESSION TEST: PASSED")
        print("All major endpoint groups working correctly after modular refactoring.")
    else:
        print("\n❌ BACKEND REFACTORING REGRESSION TEST: ISSUES DETECTED") 
        print("Some endpoints may have been broken during refactoring.")