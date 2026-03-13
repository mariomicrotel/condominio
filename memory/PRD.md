# Studio Tardugno & Bonifacio - PRD (Product Requirements Document)

## Panoramica
App mobile (Android-first) per lo Studio Tardugno & Bonifacio, studio di consulenza contabile, fiscale e amministrazione condominiale con sede a Salerno. L'app serve i condomini amministrati dallo studio e il personale amministrativo.

## Credenziali di Test
- **Admin:** admin@tardugno.it / admin123
- **Condomino:** mario.rossi@email.it / password123
- **Codice invito:** WELCOME1

## Stack Tecnologico
- **Frontend:** React Native Expo (SDK 54) con Expo Router
- **Backend:** FastAPI (Python) 
- **Database:** MongoDB
- **Auth:** JWT con email/password
- **Storage file:** Base64 in MongoDB

## Funzionalità Implementate (MVP - Fase 1)

### Autenticazione
- [x] Login con email e password
- [x] Registrazione con codice invito
- [x] JWT token management
- [x] Profilo utente con modifica dati

### Home Dashboard
- [x] Griglia 8 tile (2 colonne) con icone circolari
- [x] Accesso rapido a segnalazioni, richieste, appuntamenti
- [x] Header con branding studio

### Segnalazione Guasti
- [x] Form completo con disclaimer
- [x] Campi precompilati dal profilo
- [x] Picker per condominio, qualità, tipologia, urgenza
- [x] Numero di protocollo alla conferma
- [x] Lista segnalazioni con stato e filtri

### Richieste Documenti
- [x] Form con tipo documento, condominio, formato
- [x] Storico richieste con stato

### Appuntamenti
- [x] Prenotazione con motivo, data, fascia oraria
- [x] Orari di ricevimento studio
- [x] Lista appuntamenti con stato

### Bacheca Condominiale
- [x] Feed avvisi filtrati per condominio
- [x] Categorie colorate (assemblea, lavori, urgenze)
- [x] Segna come letto

### Contatti
- [x] Info studio complete
- [x] Pulsanti chiama/email/mappa
- [x] Orari di ricevimento

### Chi Siamo
- [x] Presentazione studio
- [x] Profili professionisti
- [x] Servizi offerti

### Pannello Amministratore
- [x] Dashboard statistiche
- [x] Gestione segnalazioni (cambio stato)
- [x] Gestione appuntamenti (conferma/annulla)
- [x] Pubblicazione avvisi (nuovo/elimina)
- [x] Lista utenti registrati
- [x] Tab navigation bottom

## Funzionalità Fase 2 (Da implementare)
- [ ] Trasmissione Documenti
- [ ] Il Mio Condominio (estratti conto dettagliati)
- [ ] Upload immagini segnalazioni
- [ ] Notifiche Push (Firebase)
- [ ] Export CSV/Excel
- [ ] Gestione codici invito dall'admin
- [ ] Google Maps integrata
- [ ] Gestione condomini CRUD dall'admin

## Struttura File
```
backend/
  server.py           - API FastAPI completa
  .env               - MONGO_URL, DB_NAME, JWT_SECRET

frontend/
  src/
    constants/theme.ts     - Colori, spacing
    context/AuthContext.tsx - Gestione auth state
    services/api.ts        - API service layer
    components/SharedComponents.tsx - Componenti riutilizzabili
  app/
    _layout.tsx       - Root layout (Stack + AuthProvider)
    index.tsx         - Entry point / redirect
    login.tsx         - Schermata login
    register.tsx      - Schermata registrazione
    home.tsx          - Dashboard tile grid
    segnalazioni.tsx  - Form segnalazione guasti
    segnalazioni-lista.tsx - Lista segnalazioni
    richiesta-documenti.tsx - Form richiesta documenti
    storico-richieste.tsx   - Storico richieste
    appuntamenti.tsx        - Prenotazione appuntamento
    appuntamenti-lista.tsx  - Lista appuntamenti
    bacheca.tsx       - Bacheca condominiale
    contatti.tsx      - Pagina contatti
    chi-siamo.tsx     - Chi siamo
    profilo.tsx       - Profilo utente
    admin.tsx         - Pannello amministratore
```

## API Endpoints
| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | /api/auth/register | Registrazione |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Profilo utente |
| PUT | /api/auth/profile | Aggiorna profilo |
| GET | /api/condomini | Lista condomini |
| POST | /api/segnalazioni | Nuova segnalazione |
| GET | /api/segnalazioni | Lista segnalazioni |
| POST | /api/richieste-documenti | Nuova richiesta |
| GET | /api/richieste-documenti | Lista richieste |
| POST | /api/appuntamenti | Nuovo appuntamento |
| GET | /api/appuntamenti | Lista appuntamenti |
| GET | /api/avvisi | Lista avvisi |
| PUT | /api/avvisi/{id}/letto | Segna come letto |
| GET | /api/admin/dashboard | Stats admin |
| GET/PUT | /api/admin/segnalazioni | Gestione segnalazioni |
| GET/PUT | /api/admin/appuntamenti | Gestione appuntamenti |
| POST/GET/DELETE | /api/admin/avvisi | Gestione avvisi |
| GET | /api/admin/utenti | Lista utenti |
