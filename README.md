# Studio Tardugno & Bonifacio — App Condomini

**Applicazione mobile + portale desktop per la gestione condominiale** sviluppata per lo Studio di Amministrazione Condominiale Tardugno & Bonifacio di Salerno.

L'app consente ai **condomini** (residenti) di interagire con lo studio, ai **fornitori** di gestire gli interventi, ai **collaboratori** di eseguire sopralluoghi e agli **amministratori** di gestire tutte le operazioni da un portale desktop dedicato.

---

## Indice

- [Panoramica](#-panoramica)
- [Funzionalita](#-funzionalità)
- [Architettura Tecnica](#-architettura-tecnica)
- [Struttura del Progetto](#-struttura-del-progetto)
- [API Backend](#-api-backend)
- [Schermate e Flussi](#-schermate-e-flussi)
- [Autenticazione e Ruoli](#-autenticazione-e-ruoli)
- [Configurazione e Avvio](#-configurazione-e-avvio)
- [Variabili d'Ambiente](#-variabili-dambiente)
- [Database Schema](#-database-schema)
- [Permessi Device](#-permessi-device)
- [Tecnologie Utilizzate](#-tecnologie-utilizzate)

---

## Panoramica

| Caratteristica | Dettaglio |
|---|---|
| **Piattaforma** | Android / iOS / Web (responsive + portale desktop) |
| **Lingua** | Italiano |
| **Backend** | FastAPI (Python) — architettura modulare a router |
| **Frontend** | Expo (React Native) con Expo Router — doppia UI mobile/desktop |
| **Database** | MongoDB (Motor async) |
| **Autenticazione** | JWT (JSON Web Token) con 4 ruoli |
| **Upload File** | Multipart con storage su disco |
| **Privacy** | GDPR compliant — informativa versionata, consensi, diritti Art. 15-22 |

---

## Funzionalita

### Area Condomino (Residente) — App Mobile

| Funzionalita | Descrizione |
|---|---|
| **Segnalazione Guasti** | Invia segnalazioni con descrizione, urgenza e **allegati multimediali** (foto, video, PDF — fino a 10 file, max 50MB ciascuno) |
| **Richiesta Documenti** | Richiedi documenti allo studio (bilanci, verbali, certificazioni) |
| **Trasmissione Documenti** | Invia documenti allo studio con note e allegati |
| **Prenotazione Appuntamenti** | Prenota appuntamenti con fascia oraria preferita |
| **Il Mio Condominio** | Visualizza dati del condominio ed estratto conto personale |
| **Bacheca Condominiale** | Consulta avvisi, convocazioni assemblee, comunicazioni urgenti |
| **Notifiche In-App** | Ricevi notifiche su aggiornamenti delle tue richieste con contatore in tempo reale |
| **Privacy e Dati Personali** | Visualizza consensi, esercita diritti GDPR (accesso, cancellazione, portabilita, etc.) |
| **Profilo** | Gestisci i tuoi dati personali |
| **Contatti e Chi Siamo** | Informazioni e recapiti dello studio |

### Portale Desktop Amministratore (Web)

UI desktop professionale con sidebar di navigazione, tabelle dati, ricerca e filtri.

| Sezione | Descrizione |
|---|---|
| **Dashboard** | Stat cards (condomini, utenti, segnalazioni, appuntamenti, fornitori, sopralluoghi, avvisi) + tabella segnalazioni recenti |
| **Condomini** | Tabella con ricerca, import XLS/CSV, creazione/modifica/eliminazione |
| **Utenti** | Lista utenti con filtro per condominio, associa/disassocia, crea collaboratori |
| **Fornitori** | CRUD fornitori esterni con anagrafica completa e storico interventi |
| **Sopralluoghi** | Tabella con filtri (tutti/completati/in corso), ricerca, dettaglio checklist |
| **Guasti** | Gestione segnalazioni: cambia stato, crea/modifica, assegna fornitore, timeline |
| **Appuntamenti** | Lista appuntamenti con azioni (conferma/completa/annulla) |
| **Avvisi** | Pubblica avvisi per condomini specifici o per tutti |
| **Documenti** | Gestisci trasmissioni e richieste documenti ricevute |
| **Privacy** | Gestione richieste GDPR, informativa versionata, badge scadenze |
| **Impostazioni** | Configura studio (telefono, email, PEC), export CSV, estratti conto |

### Portale Fornitore — App Mobile

| Funzionalita | Descrizione |
|---|---|
| **Dashboard Fornitore** | Statistiche interventi: totali, da eseguire, in verifica, completati |
| **Lista Interventi** | Visualizza interventi assegnati con filtri per stato |
| **Dettaglio Intervento** | Vedi dettagli segnalazione, indirizzo condominio, foto allegate |
| **Rapportino Lavori** | Compila rapportino con data, descrizione lavori, esito, materiali e foto |
| **Stato Intervento** | Traccia lo stato (assegnato -> completato -> chiuso) |
| **Notifiche** | Ricevi notifiche su nuovi incarichi e aggiornamenti |

### Modulo Sopralluoghi — Collaboratore

| Funzionalita | Descrizione |
|---|---|
| **Creazione Sopralluogo** | Avvia un nuovo sopralluogo per un condominio con data, ora, motivo |
| **Checklist 25 Voci** | Verifica standardizzata: ascensore, balconi, impianti, pulizia, etc. |
| **Sistema Semaforo** | OK (verde), Anomalia (giallo), Non controllato (grigio) per ogni voce |
| **Documentazione Anomalie** | Descrizione, gravita, foto (fino a 5), note vocali multiple |
| **Note Vocali Multiple** | Registra piu note vocali per ogni anomalia con riproduzione integrata |
| **Segnalazione da Anomalia** | Apri segnalazione automatica da anomalia con fornitore assegnato |
| **Chiusura Sopralluogo** | Valutazione generale (Buono/Discreto/Sufficiente/Critico), note finali |
| **Storico** | Lista con riepilogo semafori per ogni sopralluogo |

### Modulo Privacy e GDPR

| Funzionalita | Descrizione |
|---|---|
| **Informativa Versionata** | Pubblicazione versioni dell'informativa privacy con testo completo |
| **Consensi Granulari** | Privacy policy, marketing, note vocali — revocabili singolarmente |
| **Verifica Aggiornamento** | All'accesso verifica se l'utente deve accettare una nuova versione |
| **Blocco Modale** | Se c'e una nuova informativa, modale bloccante con "Accetta e Continua" o "Disconnetti" |
| **Consensi Registrazione** | Alla registrazione l'utente accetta/rifiuta ciascun consenso |
| **I Miei Dati (Art. 15)** | L'utente vede tutti i propri dati personali raccolti |
| **Esporta Dati (Art. 20)** | Download JSON completo di tutti i dati personali |
| **Richieste Privacy** | Cancellazione (Art. 17), Limitazione (Art. 18), Accesso, Portabilita, Opposizione |
| **Protocollo Automatico** | Ogni richiesta ha un protocollo univoco (es. PRIV-CAN-2026-A1B2C3) |
| **Scadenza 30 Giorni** | Ogni richiesta ha scadenza legale con countdown per l'admin |
| **Admin Privacy** | Dashboard richieste con filtri, badge scadenze imminenti, evasione/rifiuto |
| **Anonimizzazione Account** | Su cancellazione GDPR: dati anonimizzati, consensi revocati, audit trail |
| **Notifiche Bidirezionali** | Admin notificato su nuove richieste, utente notificato sull'esito |

---

## Architettura Tecnica

```
+------------------------------------------------------+
|              Client (Mobile / Desktop Web)            |
|         Expo (React Native) — Porta 3000              |
|                                                       |
|   Mobile (< 768px)        Desktop (>= 768px)         |
|   +----------------+      +---------------------+    |
|   | Login/Register |      | Desktop Login       |    |
|   | Home Dashboard |      | Admin Portal        |    |
|   | Segnalazioni   |      |   Sidebar + Tables  |    |
|   | Fornitore      |      | Collaboratore       |    |
|   +----------------+      +---------------------+    |
|              |                      |                  |
|              +----------+-----------+                  |
|                         | /api/*                       |
+-------------------------+------------------------------+
                          |
                +---------v----------+
                |   Kubernetes       |
                |   Ingress/Proxy    |
                |   /api/* -> :8001  |
                |   /*     -> :3000  |
                +---------+----------+
                          |
                +---------v----------+
                | FastAPI Backend    |
                | Porta 8001         |
                |                    |
                | server.py (shell)  |
                |   + 9 router       |
                |   + database.py    |
                |   + models.py      |
                |   + auth.py        |
                +---------+----------+
                          |
              +-----------+------------+
              |                        |
     +--------v--------+    +---------v---------+
     |     MongoDB      |    |   File Storage    |
     |  (porta 27017)   |    | /backend/uploads  |
     +------------------+    +-------------------+
```

### Architettura Backend Modulare

Il backend e organizzato in moduli separati:

| File | Righe | Responsabilita |
|------|-------|----------------|
| `server.py` | ~146 | Shell: app FastAPI + CORS + include router + seed + startup/shutdown |
| `database.py` | ~82 | Connessione MongoDB, costanti, helper (`now_iso`, `clean_doc`, `create_notifica`) |
| `models.py` | ~245 | 25+ modelli Pydantic (request/response validation) |
| `auth.py` | ~81 | Hash password (bcrypt), JWT, dependency injection (`get_current_user`, `get_admin_user`, etc.) |
| `routers/auth_routes.py` | ~64 | Login, register, profilo utente |
| `routers/admin_routes.py` | ~351 | Dashboard, utenti, avvisi, notifiche, trasmissioni, richieste doc, config, export CSV, estratti conto, appuntamenti |
| `routers/condomini_routes.py` | ~188 | CRUD condomini + import XLS/CSV |
| `routers/segnalazioni_routes.py` | ~91 | Segnalazioni utente + admin (CRUD, update, create) |
| `routers/fornitori_routes.py` | ~224 | Admin CRUD fornitori + portale fornitore + rapportini + assegnazioni + timeline |
| `routers/collaboratori_routes.py` | ~63 | Admin CRUD collaboratori + login + profilo |
| `routers/sopralluoghi_routes.py` | ~200 | Sopralluoghi CRUD + checklist + anomalie + segnalazioni automatiche |
| `routers/files_routes.py` | ~66 | Upload file + download file + upload sopralluogo |
| `routers/privacy_routes.py` | ~633 | GDPR: informativa versionata, consensi, diritti privacy, admin privacy |

---

## Struttura del Progetto

```
/app
|-- README.md
|-- backend/
|   |-- .env
|   |-- requirements.txt
|   |-- server.py                          # Shell: FastAPI + CORS + router + seed
|   |-- database.py                        # Connessione DB + helper
|   |-- models.py                          # Modelli Pydantic
|   |-- auth.py                            # Auth JWT + dependency injection
|   |-- routers/
|   |   |-- __init__.py
|   |   |-- auth_routes.py                 # Login, register, profilo
|   |   |-- admin_routes.py                # Dashboard, utenti, avvisi, notifiche, config, export
|   |   |-- condomini_routes.py            # CRUD condomini + import XLS/CSV
|   |   |-- segnalazioni_routes.py         # Segnalazioni utente + admin
|   |   |-- fornitori_routes.py            # Fornitori + portale fornitore + rapportini
|   |   |-- collaboratori_routes.py        # Collaboratori + login + profilo
|   |   |-- sopralluoghi_routes.py         # Sopralluoghi + checklist + anomalie
|   |   |-- files_routes.py               # Upload + download file
|   |   |-- privacy_routes.py             # GDPR: informativa, consensi, privacy rights
|   |-- uploads/                           # File caricati dagli utenti
|   |-- tests/
|
|-- frontend/
|   |-- .env
|   |-- app.json
|   |-- package.json
|   |
|   |-- app/                               # Schermate (file-based routing)
|   |   |-- _layout.tsx                    # Layout root + GDPR modal bloccante
|   |   |-- index.tsx                      # Redirect: mobile vs desktop (width >= 768)
|   |   |-- +html.tsx                      # Template HTML custom per web
|   |   |-- login.tsx                      # Login mobile
|   |   |-- register.tsx                   # Registrazione con consensi GDPR
|   |   |-- home.tsx                       # Dashboard condomino
|   |   |-- admin.tsx                      # Pannello admin mobile (tab scorrevoli)
|   |   |-- segnalazioni.tsx               # Form segnalazione guasti + upload media
|   |   |-- segnalazioni-lista.tsx         # Storico segnalazioni
|   |   |-- richiesta-documenti.tsx        # Form richiesta documenti
|   |   |-- storico-richieste.tsx          # Storico richieste documenti
|   |   |-- trasmissione-documenti.tsx     # Invio documenti allo studio
|   |   |-- appuntamenti.tsx               # Prenotazione appuntamenti
|   |   |-- appuntamenti-lista.tsx         # Storico appuntamenti
|   |   |-- condominio.tsx                 # Il mio condominio + estratto conto
|   |   |-- bacheca.tsx                    # Bacheca avvisi condominiali
|   |   |-- notifiche.tsx                  # Centro notifiche in-app
|   |   |-- privacy.tsx                    # Privacy: consensi, i miei dati, esercita diritti
|   |   |-- profilo.tsx                    # Profilo utente
|   |   |-- contatti.tsx                   # Contatti dello studio
|   |   |-- chi-siamo.tsx                  # Chi siamo
|   |   |-- fornitore-dashboard.tsx        # Dashboard fornitore
|   |   |-- fornitore-intervento.tsx       # Dettaglio intervento fornitore
|   |   |
|   |   |-- desktop/                       # Portale desktop (web >= 768px)
|   |       |-- _layout.tsx                # Layout desktop (vuoto, no tab bar)
|   |       |-- index.tsx                  # Redirect desktop per ruolo
|   |       |-- login.tsx                  # Login desktop two-column
|   |       |-- admin.tsx                  # Portale admin completo (sidebar + contenuto)
|   |       |-- collaboratore.tsx          # Portale collaboratore sopralluoghi
|   |
|   |-- src/
|   |   |-- components/
|   |   |   |-- SharedComponents.tsx       # Componenti UI riutilizzabili
|   |   |   |-- VoiceRecorder.tsx          # Registrazione e riproduzione note vocali
|   |   |-- constants/
|   |   |   |-- theme.ts                   # Colori e tema dell'app (Colors)
|   |   |-- context/
|   |   |   |-- AuthContext.tsx            # Context auth globale + GDPR update check
|   |   |-- services/
|   |       |-- api.ts                     # Client API centralizzato
|   |
|   |-- assets/images/
|
|-- test_result.md
```

---

## API Backend

Tutti gli endpoint sono prefissati con `/api`. **101 endpoint totali** organizzati in 9 router.

### Autenticazione (`auth_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Registrazione nuovo utente | No |
| `POST` | `/api/auth/login` | Login (restituisce JWT) | No |
| `GET` | `/api/auth/profile` | Profilo utente corrente | Si |
| `PUT` | `/api/auth/profile` | Aggiorna profilo | Si |

### Condomini (`condomini_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/condomini` | Lista condomini (filtrata per ruolo) | Si |
| `POST` | `/api/condomini` | Crea condominio | Admin |
| `PUT` | `/api/condomini/{id}` | Modifica condominio | Admin |
| `DELETE` | `/api/condomini/{id}` | Elimina condominio | Admin |
| `POST` | `/api/admin/condomini/import` | Import da file XLS/CSV | Admin |

### Segnalazioni Guasti (`segnalazioni_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/segnalazioni` | Crea segnalazione (con allegati) | Si |
| `GET` | `/api/segnalazioni` | Lista segnalazioni utente | Si |
| `GET` | `/api/segnalazioni/{id}` | Dettaglio segnalazione | Si |
| `GET` | `/api/admin/segnalazioni` | Tutte le segnalazioni | Admin |
| `PUT` | `/api/admin/segnalazioni/{id}` | Modifica segnalazione | Admin |
| `POST` | `/api/admin/segnalazioni` | Admin crea segnalazione | Admin |

### Fornitori e Interventi (`fornitori_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/fornitori` | Crea fornitore | Admin |
| `GET` | `/api/admin/fornitori` | Lista fornitori | Admin |
| `GET` | `/api/admin/fornitori/{id}` | Dettaglio fornitore | Admin |
| `PUT` | `/api/admin/fornitori/{id}` | Modifica fornitore | Admin |
| `DELETE` | `/api/admin/fornitori/{id}` | Elimina fornitore | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/assegna` | Assegna fornitore | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/chiudi` | Chiudi segnalazione | Admin |
| `POST` | `/api/admin/segnalazioni/{id}/riapri` | Richiedi nuovo intervento | Admin |
| `GET` | `/api/admin/segnalazioni/{id}/rapportino` | Vedi rapportino | Admin |
| `GET` | `/api/admin/segnalazioni/{id}/timeline` | Timeline eventi | Admin |
| `GET` | `/api/admin/fornitori/{id}/interventi` | Interventi fornitore | Admin |
| `GET` | `/api/fornitore/dashboard` | Dashboard fornitore | Fornitore |
| `GET` | `/api/fornitore/interventi` | Lista interventi | Fornitore |
| `GET` | `/api/fornitore/interventi/{id}` | Dettaglio intervento | Fornitore |
| `POST` | `/api/fornitore/rapportino/{id}` | Invia rapportino | Fornitore |
| `GET` | `/api/fornitore/rapportino/{id}` | Leggi rapportino | Fornitore |

### Collaboratori (`collaboratori_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/collaboratori` | Crea collaboratore | Admin |
| `GET` | `/api/admin/collaboratori` | Lista collaboratori | Admin |
| `PUT` | `/api/admin/collaboratori/{id}` | Modifica collaboratore | Admin |
| `DELETE` | `/api/admin/collaboratori/{id}` | Elimina collaboratore | Admin |
| `POST` | `/api/collaboratore/login` | Login collaboratore | No |
| `GET` | `/api/collaboratore/profilo` | Profilo collaboratore | Collaboratore |

### Sopralluoghi (`sopralluoghi_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sopralluoghi` | Crea sopralluogo | Admin/Collab |
| `GET` | `/api/sopralluoghi` | Lista sopralluoghi | Admin/Collab |
| `GET` | `/api/sopralluoghi/{id}` | Dettaglio con checklist | Admin/Collab |
| `PUT` | `/api/sopralluoghi/{id}/checklist/{item_id}` | Aggiorna voce checklist | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/checklist/{item_id}/anomalia` | Documenta anomalia | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/chiudi` | Chiudi sopralluogo | Admin/Collab |
| `POST` | `/api/sopralluoghi/{id}/riapri` | Riapri sopralluogo | Admin |
| `DELETE` | `/api/sopralluoghi/{id}` | Elimina sopralluogo | Admin |
| `GET` | `/api/condomini/{id}/sopralluoghi` | Sopralluoghi per condominio | Admin/Collab |

### Admin Generale (`admin_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/dashboard` | Statistiche riepilogo | Admin |
| `GET` | `/api/admin/utenti` | Lista utenti con associazioni | Admin |
| `POST` | `/api/admin/associa-utente` | Associa utente a condominio | Admin |
| `DELETE` | `/api/admin/associazione/{id}` | Rimuovi associazione | Admin |
| `POST` | `/api/admin/codici-invito` | Crea codice invito | Admin |
| `GET` | `/api/admin/codici-invito` | Lista codici invito | Admin |
| `POST` | `/api/appuntamenti` | Prenota appuntamento | Si |
| `GET` | `/api/appuntamenti` | Lista appuntamenti utente | Si |
| `GET` | `/api/admin/appuntamenti` | Tutti gli appuntamenti | Admin |
| `PUT` | `/api/admin/appuntamenti/{id}` | Aggiorna stato appuntamento | Admin |
| `GET` | `/api/avvisi` | Avvisi per il condomino | Si |
| `PUT` | `/api/avvisi/{id}/letto` | Segna avviso letto | Si |
| `POST` | `/api/admin/avvisi` | Pubblica avviso | Admin |
| `GET` | `/api/admin/avvisi` | Lista avvisi admin | Admin |
| `DELETE` | `/api/admin/avvisi/{id}` | Elimina avviso | Admin |
| `GET` | `/api/notifiche` | Notifiche utente | Si |
| `GET` | `/api/notifiche/count` | Conteggio non lette | Si |
| `PUT` | `/api/notifiche/{id}/letto` | Segna letta | Si |
| `PUT` | `/api/notifiche/letto-tutte` | Segna tutte lette | Si |
| `POST` | `/api/trasmissioni` | Invia documenti | Si |
| `GET` | `/api/trasmissioni` | Trasmissioni utente | Si |
| `GET` | `/api/admin/trasmissioni` | Tutte le trasmissioni | Admin |
| `PUT` | `/api/admin/trasmissioni/{id}` | Aggiorna stato | Admin |
| `POST` | `/api/richieste-documenti` | Richiedi documento | Si |
| `GET` | `/api/richieste-documenti` | Richieste utente | Si |
| `GET` | `/api/admin/richieste-documenti` | Tutte le richieste | Admin |
| `PUT` | `/api/admin/richieste-documenti/{id}` | Aggiorna stato | Admin |
| `GET` | `/api/estratto-conto` | Estratto conto condomino | Si |
| `POST` | `/api/admin/estratto-conto` | Inserisci estratto conto | Admin |
| `GET` | `/api/admin/estratti-conto` | Tutti gli estratti | Admin |
| `GET` | `/api/admin/config` | Leggi configurazione | Admin |
| `PUT` | `/api/admin/config` | Aggiorna configurazione | Admin |
| `GET` | `/api/config/public` | Info pubbliche studio | No |
| `GET` | `/api/admin/export/segnalazioni` | Export CSV segnalazioni | Admin |
| `GET` | `/api/admin/export/appuntamenti` | Export CSV appuntamenti | Admin |
| `GET` | `/api/admin/export/utenti` | Export CSV utenti | Admin |

### Upload File (`files_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/upload` | Upload file (max 50MB) | Si |
| `POST` | `/api/upload/sopralluogo` | Upload foto sopralluogo | Admin/Collab |
| `GET` | `/api/files/{id}/{filename}` | Download file | No |

### Privacy e GDPR (`privacy_routes.py`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/informativa/attiva` | Informativa privacy attiva | No |
| `GET` | `/api/informativa/versioni` | Storico versioni informativa | Si |
| `POST` | `/api/admin/informativa` | Pubblica nuova versione | Admin |
| `GET` | `/api/informativa/verifica-aggiornamento` | Verifica se serve accettazione | Si |
| `POST` | `/api/consensi/conferma-aggiornamento` | Conferma nuova informativa | Si |
| `GET` | `/api/consensi/miei` | Stato consensi utente | Si |
| `PATCH` | `/api/consensi/{tipo}/revoca` | Revoca consenso (marketing, note_vocali) | Si |
| `PATCH` | `/api/consensi/{tipo}/riattiva` | Riattiva consenso revocato | Si |
| `POST` | `/api/consensi/registrazione` | Salva consensi alla registrazione | Si |
| `GET` | `/api/privacy/miei-dati` | Tutti i dati personali (Art. 15) | Si |
| `GET` | `/api/privacy/export` | Download JSON dati personali (Art. 20) | Si |
| `POST` | `/api/privacy/richiesta` | Crea richiesta privacy (Art. 17/18/21) | Si |
| `GET` | `/api/privacy/mie-richieste` | Le mie richieste privacy | Si |
| `GET` | `/api/admin/privacy/richieste` | Tutte le richieste (con filtri) | Admin |
| `PUT` | `/api/admin/privacy/richieste/{id}/evadi` | Evadi/rifiuta richiesta | Admin |
| `GET` | `/api/admin/privacy/richieste/count-scadenza` | Badge scadenze imminenti | Admin |

### Utility

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/` | Root — info API | No |
| `POST` | `/api/seed` | Popola dati iniziali demo | No |

---

## Schermate e Flussi

### Flusso Condomino (Mobile)
```
Login -> Home (Dashboard)
              |-- Segnalazione Guasti (+ upload foto/video/PDF)
              |-- Richiesta Documenti
              |-- Trasmissione Documenti
              |-- Prenotazione Appuntamento
              |-- Il Mio Condominio (estratto conto)
              |-- Bacheca Condominiale
              |-- Notifiche
              |-- Privacy (consensi, i miei dati, diritti GDPR)
              |-- Contatti / Chi Siamo
              |-- Profilo
```

### Flusso Admin (Desktop)
```
Login Desktop -> Portale Admin (sidebar + contenuto)
              |-- Dashboard (stat cards + segnalazioni recenti)
              |-- Condomini (tabella + ricerca + import XLS + CRUD)
              |-- Utenti (filtro condominio + associa + crea collaboratori)
              |-- Fornitori (CRUD + storico interventi)
              |-- Sopralluoghi (tabella + filtri + dettaglio checklist)
              |-- Guasti (stati + crea/modifica + assegna fornitore + timeline)
              |-- Appuntamenti (conferma/completa/annulla)
              |-- Avvisi (pubblica/elimina per condomini o globali)
              |-- Documenti (trasmissioni + richieste)
              |-- Privacy (richieste GDPR + badge scadenze + evasione)
              |-- Impostazioni (config studio + export CSV + estratti conto)
```

### Flusso Fornitore (Mobile)
```
Login -> Dashboard Fornitore
              |-- Statistiche interventi
              |-- Lista Interventi (filtri per stato)
              |-- Dettaglio Intervento (info guasto + condominio)
              |-- Compila Rapportino (data, descrizione, foto)
```

### Flusso Collaboratore (Desktop)
```
Login Desktop -> Portale Collaboratore
              |-- Lista Sopralluoghi (assegnati o creati)
              |-- Nuovo Sopralluogo (seleziona condominio, data, ora, motivo)
              |-- Checklist Interattiva (25 voci con semaforo)
              |       |-- OK -> salva immediatamente
              |       |-- Anomalia -> modale documentazione
              |       |       |-- Descrizione + Gravita + Foto + Note vocali
              |       |       |-- [Opzionale] Apri Segnalazione + Assegna Fornitore
              |       |-- Non controllato -> salva immediatamente
              |-- Chiudi Sopralluogo
                      |-- Valutazione (Buono/Discreto/Sufficiente/Critico)
                      |-- Note finali + Conferma obbligatoria
```

### Routing Platform-Aware

```
index.tsx
  |
  |-- Platform.OS === 'web' && width >= 768px
  |     -> /desktop/login -> /desktop/admin (admin)
  |     -> /desktop/login -> /desktop/collaboratore (collaboratore)
  |
  |-- Mobile o web < 768px
        -> /login -> /home (condomino)
        -> /login -> /fornitore-dashboard (fornitore)
```

---

## Autenticazione e Ruoli

### Flusso di Registrazione

1. L'utente si registra con email, password e **consensi GDPR**
2. L'account viene creato ma e **non abilitato**
3. L'amministratore dal pannello admin **associa l'utente a un condominio**
4. L'utente e ora **abilitato** e puo accedere a tutte le funzionalita
5. Al primo accesso successivo a un aggiornamento informativa: **modale GDPR bloccante**

### Ruoli

| Ruolo | Descrizione | Interfaccia |
|-------|-------------|-------------|
| `condomino` | Residente — servizi condominiali | App Mobile |
| `admin` | Amministratore — gestione completa | Portale Desktop + App Mobile |
| `fornitore` | Fornitore esterno — gestione interventi | App Mobile |
| `collaboratore` | Collaboratore studio — sopralluoghi | Portale Desktop |

### Credenziali Demo (dopo `/api/seed`)

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | `admin@tardugno.it` | `admin123` |
| Condomino | `mario.rossi@email.it` | `password123` |
| Fornitore | Creato dall'admin | (definita dall'admin) |
| Collaboratore | Creato dall'admin | (definita dall'admin) |

---

## Configurazione e Avvio

### Prerequisiti

- **Node.js** >= 18
- **Python** >= 3.11
- **MongoDB** (locale o remoto)
- **Expo CLI** (`npx expo`)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
npx expo start
```

### Seed Dati Demo

```bash
curl -X POST http://localhost:8001/api/seed
```

Popola: 1 admin, 1 condomino, 2 condomini, avvisi, associazioni, informativa privacy v1.0, codice invito WELCOME1.

---

## Variabili d'Ambiente

### Backend (`backend/.env`)

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="studio_tardugno"
JWT_SECRET="chiave-segreta"
```

### Frontend (`frontend/.env`)

```env
EXPO_TUNNEL_SUBDOMAIN=...
EXPO_PACKAGER_HOSTNAME=https://...
EXPO_PUBLIC_BACKEND_URL=https://...
```

> Non modificare mai `EXPO_PACKAGER_PROXY_URL` e `EXPO_PACKAGER_HOSTNAME` se configurati dall'ambiente di deployment.

---

## Database Schema

### Collezioni MongoDB (19 collezioni)

| Collezione | Descrizione |
|------------|-------------|
| `users` | Utenti registrati (condomini, admin) |
| `condomini` | Anagrafica condomini |
| `user_condomini` | Associazioni utente-condominio |
| `codici_invito` | Codici invito per registrazione |
| `segnalazioni` | Segnalazioni guasti |
| `richieste_documenti` | Richieste documenti |
| `appuntamenti` | Prenotazioni appuntamenti |
| `avvisi` | Avvisi bacheca condominiale |
| `avvisi_letti` | Tracking lettura avvisi |
| `notifiche` | Notifiche in-app per utente |
| `trasmissioni` | Documenti trasmessi allo studio |
| `estratti_conto` | Estratti conto condominiali |
| `uploaded_files` | Metadati file caricati |
| `app_config` | Configurazione globale app |
| `fornitori` | Anagrafica fornitori esterni |
| `collaboratori` | Collaboratori dello studio |
| `sopralluoghi` | Sopralluoghi con checklist e anomalie |
| `informativa_versioni` | Versioni informativa privacy |
| `consensi` | Consensi GDPR per utente (privacy_policy, marketing, note_vocali) |
| `richieste_privacy` | Richieste diritti GDPR (Art. 15-22) |
| `audit_trail` | Log azioni sensibili (cancellazioni GDPR) |

---

## Permessi Device

### iOS (Info.plist)

| Permesso | Descrizione |
|----------|-------------|
| `NSCameraUsageDescription` | Scatta foto per documentare guasti |
| `NSPhotoLibraryUsageDescription` | Seleziona foto e video da allegare |
| `NSMicrophoneUsageDescription` | Registra note vocali nei sopralluoghi |

### Android (Permissions)

- `CAMERA`
- `READ_MEDIA_IMAGES`
- `READ_MEDIA_VIDEO`
- `READ_EXTERNAL_STORAGE`
- `RECORD_AUDIO`

---

## Tecnologie Utilizzate

### Frontend

| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| React Native | 0.79 | Framework mobile |
| Expo | SDK 54 | Piattaforma di sviluppo |
| Expo Router | 5.x | Routing file-based |
| TypeScript | 5.x | Tipizzazione statica |
| expo-image-picker | 17.x | Selezione foto/video |
| expo-document-picker | 14.x | Selezione documenti PDF |
| expo-av | — | Registrazione/riproduzione audio |
| AsyncStorage | 2.x | Persistenza locale (token) |
| @expo/vector-icons | — | Icone (Ionicons) |

### Backend

| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| Python | 3.11 | Linguaggio backend |
| FastAPI | 0.110+ | Framework API |
| Motor | 3.3+ | Driver MongoDB async |
| PyJWT | 2.11+ | Gestione token JWT |
| bcrypt | 4.1+ | Hashing password |
| uvicorn | 0.25+ | Server ASGI |
| xlrd | — | Parsing file XLS |

### Infrastruttura

| Tecnologia | Utilizzo |
|------------|----------|
| MongoDB | Database NoSQL |
| Kubernetes | Orchestrazione container |
| Nginx | Reverse proxy |
| Supervisor | Process management |

---

## Palette Colori

| Colore | Hex | Utilizzo |
|--------|-----|----------|
| Navy | `#1B2A4A` | Colore principale, header, sidebar, bottoni |
| Sky | `#4A90D9` | Accento, link, elementi interattivi |
| Sky Light | `#E8F0FE` | Sfondi leggeri, highlight |
| Background | `#F8FAFC` | Sfondo generale |
| White | `#FFFFFF` | Card, input, modali |
| Error | `#DC2626` | Errori, eliminazione |
| Success | `#16A34A` | Conferme, stati positivi |
| Warning | `#F59E0B` | Anomalie, attenzione |

---

## Licenza

Progetto proprietario sviluppato per **Studio Tardugno & Bonifacio** — Amministratore Condominiale, Salerno (Italia).

---

*Sviluppato per la gestione condominiale moderna.*
