"""Email notification service via Mailjet.

Provides branded HTML email templates and async sending for all
notification events in the Studio Tardugno & Bonifacio app.
"""
import logging
from typing import Optional
from mailjet_rest import Client

from database import db

logger = logging.getLogger(__name__)


# ── Config helpers ────────────────────────────────────────────────────────────

async def get_mailjet_config() -> dict:
    """Load Mailjet configuration from app_config collection."""
    cfg = await db.app_config.find_one({"key": "mailjet"}, {"_id": 0})
    return cfg.get("value", {}) if cfg else {}


async def is_mailjet_configured() -> bool:
    """Check if Mailjet keys are set."""
    cfg = await get_mailjet_config()
    return bool(cfg.get("api_key") and cfg.get("api_secret") and cfg.get("sender_email"))


def _get_client(cfg: dict) -> Optional[Client]:
    """Create Mailjet Client from config dict."""
    key = cfg.get("api_key", "")
    secret = cfg.get("api_secret", "")
    if not key or not secret:
        return None
    return Client(auth=(key, secret), version="v3.1")


# ── Base HTML Template ────────────────────────────────────────────────────────

def _base_html(title: str, body_html: str, footer_extra: str = "") -> str:
    """Wrap body content in the branded Studio T&B email layout."""
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4F8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4F8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background-color:#1B2A4A;padding:28px 32px;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="text-align:center;">
      <div style="width:48px;height:48px;background-color:rgba(255,255,255,0.15);border-radius:12px;display:inline-block;line-height:48px;font-size:22px;margin-bottom:8px;">&#127970;</div>
      <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;">Studio Tardugno &amp; Bonifacio</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);font-weight:400;">Gestione Condominiale</p>
    </td>
  </tr></table>
</td>
</tr>

<!-- Title bar -->
<tr>
<td style="background-color:#4A90D9;padding:14px 32px;">
  <h2 style="margin:0;font-size:16px;font-weight:600;color:#FFFFFF;">{title}</h2>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:28px 32px;">
{body_html}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;">
  {footer_extra}
  <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:18px;">
    Studio Tardugno &amp; Bonifacio<br>
    Via Raffaele Ricci, 37 — 84129 Salerno (SA)<br>
    <a href="mailto:info@tardugnobonifacio.it" style="color:#4A90D9;text-decoration:none;">info@tardugnobonifacio.it</a>
     · <a href="https://www.tardugnobonifacio.it" style="color:#4A90D9;text-decoration:none;">www.tardugnobonifacio.it</a>
  </p>
</td>
</tr>

</table>
</td></tr></table>
</body>
</html>"""


# ── HTML helpers ──────────────────────────────────────────────────────────────

def _info_row(label: str, value: str) -> str:
    return f"""<tr>
