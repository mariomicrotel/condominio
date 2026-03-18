"""All Pydantic models for the Studio Tardugno & Bonifacio API."""
from pydantic import BaseModel
from typing import List, Optional


# ── Auth Models ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    nome: str
    cognome: str
    telefono: str = ""
    indirizzo: str = ""
    codice_fiscale: str = ""
    codice_invito: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    codice_fiscale: Optional[str] = None


# ── Condominio Models ─────────────────────────────────────────────────────────

class CondominioCreate(BaseModel):
    tipo: str = "Condominio"
    nome: str
    indirizzo: str
    cap: str = ""
    citta: str = ""
    provincia: str = ""
    codice_fiscale: str = ""
    data_apertura_esercizio: str = ""
    data_costruzione: str = ""
    data_inizio_incarico: str = ""
    data_fine_incarico: str = ""
    banca: str = ""
    iban: str = ""
    swift: str = ""
    dati_catastali: str = ""
    note: str = ""


# ── Segnalazioni Models ──────────────────────────────────────────────────────

class SegnalazioneCreate(BaseModel):
    condominio_id: str
    qualita: str
    tipologia: str
    descrizione: str
    urgenza: str = "Media"
    immagini: List[str] = []
    allegati: List[str] = []

class AdminSegnalazioneUpdate(BaseModel):
    stato: Optional[str] = None
    note_admin: Optional[str] = None
    tipologia: Optional[str] = None
    descrizione: Optional[str] = None
    urgenza: Optional[str] = None
    allegati: Optional[List[str]] = None

class AdminSegnalazioneCreate(BaseModel):
    condominio_id: str
    tipologia: str
    descrizione: str
    urgenza: str = "Media"
    allegati: List[str] = []
    note_admin: str = ""


# ── Richieste / Appuntamenti / Avvisi Models ─────────────────────────────────

class RichiestaDocCreate(BaseModel):
    condominio_id: str
    tipo_documento: str
    note: str = ""
    formato: str = "PDF"

class AppuntamentoCreate(BaseModel):
    motivo: str
    data_richiesta: str
    fascia_oraria: str
    note: str = ""

class AvvisoCreate(BaseModel):
    condominio_id: Optional[str] = None
    titolo: str
    testo: str
    categoria: str = "Avviso generico"

class CodiceInvitoCreate(BaseModel):
    condominio_id: str
    unita_immobiliare: str = ""
    qualita: str = "Proprietario"

class AssociaUtenteCreate(BaseModel):
    user_id: str
    condominio_id: str
    unita_immobiliare: str = ""
    qualita: str = "Proprietario"

class AdminRichiestaUpdate(BaseModel):
    stato: Optional[str] = None
    file_url: Optional[str] = None

class AdminAppuntamentoUpdate(BaseModel):
    stato: Optional[str] = None
    data_confermata: Optional[str] = None
    note_admin: Optional[str] = None

class TrasmissioneCreate(BaseModel):
    condominio_id: str = ""
    oggetto: str
    note: str = ""
    files: List[dict] = []

class EstrattoContoCreate(BaseModel):
    user_id: str
    condominio_id: str
    periodo: str = ""
    quote_versate: float = 0
    quote_da_versare: float = 0
    scadenza: str = ""
    saldo: float = 0
    note: str = ""

class ConfigUpdate(BaseModel):
    google_maps_api_key: str = ""
    firebase_key: str = ""
    studio_telefono: str = ""
    studio_email: str = ""
    studio_pec: str = ""


# ── Fornitore Models ──────────────────────────────────────────────────────────

class FornitoreCreate(BaseModel):
    ragione_sociale: str
    partita_iva: str = ""
    codice_fiscale: str = ""
    settori: List[str] = []
    telefono: str = ""
    email: str
    password: str = ""
    indirizzo: str = ""
    iban: str = ""
    stato: str = "Attivo"

class AssegnaFornitoreCreate(BaseModel):
    fornitore_id: str
    note_admin: str = ""
    data_prevista: str = ""

class RapportinoCreate(BaseModel):
    data_intervento: str
    ora_inizio: str = ""
    ora_fine: str = ""
    descrizione_lavori: str
    esito: str
    materiali: str = ""
    note: str = ""
    foto: List[dict] = []


# ── GDPR Models ───────────────────────────────────────────────────────────────

class ConsensoRegistrazioneCreate(BaseModel):
    consenso_privacy: bool = False
    consenso_marketing: bool = False
    consenso_note_vocali: bool = False
    versione_informativa: str = "1.0"

class InformativaVersioneCreate(BaseModel):
    versione: str
    testo_completo: str
    note_versione: str = ""

class ConfermaAggiornamentoCreate(BaseModel):
    versione: str

class RichiestaPrivacyCreate(BaseModel):
    tipo: str

class EvadiRichiestaPrivacy(BaseModel):
    azione: str
    motivazione_rifiuto: Optional[str] = None
    note_admin: Optional[str] = None


# ── Collaboratori & Sopralluoghi Models ───────────────────────────────────────

class CollaboratoreCreate(BaseModel):
    nome: str
    cognome: str
    email: str
    password: str
    telefono: str = ""
    qualifica: str = ""
    stato: str = "Attivo"

class CollaboratoreUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    qualifica: Optional[str] = None
    stato: Optional[str] = None

class SopralluogoCreate(BaseModel):
    condominio_id: str
    data: str
    ora_inizio: str = ""
    collaboratore_id: Optional[str] = None
    motivo: str = "Controllo periodico"
    note_generali: str = ""
    nota_vocale_generale_id: Optional[str] = None

class SopralluogoClose(BaseModel):
    ora_fine: str = ""
    note_finali: str = ""
    nota_vocale_finale_id: Optional[str] = None
    valutazione: str = "Discreto"

class ChecklistItemUpdate(BaseModel):
    stato: str

class AnomaliaCreate(BaseModel):
    descrizione: str
    gravita: str = "Moderata"
    nota_vocale_ids: List[str] = []
    foto_ids: List[str] = []
    foto_didascalie: List[str] = []
    apri_segnalazione: bool = False
    fornitore_id: Optional[str] = None
    tipologia_intervento: Optional[str] = None
    urgenza_segnalazione: Optional[str] = None
    note_fornitore: Optional[str] = None
    data_prevista_intervento: Optional[str] = None
