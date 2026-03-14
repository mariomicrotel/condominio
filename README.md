# 🏢 Studio Tardugno & Bonifacio — App Condomini

**Applicazione mobile per la gestione condominiale** sviluppata per lo Studio di Amministrazione Condominiale Tardugno & Bonifacio di Salerno.

L'app consente ai **condomini** (residenti) di interagire con lo studio e ai **amministratori** di gestire tutte le operazioni da un pannello dedicato.

---

## 📋 Indice

- [Panoramica](#-panoramica)
- [Funzionalità](#-funzionalità)
- [Architettura Tecnica](#-architettura-tecnica)
- [Struttura del Progetto](#-struttura-del-progetto)
- [API Backend](#-api-backend)
- [Schermate App](#-schermate-app)
- [Autenticazione e Ruoli](#-autenticazione-e-ruoli)
- [Configurazione e Avvio](#-configurazione-e-avvio)
- [Variabili d'Ambiente](#-variabili-dambiente)
- [Database Schema](#-database-schema)
- [Permessi Device](#-permessi-device)
- [Tecnologie Utilizzate](#-tecnologie-utilizzate)

---

## 🌐 Panoramica

| Caratteristica | Dettaglio |
|---|---|
| **Piattaforma** | Android / iOS / Web (responsive) |
| **Lingua** | Italiano |
| **Backend** | FastAPI (Python) |
| **Frontend** | Expo (React Native) con Expo Router |
| **Database** | MongoDB |
| **Autenticazione** | JWT (JSON Web Token) |
| **Upload File** | Multipart con storage su disco |

---

## ✨ Funzionalità

### 👤 Area Condomino (Residente)

| Funzionalità | Descrizione |
|---|---|
| **Segnalazione Guasti** | Invia segnalazioni con descrizione, livello di urgenza e **allegati multimediali** (foto, video, PDF — fino a 10 file, max 50MB ciascuno) |
| **Richiesta Documenti** | Richiedi documenti allo studio (bilanci, verbali, certificazioni) |
| **Trasmissione Documenti** | Invia documenti allo studio con note e allegati |
| **Prenotazione Appuntamenti** | Prenota appuntamenti con fascia oraria preferita |
| **Il Mio Condominio** | Visualizza dati del condominio ed estratto conto personale |
| **Bacheca Condominiale** | Consulta avvisi, convocazioni assemblee, comunicazioni urgenti |
| **Notifiche In-App** | Ricevi notifiche su aggiornamenti delle tue richieste con contatore in tempo reale |
| **Profilo** | Gestisci i tuoi dati personali |
| **Contatti** | Visualizza recapiti dello studio |
| **Chi Siamo** | Informazioni sullo studio |

### 🔧 Pannello Amministratore

| Funzionalità | Descrizione |
|---|---|
| **Dashboard** | Riepilogo con statistiche (utenti, condomini, segnalazioni, appuntamenti, avvisi) — card cliccabili per navigazione rapida |
| **Gestione Condomini** | CRUD completo dei condomini |
| **Gestione Utenti** | Visualizza utenti registrati, associali a condomini per abilitarli, disassociali |
| **Segnalazioni** | Visualizza, cambia stato (Presa in carico, In lavorazione, Risolta), **crea nuove segnalazioni**, **modifica segnalazioni esistenti**, visualizza allegati |
| **Creazione Segnalazioni** | **NUOVA**: L'admin può creare segnalazioni da zero selezionando condominio, tipologia, descrizione, urgenza e allegando file |
| **Modifica Segnalazioni** | **NUOVA**: L'admin può modificare tipologia, descrizione, urgenza e allegati di segnalazioni esistenti prima di assegnarle |
| **Gestione Fornitori** | **NUOVA**: CRUD completo dei fornitori esterni (idraulici, elettricisti, ecc.) con anagrafica completa |
| **Assegnazione Fornitori** | **NUOVA**: Assegna segnalazioni a fornitori specificando note e data prevista intervento |
| **Appuntamenti** | Conferma, completa o annulla appuntamenti |
| **Avvisi / Bacheca** | Pubblica avvisi per specifici condomini o per tutti |
| **Trasmissioni Documenti** | Gestisci documenti ricevuti dai condomini, aggiorna stato |
| **Impostazioni** | Configura informazioni studio (telefono, email, PEC), chiavi API (Google Maps, Firebase) |
| **Estratti Conto** | Inserisci/aggiorna estratti conto per ogni utente abilitato |
| **Export CSV** | Esporta segnalazioni, appuntamenti, utenti in formato CSV |

### 🔨 Portale Fornitore (NUOVO)

| Funzionalità | Descrizione |
|---|---|
| **Dashboard Fornitore** | Statistiche interventi: totali, da eseguire, in verifica, completati |
| **Lista Interventi** | Visualizza interventi assegnati con filtri per stato |
| **Dettaglio Intervento** | Vedi dettagli segnalazione, indirizzo condominio, foto allegate |
| **Rapportino Lavori** | Compila rapportino con data, descrizione lavori, esito, materiali e foto |
| **Stato Intervento** | Traccia lo stato (assegnato → completato → chiuso) |
| **Notifiche** | Ricevi notifiche su nuovi incarichi e aggiornamenti |

### 🔍 Modulo Sopralluoghi (NUOVO)

| Funzionalità | Descrizione |
|---|---|
| **Gestione Collaboratori** | CRUD collaboratori dello studio con login dedicato |
| **Creazione Sopralluogo** | Avvia un nuovo sopralluogo per un condominio con data, ora, motivo |
| **Checklist 25 Voci** | Verifica standardizzata: ascensore, balconi, impianti, pulizia, etc. |
| **Sistema Semaforo** | 🟢 OK, 🟡 Anomalia, ⚪ Non controllato per ogni voce |
| **Documentazione Anomalie** | Cliccando su Anomalia si apre il modale per documentare con descrizione, gravità, foto |
| **Note Vocali Multiple** | Registra **più note vocali** per ogni anomalia con riproduzione integrata (play/stop) |
| **Creazione Segnalazione da Anomalia** | Apri segnalazione automatica da anomalia con fornitore assegnato direttamente dal sopralluogo |
| **Flusso Contestuale** | Prima compili tutte le anomalie, poi chiudi il sopralluogo (non viceversa) |
| **Chiusura Sopralluogo** | Valutazione generale (Buono/Discreto/Sufficiente/Critico), note finali, conferma obbligatoria |
| **Storico Sopralluoghi** | Lista con riepilogo semafori (✓ OK, ⚠ Anomalie, ○ Non controllati) per ogni sopralluogo |

---

## 🏗 Architettura Tecnica

```
┌─────────────────────────────────────────────────────┐
│                    Client (Mobile/Web)               │
│              Expo (React Native) - Porta 3000        │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Login   │ │   Home   │ │  Admin   │  ...        │
│  └──────────┘ └──────────┘ └──────────┘            │
│         │            │            │                  │
│         └────────────┼────────────┘                  │
│                      │ API calls via /api/*          │
└──────────────────────┼──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Kubernetes     │
              │  Ingress/Proxy  │
              │  /api/* → :8001 │
              │  /*     → :3000 │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  FastAPI Backend │
              │  Porta 8001     │
              │                 │
              │  • Auth (JWT)   │
              │  • CRUD APIs    │
              │  • File Upload  │
              │  • CSV Export   │
              └────────┬────────┘
                       │
           ┌───────────┼───────────┐
           │                       │
  ┌────────▼────────┐   ┌─────────▼─────────┐
  │    MongoDB      │   │   File Storage    │
  │  (porta 27017)  │   │  /backend/uploads │
  └─────────────────┘   └───────────────────┘
```

---

## 📁 Struttura del Progetto

```
/app
├── README.md                          # Questo file
├── backend/
│   ├── .env                           # Variabili d'ambiente backend
│   ├── requirements.txt               # Dipendenze Python
│   ├── server.py                      # Server FastAPI (tutto il backend)
│   ├── uploads/                       # File caricati dagli utenti
│   └── tests/                         # Test automatizzati
│       ├── conftest.py
│       ├── test_auth_and_basic.py
│       ├── test_admin.py
│       ├── test_segnalazioni.py
│       ├── test_appuntamenti.py
│       ├── test_avvisi.py
│       ├── test_condomini.py
│       ├── test_richieste_documenti.py
│       └── test_new_features.py
│
├── frontend/
│   ├── .env                           # Variabili d'ambiente frontend
│   ├── app.json                       # Configurazione Expo
│   ├── package.json                   # Dipendenze Node.js
│   │
│   ├── app/                           # 📱 Schermate (file-based routing)
│   │   ├── _layout.tsx                # Layout root + protezione autenticazione
│   │   ├── index.tsx                  # Redirect iniziale
│   │   ├── login.tsx                  # Schermata di login
│   │   ├── register.tsx               # Registrazione nuovo utente
│   │   ├── home.tsx                   # Dashboard condomino
│   │   ├── admin.tsx                  # Pannello amministratore completo
│   │   ├── segnalazioni.tsx           # Form segnalazione guasti + upload media
│   │   ├── segnalazioni-lista.tsx     # Storico segnalazioni
│   │   ├── richiesta-documenti.tsx    # Form richiesta documenti
│   │   ├── storico-richieste.tsx      # Storico richieste documenti
│   │   ├── trasmissione-documenti.tsx # Invio documenti allo studio
│   │   ├── appuntamenti.tsx           # Prenotazione appuntamenti
│   │   ├── appuntamenti-lista.tsx     # Storico appuntamenti
│   │   ├── condominio.tsx             # Il mio condominio + estratto conto
│   │   ├── bacheca.tsx                # Bacheca avvisi condominiali
│   │   ├── notifiche.tsx              # Centro notifiche in-app
│   │   ├── profilo.tsx                # Profilo utente
│   │   ├── contatti.tsx               # Contatti dello studio
│   │   ├── chi-siamo.tsx              # Chi siamo
│   │   ├── fornitore-dashboard.tsx    # **NUOVO**: Dashboard fornitore
│   │   ├── fornitore-intervento-detail.tsx # **NUOVO**: Dettaglio intervento
│   │   └── fornitore-profilo.tsx      # **NUOVO**: Profilo fornitore
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── SharedComponents.tsx   # Componenti UI riutilizzabili
│   │   ├── constants/
│   │   │   └── theme.ts              # Colori e tema dell'app
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Context di autenticazione globale
│   │   └── services/
│   │       └── api.ts                # Client API centralizzato
│   │
│   └── assets/
│       └── images/                    # Logo, icone, splash screen
│
└── test_result.md                     # Log dei test e protocollo
```

---

## 🔌 API Backend

Tutti gli endpoint sono prefissati con `/api`.

### Autenticazione

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Registrazione nuovo utente | No |
| `POST` | `/api/auth/login` | Login (restituisce JWT) | No |
| `GET` | `/api/auth/profile` | Profilo utente corrente | ✅ |
| `PUT` | `/api/auth/profile` | Aggiorna profilo | ✅ |

### Condomini

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/condomini` | Lista condomini | ✅ |
| `POST` | `/api/condomini` | Crea condominio | Admin |
| `PUT` | `/api/condomini/{id}` | Modifica condominio | Admin |
| `DELETE` | `/api/condomini/{id}` | Elimina condominio | Admin |

### Segnalazioni Guasti

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/segnalazioni` | Crea segnalazione (con allegati) | ✅ |
| `GET` | `/api/segnalazioni` | Lista segnalazioni utente | ✅ |
| `GET` | `/api/segnalazioni/{id}` | Dettaglio segnalazione (con file) | ✅ |

### Segnalazioni Admin

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/segnalazioni` | **NUOVO**: Admin crea segnalazione da zero | Admin |
| `PUT` | `/api/admin/segnalazioni/{id}` | **NUOVO**: Admin modifica contenuto segnalazione (tipologia, descrizione, urgenza, allegati) | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/assegna` | **NUOVO**: Assegna fornitore alla segnalazione | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/chiudi` | **NUOVO**: Chiudi segnalazione risolta | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/riapri` | **NUOVO**: Richiedi nuovo intervento | Admin |
| `GET` | `/api/admin/segnalazioni/{id}/rapportino` | **NUOVO**: Visualizza rapportino del fornitore | Admin |
| `GET` | `/api/admin/segnalazioni/{id}/timeline` | **NUOVO**: Cronologia eventi segnalazione | Admin |

### Upload File

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/upload` | Upload file (multipart, max 50MB) | ✅ |
| `GET` | `/api/files/{id}/{filename}` | Download file | No |

**Formati supportati:** JPEG, PNG, GIF, WebP, HEIC, MP4, MOV, MPEG, AVI, WebM, PDF

### Richieste Documenti

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/richieste-documenti` | Crea richiesta | ✅ |
| `GET` | `/api/richieste-documenti` | Lista richieste utente | ✅ |

### Appuntamenti

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/appuntamenti` | Prenota appuntamento | ✅ |
| `GET` | `/api/appuntamenti` | Lista appuntamenti utente | ✅ |

### Bacheca / Avvisi

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/avvisi` | Lista avvisi per il condomino | ✅ |
| `PUT` | `/api/avvisi/{id}/letto` | Segna avviso come letto | ✅ |

### Notifiche In-App

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/notifiche` | Lista notifiche utente | ✅ |
| `GET` | `/api/notifiche/count` | Conteggio notifiche non lette | ✅ |
| `PUT` | `/api/notifiche/{id}/letto` | Segna singola come letta | ✅ |
| `PUT` | `/api/notifiche/letto-tutte` | Segna tutte come lette | ✅ |

### Trasmissioni Documenti

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/trasmissioni` | Invia documenti allo studio | ✅ |
| `GET` | `/api/trasmissioni` | Lista trasmissioni utente | ✅ |

### Estratto Conto

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/estratto-conto` | Estratto conto del condomino | ✅ |

### Configurazione Pubblica

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/config/public` | Info pubbliche studio | No |

### Gestione Fornitori (NUOVO)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/fornitori` | Crea nuovo fornitore | Admin |
| `GET` | `/api/admin/fornitori` | Lista fornitori | Admin |
| `PUT` | `/api/admin/fornitori/{id}` | Modifica fornitore | Admin |
| `DELETE` | `/api/admin/fornitori/{id}` | Elimina fornitore | Admin |

### Portale Fornitore (NUOVO)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/fornitore/login` | Login fornitore | No |
| `GET` | `/api/fornitore/dashboard` | Statistiche interventi | Fornitore |
| `GET` | `/api/fornitore/interventi` | Lista interventi assegnati | Fornitore |
| `GET` | `/api/fornitore/interventi/{id}` | Dettaglio intervento | Fornitore |
| `POST` | `/api/fornitore/rapportino/{id}` | Invia rapportino lavori | Fornitore |
| `GET` | `/api/fornitore/profilo` | Profilo fornitore | Fornitore |

### Collaboratori & Sopralluoghi (NUOVO)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/collaboratori` | Crea collaboratore | Admin |
| `GET` | `/api/admin/collaboratori` | Lista collaboratori | Admin |
| `PUT` | `/api/admin/collaboratori/{id}` | Modifica collaboratore | Admin |
| `DELETE` | `/api/admin/collaboratori/{id}` | Elimina collaboratore | Admin |
| `POST` | `/api/collaboratore/login` | Login collaboratore | No |
| `GET` | `/api/collaboratore/profilo` | Profilo collaboratore | Collaboratore |
| `POST` | `/api/sopralluoghi` | Crea sopralluogo | Admin/Collab |
| `GET` | `/api/sopralluoghi` | Lista sopralluoghi | Admin/Collab |
| `GET` | `/api/sopralluoghi/{id}` | Dettaglio con checklist | Admin/Collab |
| `PUT` | `/api/sopralluoghi/{id}/checklist/{item_id}` | Aggiorna stato voce | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/checklist/{item_id}/anomalia` | Crea/aggiorna anomalia | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/chiudi` | Chiudi sopralluogo | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/riapri` | Riapri sopralluogo | Admin |
| `DELETE` | `/api/sopralluoghi/{id}` | Elimina sopralluogo | Admin |
| `GET` | `/api/condomini/{id}/sopralluoghi` | Sopralluoghi per condominio | Admin/Collab |

### Pannello Admin

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Statistiche riepilogo |
| `GET` | `/api/admin/segnalazioni` | Tutte le segnalazioni |
| `PUT` | `/api/admin/segnalazioni/{id}` | Aggiorna stato segnalazione |
| `GET` | `/api/admin/richieste-documenti` | Tutte le richieste |
| `PUT` | `/api/admin/richieste-documenti/{id}` | Aggiorna stato richiesta |
| `GET` | `/api/admin/appuntamenti` | Tutti gli appuntamenti |
| `PUT` | `/api/admin/appuntamenti/{id}` | Aggiorna stato appuntamento |
| `POST` | `/api/admin/avvisi` | Pubblica nuovo avviso |
| `GET` | `/api/admin/avvisi` | Lista avvisi |
| `DELETE` | `/api/admin/avvisi/{id}` | Elimina avviso |
| `GET` | `/api/admin/utenti` | Lista utenti con associazioni |
| `POST` | `/api/admin/associa-utente` | Associa utente a condominio |
| `DELETE` | `/api/admin/associazione/{id}` | Rimuovi associazione |
| `GET` | `/api/admin/trasmissioni` | Trasmissioni ricevute |
| `PUT` | `/api/admin/trasmissioni/{id}` | Aggiorna stato trasmissione |
| `POST` | `/api/admin/estratto-conto` | Inserisci/aggiorna estratto conto |
| `GET` | `/api/admin/estratti-conto` | Tutti gli estratti conto |
| `GET` | `/api/admin/config` | Leggi configurazione |
| `PUT` | `/api/admin/config` | Aggiorna configurazione |
| `GET` | `/api/admin/export/segnalazioni` | Export CSV segnalazioni |
| `GET` | `/api/admin/export/appuntamenti` | Export CSV appuntamenti |
| `GET` | `/api/admin/export/utenti` | Export CSV utenti |
| `POST` | `/api/seed` | Popola dati iniziali (demo) |

---

## 📱 Schermate App

### Flusso Condomino
```
Login → Home (Dashboard)
              ├── Segnalazione Guasti (+ upload foto/video/PDF)
              ├── Richiesta Documenti
              ├── Trasmissione Documenti
              ├── Prenotazione Appuntamento
              ├── Il Mio Condominio (estratto conto)
              ├── Bacheca Condominiale
              ├── Notifiche
              ├── Contatti
              ├── Chi Siamo
              └── Profilo
```

### Flusso Admin
```
Login → Pannello Admin (con tab scorrevoli)
              ├── Dashboard (statistiche + azioni rapide)
              ├── Condomini (CRUD)
              ├── Utenti (associa/disassocia)
              ├── Guasti (gestione stati + CREA/MODIFICA + assegna fornitore)
              ├── Appuntamenti (conferma/annulla)
              ├── Avvisi (pubblica/elimina)
              ├── Documenti (trasmissioni ricevute)
              ├── Fornitori (CRUD, gestione anagrafica)
              └── Impostazioni (config, API keys, export, estratti conto)
```

### Flusso Fornitore (NUOVO)
```
Login (portale dedicato) → Dashboard Fornitore
              ├── Dashboard (statistiche interventi)
              ├── Lista Interventi (con filtri stato)
              ├── Dettaglio Intervento (info guasto + condominio)
              ├── Compila Rapportino (data, descrizione, foto)
              └── Profilo (dati aziendali)
```

### Flusso Collaboratore (NUOVO)
```
Login (portale collaboratore) → App Sopralluoghi
              ├── Lista Sopralluoghi (assegnati o creati)
              ├── Nuovo Sopralluogo (seleziona condominio, data, ora, motivo)
              ├── Checklist Interattiva (25 voci con semaforo)
              │       ├── 🟢 OK → salva immediatamente
              │       ├── 🟡 Anomalia → apre modale documentazione
              │       │       ├── Descrizione testuale
              │       │       ├── Gravità (Lieve/Moderata/Grave/Urgente)
              │       │       ├── Foto (fino a 5)
              │       │       ├── Note vocali MULTIPLE (con riproduzione)
              │       │       └── [Opzionale] Apri Segnalazione + Assegna Fornitore
              │       └── ⚪ Non controllato → salva immediatamente
              └── Chiudi Sopralluogo
                      ├── Valutazione (Buono/Discreto/Sufficiente/Critico)
                      ├── Note finali
                      └── Conferma obbligatoria (previene chiusure accidentali)
```

---

## 🔐 Autenticazione e Ruoli

### Flusso di Registrazione

1. L'utente si registra con email e password
2. L'account viene creato ma è **non abilitato**
3. L'amministratore dal pannello admin **associa l'utente a un condominio**
4. L'utente è ora **abilitato** e può accedere a tutte le funzionalità

### Ruoli

| Ruolo | Descrizione |
|-------|-------------|
| `condomino` | Residente — accede alla dashboard con i servizi |
| `admin` | Amministratore — accede al pannello di gestione completo |
| `fornitore` | **NUOVO**: Fornitore esterno — accede al portale per gestire interventi assegnati |
| `collaboratore` | **NUOVO**: Collaboratore dello studio — esegue sopralluoghi e compila checklist |

### Credenziali Demo (dopo `/api/seed`)

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | `admin@tardugno.it` | `admin123` |
| Condomino | `mario.rossi@email.it` | `password123` |
| Fornitore | Creato dall'admin | (definita dall'admin) |
| Collaboratore | Creato dall'admin | (definita dall'admin) |

---

## ⚙️ Configurazione e Avvio

### Prerequisiti

- **Node.js** >= 18
- **Python** >= 3.11
- **MongoDB** (locale o remoto)
- **Expo CLI** (`npx expo`)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Crea file .env (vedi sezione variabili d'ambiente)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
# Crea file .env (vedi sezione variabili d'ambiente)
npx expo start
```

### Seed Dati Demo

```bash
curl -X POST http://localhost:8001/api/seed
```

Questo popola il database con:
- 1 utente admin
- 1 utente condomino (abilitato)
- 5 condomini di esempio a Salerno
- Associazione utente-condominio
- Segnalazioni, appuntamenti, avvisi, notifiche di esempio
- Configurazione studio di default

---

## 🔑 Variabili d'Ambiente

### Backend (`backend/.env`)

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET="tua-chiave-segreta-qui"
```

### Frontend (`frontend/.env`)

```env
EXPO_TUNNEL_SUBDOMAIN=condo-manager-40
EXPO_PACKAGER_HOSTNAME=https://tuo-dominio.com
EXPO_PUBLIC_BACKEND_URL=https://tuo-dominio.com
```

> ⚠️ **Non modificare mai** `EXPO_PACKAGER_PROXY_URL` e `EXPO_PACKAGER_HOSTNAME` se configurati dall'ambiente di deployment.

---

## 🗄 Database Schema

### Collezioni MongoDB

| Collezione | Descrizione |
|------------|-------------|
| `users` | Utenti registrati (condomini e admin) |
| `condomini` | Anagrafica condomini |
| `user_condominio` | Associazioni utente ↔ condominio |
| `segnalazioni` | Segnalazioni guasti |
| `richieste_documenti` | Richieste documenti |
| `appuntamenti` | Prenotazioni appuntamenti |
| `avvisi` | Avvisi bacheca condominiale |
| `avvisi_letti` | Tracking lettura avvisi |
| `notifiche` | Notifiche in-app per utente |
| `trasmissioni` | Documenti trasmessi al studio |
| `estratti_conto` | Estratti conto condominiali |
| `uploaded_files` | Metadati file caricati |
| `app_config` | Configurazione globale app |
| `codici_invito` | Codici invito (legacy) |
| `fornitori` | **NUOVO**: Anagrafica fornitori esterni |
| `interventi` | **NUOVO**: Interventi assegnati ai fornitori |
| `rapportini` | **NUOVO**: Rapporti di lavoro completati |

### Modello Utente

```json
{
  "id": "uuid",
  "email": "mario.rossi@email.it",
  "nome": "Mario",
  "cognome": "Rossi",
  "telefono": "+39 333 1234567",
  "codice_fiscale": "RSSMRA80A01H703K",
  "ruolo": "condomino",
  "abilitato": true,
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Modello Segnalazione

```json
{
  "id": "uuid",
  "protocollo": "SEG-2026-001",
  "user_id": "uuid",
  "condominio_id": "uuid",
  "tipologia": "Guasto idraulico",
  "descrizione": "Perdita acqua nel corridoio",
  "urgenza": "Alta",
  "stato": "Inviata",
  "allegati": ["file_uuid_1", "file_uuid_2"],
  "fornitore_id": "uuid (opzionale)",
  "note_admin": "Nota interna",
  "created_at": "2026-03-13T15:00:00Z"
}
```

### Modello Fornitore (NUOVO)

```json
{
  "id": "uuid",
  "ragione_sociale": "Idraulica Rossi Srl",
  "email": "info@idraulicarossi.it",
  "telefono": "+39 089 123456",
  "p_iva": "01234567890",
  "iban": "IT60X0542811101000000123456",
  "indirizzo": "Via Roma, 10 - Salerno",
  "settori_competenza": ["Idraulica", "Riscaldamento"],
  "note": "Pronto intervento 24h",
  "stato": "Attivo",
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Modello Intervento (NUOVO)

```json
{
  "id": "uuid",
  "segnalazione_id": "uuid",
  "fornitore_id": "uuid",
  "stato": "Assegnato",
  "note_admin": "Urgente, chiamare il mattino",
  "data_prevista": "2026-03-20",
  "data_assegnazione": "2026-03-14T09:00:00Z",
  "data_completamento": null
}
```

### Modello Rapportino (NUOVO)

```json
{
  "id": "uuid",
  "intervento_id": "uuid",
  "data_intervento": "2026-03-20",
  "descrizione_lavori": "Sostituzione guarnizione rubinetto",
  "esito": "Risolto",
  "materiali_utilizzati": "Guarnizione universale, silicone",
  "foto_ids": ["file_uuid_1", "file_uuid_2"],
  "created_at": "2026-03-20T16:30:00Z"
}
```

---

## 📋 Permessi Device

### iOS (Info.plist)

| Permesso | Descrizione |
|----------|-------------|
| `NSCameraUsageDescription` | Scatta foto per documentare guasti |
| `NSPhotoLibraryUsageDescription` | Seleziona foto e video da allegare |
| `NSMicrophoneUsageDescription` | Registra video per documentare guasti |

### Android (Permissions)

- `CAMERA`
- `READ_MEDIA_IMAGES`
- `READ_MEDIA_VIDEO`
- `READ_EXTERNAL_STORAGE`

---

## 🛠 Tecnologie Utilizzate

### Frontend
| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| React Native | 0.79 | Framework mobile |
| Expo | SDK 54 | Piattaforma di sviluppo |
| Expo Router | 5.x | Routing file-based |
| TypeScript | 5.x | Tipizzazione statica |
| expo-image-picker | 17.x | Selezione foto/video |
| expo-document-picker | 14.x | Selezione documenti PDF |
| AsyncStorage | 2.x | Persistenza locale (token) |

### Backend
| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| Python | 3.11 | Linguaggio backend |
| FastAPI | 0.110 | Framework API |
| Motor | 3.3 | Driver MongoDB async |
| PyJWT | 2.11 | Gestione token JWT |
| bcrypt | 4.1 | Hashing password |
| uvicorn | 0.25 | Server ASGI |

### Infrastruttura
| Tecnologia | Utilizzo |
|------------|----------|
| MongoDB | Database NoSQL |
| Kubernetes | Orchestrazione container |
| Nginx | Reverse proxy |
| Supervisor | Process management |

---

## 📊 Palette Colori

| Colore | Hex | Utilizzo |
|--------|-----|----------|
| Navy | `#1B2A4A` | Colore principale, header, bottoni |
| Sky | `#4A90D9` | Accento, link, elementi interattivi |
| Sky Light | `#E8F0FE` | Sfondi leggeri, highlight |
| Background | `#F8FAFC` | Sfondo generale |
| White | `#FFFFFF` | Card, input, modali |
| Error | `#DC2626` | Errori, eliminazione |
| Success | `#16A34A` | Conferme, stati positivi |

---

## 📄 Licenza

Progetto proprietario sviluppato per **Studio Tardugno & Bonifacio** — Amministratore Condominiale, Salerno (Italia).

---

*Sviluppato con ❤️ per la gestione condominiale moderna.*