<td style="padding:8px 12px;font-size:13px;color:#64748B;font-weight:600;width:140px;vertical-align:top;">{label}</td>
<td style="padding:8px 12px;font-size:14px;color:#1E293B;">{value}</td>
</tr>"""


def _info_table(rows: list[tuple[str, str]]) -> str:
    inner = "".join(_info_row(l, v) for l, v in rows)
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;margin:16px 0;">{inner}</table>'


def _badge(text: str, color: str = "#4A90D9") -> str:
    return f'<span style="display:inline-block;background-color:{color};color:#FFFFFF;font-size:12px;font-weight:600;padding:4px 12px;border-radius:12px;">{text}</span>'


def _paragraph(text: str) -> str:
    return f'<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:22px;">{text}</p>'


def _heading(text: str) -> str:
    return f'<h3 style="margin:0 0 12px;font-size:16px;color:#1B2A4A;font-weight:700;">{text}</h3>'


# ── Send email (core) ─────────────────────────────────────────────────────────

async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    text_body: str = "",
) -> bool:
    """Send an email via Mailjet. Returns True on success."""
    cfg = await get_mailjet_config()
    client = _get_client(cfg)
    if not client:
        logger.warning("Mailjet not configured — email not sent to %s", to_email)
        return False

    sender_email = cfg.get("sender_email", "noreply@tardugnobonifacio.it")
    sender_name = cfg.get("sender_name", "Studio Tardugno & Bonifacio")

    data = {
        "Messages": [{
            "From": {"Email": sender_email, "Name": sender_name},
            "To": [{"Email": to_email, "Name": to_name}],
            "Subject": subject,
            "HTMLPart": html_body,
            "TextPart": text_body or subject,
        }]
    }
    try:
        result = client.send.create(data=data)
        if result.status_code in (200, 201):
            logger.info("Email sent to %s: %s", to_email, subject)
            return True
        else:
            logger.error("Mailjet error %s: %s", result.status_code, result.json())
            return False
    except Exception as e:
        logger.error("Mailjet exception: %s", e)
        return False


async def send_email_to_admins(subject: str, html_body: str, text_body: str = ""):
    """Send email to all admin users."""
    admins = await db.users.find({"ruolo": "admin"}, {"email": 1, "nome": 1, "cognome": 1}).to_list(10)
    for a in admins:
        name = f"{a.get('nome', '')} {a.get('cognome', '')}".strip() or "Amministratore"
        await send_email(a["email"], name, subject, html_body, text_body)


# ══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATION FUNCTIONS  — one per event type
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. BENVENUTO (registrazione completata) ───────────────────────────────────

async def notify_benvenuto(user: dict):
    nome = user.get("nome", "")
    body = _heading(f"Benvenuto, {nome}!")
    body += _paragraph("La tua registrazione sull'app condominiale dello Studio Tardugno & Bonifacio è stata completata con successo.")
    body += _paragraph("Da adesso puoi accedere all'app per segnalare guasti, richiedere documenti, prenotare appuntamenti e molto altro.")
    body += _info_table([
        ("Nome", f"{user.get('nome', '')} {user.get('cognome', '')}"),
        ("Email", user.get("email", "")),
    ])
    body += _paragraph("Se non hai effettuato tu questa registrazione, contatta lo studio immediatamente.")
    html = _base_html("Benvenuto nell'App Condominiale", body)
    await send_email(user["email"], f"{nome} {user.get('cognome', '')}", "Benvenuto — Studio Tardugno & Bonifacio", html)


# ── 2. SEGNALAZIONE CREATA (conferma al condomino) ───────────────────────────

async def notify_segnalazione_creata(seg: dict, user: dict):
    body = _heading("Segnalazione ricevuta")
    body += _paragraph(f"La tua segnalazione è stata registrata con il protocollo <strong>{seg.get('protocollo', '')}</strong>.")
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Tipologia", seg.get("tipologia", "")),
        ("Urgenza", seg.get("urgenza", "Media")),
        ("Descrizione", seg.get("descrizione", "")[:200]),
    ])
    body += _paragraph("Lo studio prenderà in carico la tua segnalazione il prima possibile. Riceverai aggiornamenti sullo stato di avanzamento.")
    html = _base_html("Segnalazione Ricevuta", body)
    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    await send_email(user["email"], nome, f"Segnalazione {seg.get('protocollo', '')} ricevuta", html)


# ── 3. SEGNALAZIONE AGGIORNATA (cambio stato) ────────────────────────────────

async def notify_segnalazione_aggiornata(seg: dict, nuovo_stato: str, nota: str = ""):
    user = await db.users.find_one({"id": seg.get("user_id")}, {"email": 1, "nome": 1, "cognome": 1})
    if not user:
        return
    stato_colors = {
        "Assegnata al fornitore": "#F59E0B",
        "Chiusa": "#16A34A",
        "Richiesto nuovo intervento": "#3B82F6",
        "In lavorazione": "#4A90D9",
    }
    color = stato_colors.get(nuovo_stato, "#4A90D9")
    body = _heading("Aggiornamento Segnalazione")
    body += _paragraph(f"La tua segnalazione <strong>{seg.get('protocollo', '')}</strong> ha cambiato stato:")
    body += f'<div style="text-align:center;margin:16px 0;">{_badge(nuovo_stato, color)}</div>'
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Tipologia", seg.get("tipologia", "")),
        ("Nuovo Stato", nuovo_stato),
    ])
    if nota:
        body += _paragraph(f"<strong>Nota:</strong> {nota}")
    html = _base_html("Aggiornamento Segnalazione", body)
    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    await send_email(user["email"], nome, f"Segnalazione {seg.get('protocollo', '')} — {nuovo_stato}", html)


# ── 4. APPUNTAMENTO CONFERMATO / ANNULLATO ────────────────────────────────────

async def notify_appuntamento_aggiornato(app: dict, nuovo_stato: str):
    user = await db.users.find_one({"id": app.get("user_id")}, {"email": 1, "nome": 1, "cognome": 1})
    if not user:
        return
    stato_map = {"Confermato": ("#16A34A", "confermato"), "Annullato": ("#DC2626", "annullato"), "Completato": ("#4A90D9", "completato")}
    color, label = stato_map.get(nuovo_stato, ("#4A90D9", nuovo_stato.lower()))
    body = _heading(f"Appuntamento {label}")
    body += _paragraph(f"Il tuo appuntamento è stato <strong>{label}</strong>.")
    body += _info_table([
        ("Data", app.get("data_richiesta", "")),
        ("Fascia Oraria", app.get("fascia_oraria", "")),
        ("Motivo", app.get("motivo", "")),
        ("Stato", nuovo_stato),
    ])
    if app.get("note_admin"):
        body += _paragraph(f"<strong>Note dello studio:</strong> {app['note_admin']}")
    html = _base_html(f"Appuntamento {label.capitalize()}", body)
    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    await send_email(user["email"], nome, f"Appuntamento {label} — Studio Tardugno & Bonifacio", html)


# ── 5. RICHIESTA DOCUMENTI EVASA ─────────────────────────────────────────────

async def notify_richiesta_doc_evasa(rich: dict, nuovo_stato: str):
    user = await db.users.find_one({"id": rich.get("user_id")}, {"email": 1, "nome": 1, "cognome": 1})
    if not user:
        return
    body = _heading("Richiesta Documenti Aggiornata")
    body += _paragraph(f"La tua richiesta di documento è stata aggiornata a: <strong>{nuovo_stato}</strong>.")
    body += _info_table([
        ("Tipo Documento", rich.get("tipo_documento", "")),
        ("Stato", nuovo_stato),
        ("Note", rich.get("note_admin", "") or "—"),
    ])
    html = _base_html("Richiesta Documenti", body)
    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    await send_email(user["email"], nome, f"Richiesta documenti — {nuovo_stato}", html)


# ── 6. NUOVO AVVISO PUBBLICATO ────────────────────────────────────────────────

async def notify_nuovo_avviso(avviso: dict, destinatari_emails: list[dict]):
    body = _heading(avviso.get("titolo", "Nuovo Avviso"))
    body += f'<div style="margin:12px 0;">{_badge(avviso.get("categoria", "Avviso"), "#F59E0B")}</div>'
    body += _paragraph(avviso.get("testo", ""))
    html = _base_html("Nuovo Avviso Condominiale", body)
    for dest in destinatari_emails:
        await send_email(dest["email"], dest.get("nome", "Condomino"), f"Avviso: {avviso.get('titolo', '')}", html)


# ── 7. PRIVACY RICHIESTA EVASA / RIFIUTATA ───────────────────────────────────

async def notify_privacy_evasa(richiesta: dict, azione: str):
    user = await db.users.find_one({"id": richiesta.get("user_id")}, {"email": 1, "nome": 1, "cognome": 1})
    if not user:
        return
    color = "#16A34A" if azione == "evasa" else "#DC2626"
    body = _heading(f"Richiesta Privacy {azione.capitalize()}")
    body += _paragraph(f"La tua richiesta privacy di tipo <strong>{richiesta.get('tipo', '')}</strong> è stata <strong>{azione}</strong>.")
    body += _info_table([
        ("Protocollo", richiesta.get("protocollo", "")),
        ("Tipo", richiesta.get("tipo", "")),
        ("Stato", _badge(azione.capitalize(), color)),
    ])
    if richiesta.get("motivazione_rifiuto"):
        body += _paragraph(f"<strong>Motivazione:</strong> {richiesta['motivazione_rifiuto']}")
    html = _base_html(f"Richiesta Privacy {azione.capitalize()}", body)
    nome = f"{user.get('nome', '')} {user.get('cognome', '')}".strip()
    await send_email(user["email"], nome, f"Richiesta privacy {azione} — Prot. {richiesta.get('protocollo', '')}", html)


# ── 8. ADMIN: NUOVA SEGNALAZIONE RICEVUTA ────────────────────────────────────

async def notify_admin_nuova_segnalazione(seg: dict, user_info: dict):
    body = _heading("Nuova Segnalazione Ricevuta")
    body += _paragraph(f"Un condomino ha inviato una nuova segnalazione.")
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Condomino", f"{user_info.get('nome', '')} {user_info.get('cognome', '')}"),
        ("Tipologia", seg.get("tipologia", "")),
        ("Urgenza", seg.get("urgenza", "Media")),
        ("Descrizione", seg.get("descrizione", "")[:200]),
    ])
    urgenza = seg.get("urgenza", "")
    if urgenza in ("Alta", "Urgente"):
        body += f'<div style="background-color:#FEF2F2;border-left:3px solid #DC2626;padding:12px;border-radius:6px;margin:12px 0;"><strong style="color:#DC2626;">⚠ Urgenza {urgenza}</strong> — Richiede attenzione immediata.</div>'
    html = _base_html("Nuova Segnalazione", body)
    await send_email_to_admins(f"Nuova Segnalazione {seg.get('protocollo', '')} — {urgenza}", html)


# ── 9. ADMIN: NUOVO APPUNTAMENTO RICHIESTO ───────────────────────────────────

async def notify_admin_nuovo_appuntamento(app: dict, user_info: dict):
    body = _heading("Nuovo Appuntamento Richiesto")
    body += _info_table([
        ("Condomino", f"{user_info.get('nome', '')} {user_info.get('cognome', '')}"),
        ("Data", app.get("data_richiesta", "")),
        ("Fascia Oraria", app.get("fascia_oraria", "")),
        ("Motivo", app.get("motivo", "")),
    ])
    html = _base_html("Nuovo Appuntamento", body)
    await send_email_to_admins("Nuovo appuntamento richiesto", html)


# ── 10. ADMIN: NUOVA RICHIESTA DOCUMENTI ─────────────────────────────────────

async def notify_admin_nuova_richiesta_doc(rich: dict, user_info: dict):
    body = _heading("Nuova Richiesta Documenti")
    body += _info_table([
        ("Condomino", f"{user_info.get('nome', '')} {user_info.get('cognome', '')}"),
        ("Tipo Documento", rich.get("tipo_documento", "")),
        ("Note", rich.get("note", "") or "—"),
    ])
    html = _base_html("Nuova Richiesta Documenti", body)
    await send_email_to_admins("Nuova richiesta documenti", html)


# ── 11. ADMIN: NUOVA TRASMISSIONE DOCUMENTI ──────────────────────────────────

async def notify_admin_nuova_trasmissione(trasm: dict, user_info: dict):
    body = _heading("Nuova Trasmissione Documenti")
    body += _paragraph(f"Un condomino ha trasmesso dei documenti allo studio.")
    body += _info_table([
        ("Condomino", f"{user_info.get('nome', '')} {user_info.get('cognome', '')}"),
        ("Oggetto", trasm.get("oggetto", "")),
        ("N° File", str(len(trasm.get("files", [])))),
        ("Note", trasm.get("note", "") or "—"),
    ])
    html = _base_html("Nuova Trasmissione Documenti", body)
    await send_email_to_admins("Nuova trasmissione documenti ricevuta", html)


# ── 12. ADMIN: NUOVA RICHIESTA PRIVACY ───────────────────────────────────────

async def notify_admin_nuova_richiesta_privacy(rich: dict):
    body = _heading("Nuova Richiesta Privacy GDPR")
    body += f'<div style="background-color:#FEF3C7;border-left:3px solid #F59E0B;padding:12px;border-radius:6px;margin:12px 0;"><strong style="color:#92400E;">Scadenza legale 30 giorni</strong></div>'
    body += _info_table([
        ("Protocollo", rich.get("protocollo", "")),
        ("Richiedente", rich.get("user_nome", "")),
        ("Tipo", rich.get("tipo", "")),
        ("Scadenza", rich.get("scadenza", "")[:10]),
    ])
    body += _paragraph("Ricorda: le richieste GDPR devono essere evase entro 30 giorni dalla ricezione.")
    html = _base_html("Richiesta Privacy GDPR", body)
    await send_email_to_admins(f"Richiesta Privacy GDPR — {rich.get('tipo', '')} — Prot. {rich.get('protocollo', '')}", html)


# ── 13. ADMIN: RAPPORTINO FORNITORE COMPILATO ─────────────────────────────────

async def notify_admin_rapportino_compilato(seg: dict, rapportino: dict, fornitore: dict):
    body = _heading("Rapportino Fornitore Compilato")
    body += _paragraph(f"Il fornitore <strong>{fornitore.get('ragione_sociale', '')}</strong> ha compilato il rapportino per la segnalazione <strong>{seg.get('protocollo', '')}</strong>.")
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Fornitore", fornitore.get("ragione_sociale", "")),
        ("Data Intervento", rapportino.get("data_intervento", "")),
        ("Esito", rapportino.get("esito", "")),
        ("Descrizione Lavori", rapportino.get("descrizione_lavori", "")[:200]),
    ])
    html = _base_html("Rapportino Compilato", body)
    await send_email_to_admins(f"Rapportino compilato — {seg.get('protocollo', '')}", html)


# ── 14. FORNITORE: NUOVO INTERVENTO ASSEGNATO ────────────────────────────────

async def notify_fornitore_nuovo_intervento(seg: dict, fornitore: dict, note: str = "", data_prevista: str = ""):
    body = _heading("Nuovo Intervento Assegnato")
    body += _paragraph(f"Ti è stato assegnato un nuovo intervento dallo Studio Tardugno & Bonifacio.")
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Tipologia", seg.get("tipologia", "")),
        ("Urgenza", seg.get("urgenza", "")),
        ("Descrizione", seg.get("descrizione", "")[:200]),
    ])
    if data_prevista:
        body += _paragraph(f"<strong>Data prevista intervento:</strong> {data_prevista}")
    if note:
        body += _paragraph(f"<strong>Note:</strong> {note}")
    body += _paragraph("Accedi all'app per visualizzare i dettagli completi e compilare il rapportino al termine dell'intervento.")
    html = _base_html("Nuovo Intervento Assegnato", body)
    await send_email(fornitore.get("email", ""), fornitore.get("ragione_sociale", "Fornitore"), f"Nuovo intervento — {seg.get('protocollo', '')}", html)


# ── 15. FORNITORE: RICHIESTA NUOVO INTERVENTO (RIAPERTA) ─────────────────────

async def notify_fornitore_richiesta_nuovo_intervento(seg: dict, fornitore: dict):
    body = _heading("Richiesta Nuovo Intervento")
    body += _paragraph(f"Lo studio ha richiesto un nuovo intervento per la segnalazione <strong>{seg.get('protocollo', '')}</strong>.")
    body += _info_table([
        ("Protocollo", seg.get("protocollo", "")),
        ("Tipologia", seg.get("tipologia", "")),
        ("Descrizione", seg.get("descrizione", "")[:200]),
    ])
    body += _paragraph("Accedi all'app per visualizzare i dettagli e programmare l'intervento.")
    html = _base_html("Richiesta Nuovo Intervento", body)
    await send_email(fornitore.get("email", ""), fornitore.get("ragione_sociale", "Fornitore"), f"Nuovo intervento richiesto — {seg.get('protocollo', '')}", html)
