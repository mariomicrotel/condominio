// Shared types, constants and interfaces for admin mobile tabs
import { Colors } from '../../constants/Colors';

export type Tab = 'dashboard' | 'condomini' | 'utenti' | 'fornitori' | 'sopralluoghi' | 'segnalazioni' | 'appuntamenti' | 'avvisi' | 'trasmissioni' | 'richieste-doc' | 'config' | 'privacy';

export interface MediaFile {
  uri: string;
  filename: string;
  mimeType: string;
  size?: number;
  type: 'image' | 'video' | 'pdf';
  uploadedId?: string;
}

export const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'condomini', label: 'Condomini', icon: 'business-outline' },
  { key: 'utenti', label: 'Utenti', icon: 'people-outline' },
  { key: 'segnalazioni', label: 'Segnalazioni', icon: 'warning-outline' },
  { key: 'sopralluoghi', label: 'Sopralluoghi', icon: 'search-outline' },
  { key: 'fornitori', label: 'Fornitori', icon: 'construct-outline' },
  { key: 'appuntamenti', label: 'Appuntamenti', icon: 'calendar-outline' },
  { key: 'avvisi', label: 'Avvisi', icon: 'megaphone-outline' },
  { key: 'trasmissioni', label: 'Trasmissioni', icon: 'documents-outline' },
  { key: 'richieste-doc', label: 'Richieste', icon: 'document-text-outline' },
  { key: 'config', label: 'Impostazioni', icon: 'settings-outline' },
  { key: 'privacy', label: 'Privacy', icon: 'shield-outline' },
];

export const STAT_ITEMS: { key: string; label: string; icon: string; color: string; field: string; tab: Tab }[] = [
  { key: 'utenti', label: 'Utenti', icon: 'people', color: '#3B82F6', field: 'totale_utenti', tab: 'utenti' },
  { key: 'cond', label: 'Condomini', icon: 'business', color: '#10B981', field: 'totale_condomini', tab: 'condomini' },
  { key: 'seg', label: 'Segnalazioni', icon: 'warning', color: '#F59E0B', field: 'segnalazioni_aperte', tab: 'segnalazioni' },
  { key: 'rich', label: 'Richieste', icon: 'document-text', color: '#8B5CF6', field: 'richieste_in_attesa', tab: 'richieste-doc' },
  { key: 'app', label: 'Appuntamenti', icon: 'calendar', color: '#EC4899', field: 'appuntamenti_da_confermare', tab: 'appuntamenti' },
  { key: 'avv', label: 'Avvisi', icon: 'megaphone', color: '#0D9488', field: 'totale_avvisi', tab: 'avvisi' },
];

export const QUALITA_OPT = ['Proprietario', 'Inquilino', 'Usufruttuario', 'Nuda proprietà', 'Amministratore'];
export const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Infiltrazioni', 'Ascensore', 'Pulizia', 'Rumore molesto', 'Danni strutturali', 'Altro'];
export const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];
export const GRAVITA_OPTIONS = ['Lieve', 'Moderata', 'Grave', 'Urgente'];
export const MOTIVI_SOPRALLUOGO = ['Controllo periodico', 'Verifica segnalazione', 'Verifica lavori', 'Sopralluogo tecnico', 'Altro'];
export const VALUTAZIONI = ['Ottimo', 'Buono', 'Discreto', 'Sufficiente', 'Insufficiente', 'Critico'];
export const SETTORI = ['Idraulica', 'Elettricità', 'Edilizia', 'Pulizia', 'Fabbro', 'Ascensori', 'Giardinaggio', 'Imbiancatura', 'Altro'];

// Helper functions
export const getSemaforoColor = (stato: string) => {
  switch (stato) {
    case 'ok': return '#22C55E';
    case 'anomalia': return '#F59E0B';
    default: return '#9CA3AF';
  }
};

export const getSemaforoIcon = (stato: string) => {
  switch (stato) {
    case 'ok': return 'checkmark-circle';
    case 'anomalia': return 'alert-circle';
    default: return 'ellipse-outline';
  }
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileIcon = (type: string): string => {
  switch (type) {
    case 'image': return 'image';
    case 'video': return 'videocam';
    case 'pdf': return 'document-text';
    default: return 'attach';
  }
};

export const getFileColor = (type: string): string => {
  switch (type) {
    case 'image': return '#3B82F6';
    case 'video': return '#8B5CF6';
    case 'pdf': return '#EF4444';
    default: return Colors.textMuted;
  }
};

// Privacy labels
export const PRIV_TIPO_LABELS: Record<string, string> = {
  accesso: 'Accesso ai dati',
  rettifica: 'Rettifica dati',
  cancellazione: 'Cancellazione account',
  portabilita: 'Portabilità dati',
  opposizione: 'Opposizione trattamento',
};
