import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, RefreshControl, ActivityIndicator, Modal, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge, PrimaryButton, PickerSelect } from '../src/components/SharedComponents';
import { VoiceRecorder } from '../src/components/VoiceRecorder';

// Media file interface for uploads
interface MediaFile {
  uri: string;
  filename: string;
  mimeType: string;
  size?: number;
  type: 'image' | 'video' | 'pdf';
  uploadedId?: string;
}

type Tab = 'dashboard' | 'condomini' | 'utenti' | 'fornitori' | 'sopralluoghi' | 'segnalazioni' | 'appuntamenti' | 'avvisi' | 'trasmissioni' | 'config' | 'privacy';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'condomini', label: 'Condomini', icon: 'business-outline' },
  { key: 'utenti', label: 'Utenti', icon: 'people-outline' },
  { key: 'fornitori', label: 'Fornitori', icon: 'construct-outline' },
  { key: 'sopralluoghi', label: 'Sopralluoghi', icon: 'search-outline' },
  { key: 'segnalazioni', label: 'Guasti', icon: 'warning-outline' },
  { key: 'appuntamenti', label: 'Appuntamenti', icon: 'calendar-outline' },
  { key: 'avvisi', label: 'Avvisi', icon: 'megaphone-outline' },
  { key: 'trasmissioni', label: 'Documenti', icon: 'documents-outline' },
  { key: 'config', label: 'Impostazioni', icon: 'settings-outline' },
  { key: 'privacy', label: 'Privacy', icon: 'shield-checkmark-outline' },
];

const QUALITA_OPT = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];
const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Ascensore', 'Infiltrazioni', 'Parti comuni', 'Pulizia', 'Sicurezza', 'Altro'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];
const TIPO_COND_OPT = ['Condominio', 'Palazzo', 'Edificio', 'Complesso residenziale', 'Villaggio', 'Altro'];

// ── Condominio Form Fields ─────────────────────────────────────────────────────
function CondominioFormFields({ form, onChange }: { form: any; onChange: (key: string, value: string) => void }) {
  const inp = (placeholder: string, key: string, opts?: { multiline?: boolean; keyboard?: any; testID?: string }) => (
    <TextInput
      testID={opts?.testID || `cond-${key}-input`}
      style={[cfStyles.input, opts?.multiline && { height: 72, textAlignVertical: 'top' }]}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      value={form[key] || ''}
      onChangeText={v => onChange(key, v)}
      keyboardType={opts?.keyboard}
      multiline={opts?.multiline}
    />
  );

  return (
    <>
      {/* ANAGRAFICA */}
      <Text style={cfStyles.sectionHeader}>Anagrafica</Text>
      <PickerSelect
        label="Tipo *"
        value={form.tipo || 'Condominio'}
        options={TIPO_COND_OPT}
        onSelect={v => onChange('tipo', v)}
        testID="cond-tipo-picker"
      />
      {inp('Nome condominio *', 'nome', { testID: 'cond-nome-input' })}
      {inp('Codice Fiscale', 'codice_fiscale', { testID: 'cond-cf-input' })}

      {/* INDIRIZZO */}
      <Text style={cfStyles.sectionHeader}>Indirizzo</Text>
      {inp('Via / Piazza *', 'indirizzo', { testID: 'cond-indirizzo-input' })}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 100 }}>{inp('CAP', 'cap', { keyboard: 'number-pad' })}</View>
        <View style={{ flex: 1 }}>{inp('Città', 'citta')}</View>
        <View style={{ width: 60 }}>{inp('Prov.', 'provincia')}</View>
      </View>

      {/* DATI GESTIONALI */}
      <Text style={cfStyles.sectionHeader}>Date gestionali</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{inp('Data apertura esercizio (gg/mm/aaaa)', 'data_apertura_esercizio')}</View>
        <View style={{ flex: 1 }}>{inp('Data costruzione', 'data_costruzione')}</View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{inp('Inizio incarico (gg/mm/aaaa)', 'data_inizio_incarico')}</View>
        <View style={{ flex: 1 }}>{inp('Fine incarico (gg/mm/aaaa)', 'data_fine_incarico')}</View>
      </View>

      {/* BANCA */}
      <Text style={cfStyles.sectionHeader}>Dati bancari</Text>
      {inp('Banca', 'banca')}
      {inp('IBAN', 'iban')}
      {inp('SWIFT / BIC', 'swift')}

      {/* CATASTO */}
      <Text style={cfStyles.sectionHeader}>Dati catastali</Text>
      {inp('Dati catastali', 'dati_catastali', { multiline: true })}

      {/* NOTE */}
      <Text style={cfStyles.sectionHeader}>Note</Text>
      {inp('Note interne', 'note', { multiline: true, testID: 'cond-note-input' })}
    </>
  );
}
const cfStyles = StyleSheet.create({
  sectionHeader: { fontSize: 12, fontWeight: '700', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 14, marginBottom: 10, fontSize: 15, color: Colors.textMain },
});

const PRIV_TIPO_LABELS: Record<string, string> = {
  cancellazione: 'Cancellazione account',
  limitazione: 'Limitazione trattamento',
  accesso: 'Accesso ai dati',
  portabilita: 'Portabilità dati',
  opposizione: 'Opposizione',
};
const PRIV_TIPO_COLORS: Record<string, string> = {
  cancellazione: '#FEE2E2',
  limitazione: '#FEF3C7',
  accesso: '#DBEAFE',
  portabilita: '#F3E8FF',
  opposizione: '#FCE7F3',
};
const PRIV_STATO_COLORS: Record<string, { bg: string; text: string }> = {
  ricevuta: { bg: '#DBEAFE', text: '#1D4ED8' },
  in_lavorazione: { bg: '#FEF9C3', text: '#A16207' },
  evasa: { bg: '#DCFCE7', text: '#15803D' },
  rifiutata: { bg: '#FEE2E2', text: '#DC2626' },
};

function PrivacyAdminTab({ token, richieste, loading, scadenzaCount, filter, onFilterChange, onLoad, onDetail }: {
  token: string; richieste: any[]; loading: boolean; scadenzaCount: number;
  filter: any; onFilterChange: (f: any) => void; onLoad: () => void; onDetail: (r: any) => void;
}) {
  React.useEffect(() => { onLoad(); }, []);

  const fmtD = (iso: string) => iso ? new Date(iso).toLocaleDateString('it-IT') : '—';

  const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[pvs.chip, active && pvs.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[pvs.chipText, active && pvs.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={onLoad} />}>
      {/* Banner scadenza imminente */}
      {scadenzaCount > 0 && (
        <View style={pvs.alertBanner}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={pvs.alertText}>
            {scadenzaCount} {scadenzaCount === 1 ? 'richiesta scade' : 'richieste scadono'} entro 5 giorni!
          </Text>
          <TouchableOpacity onPress={() => onFilterChange({ ...filter, scadenza: !filter.scadenza })} style={pvs.alertBtn}>
            <Text style={pvs.alertBtnText}>{filter.scadenza ? 'Tutte' : 'Mostra'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <Text style={pvs.filterLabel}>Filtra per stato:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          <FilterChip label="Tutte" active={!filter.stato} onPress={() => onFilterChange({ ...filter, stato: undefined })} />
          {['ricevuta', 'in_lavorazione', 'evasa', 'rifiutata'].map(s => (
            <FilterChip key={s} label={s.replace('_', ' ')} active={filter.stato === s}
              onPress={() => onFilterChange({ ...filter, stato: filter.stato === s ? undefined : s })} />
          ))}
        </View>
      </ScrollView>

      <Text style={pvs.filterLabel}>Filtra per tipo:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          <FilterChip label="Tutti" active={!filter.tipo} onPress={() => onFilterChange({ ...filter, tipo: undefined })} />
          {Object.entries(PRIV_TIPO_LABELS).map(([k, v]) => (
            <FilterChip key={k} label={v} active={filter.tipo === k}
              onPress={() => onFilterChange({ ...filter, tipo: filter.tipo === k ? undefined : k })} />
          ))}
        </View>
      </ScrollView>

      {/* List */}
      {loading
        ? <ActivityIndicator size="large" color={Colors.navy} style={{ marginTop: 32 }} />
        : richieste.length === 0
          ? <View style={pvs.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
              <Text style={pvs.emptyText}>Nessuna richiesta privacy</Text>
              <Text style={pvs.emptySubText}>Le richieste degli utenti appariranno qui</Text>
            </View>
          : richieste.map(r => {
              const stato = PRIV_STATO_COLORS[r.stato] || { bg: '#F3F4F6', text: '#374151' };
              const isScadente = r.giorni_rimanenti !== null && r.giorni_rimanenti !== undefined && r.giorni_rimanenti <= 5
                && (r.stato === 'ricevuta' || r.stato === 'in_lavorazione');
              return (
                <TouchableOpacity key={r.id} style={[pvs.card, isScadente && pvs.cardScadente]} onPress={() => onDetail(r)} activeOpacity={0.8}>
                  <View style={pvs.cardTop}>
                    <View style={[pvs.tipoBadge, { backgroundColor: PRIV_TIPO_COLORS[r.tipo] || '#F3F4F6' }]}>
                      <Text style={pvs.tipoBadgeText}>{PRIV_TIPO_LABELS[r.tipo] || r.tipo}</Text>
                    </View>
                    <View style={[pvs.statoBadge, { backgroundColor: stato.bg }]}>
                      <Text style={[pvs.statoBadgeText, { color: stato.text }]}>{r.stato}</Text>
                    </View>
                  </View>
                  <View style={pvs.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={pvs.cardNome}>{r.user_nome || r.user_email || 'Utente rimosso'}</Text>
                      <Text style={pvs.cardProto}>{r.protocollo}</Text>
                      <Text style={pvs.cardDate}>Ricevuta: {fmtD(r.created_at)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {(r.stato === 'ricevuta' || r.stato === 'in_lavorazione') && (
                        <View style={[pvs.scadBadge, isScadente && pvs.scadBadgeRed]}>
                          <Ionicons name="time-outline" size={12} color={isScadente ? '#DC2626' : Colors.textSec} />
                          <Text style={[pvs.scadText, isScadente && pvs.scadTextRed]}>
                            {r.giorni_rimanenti !== null ? `${r.giorni_rimanenti}gg` : fmtD(r.scadenza)}
                          </Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginTop: 6 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
      }
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const STAT_ITEMS = [
  { key: 'utenti', label: 'Utenti', field: 'totale_utenti', color: '#3B82F6', icon: 'people', tab: 'utenti' as Tab },
  { key: 'condomini', label: 'Condomini', field: 'totale_condomini', color: '#10B981', icon: 'business', tab: 'condomini' as Tab },
  { key: 'segnalazioni', label: 'Segnalazioni', field: 'segnalazioni_aperte', color: '#F59E0B', icon: 'warning', tab: 'segnalazioni' as Tab },
  { key: 'richieste', label: 'Richieste', field: 'richieste_in_attesa', color: '#8B5CF6', icon: 'document-text', tab: 'dashboard' as Tab },
  { key: 'appuntamenti', label: 'Appuntamenti', field: 'appuntamenti_da_confermare', color: '#EC4899', icon: 'calendar', tab: 'appuntamenti' as Tab },
  { key: 'avvisi', label: 'Avvisi', field: 'totale_avvisi', color: '#0D9488', icon: 'megaphone', tab: 'avvisi' as Tab },
];

export default function Admin() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [condomini, setCondomini] = useState<any[]>([]);
  const [utenti, setUtenti] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSeg, setModalSeg] = useState<any>(null);
  const [modalApp, setModalApp] = useState<any>(null);
  const [showNewAvviso, setShowNewAvviso] = useState(false);
  const [showNewCond, setShowNewCond] = useState(false);
  const [showAssocModal, setShowAssocModal] = useState<any>(null);
  const [newAvviso, setNewAvviso] = useState({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
  const [newCond, setNewCond] = useState({
    tipo: 'Condominio', nome: '', indirizzo: '', cap: '', citta: '', provincia: '',
    codice_fiscale: '', data_apertura_esercizio: '', data_costruzione: '',
    data_inizio_incarico: '', data_fine_incarico: '',
    banca: '', iban: '', swift: '', dati_catastali: '', note: ''
  });
  const [editCond, setEditCond] = useState<any>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [condSearch, setCondSearch] = useState('');
  const [assocForm, setAssocForm] = useState({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });
  const [config, setConfig] = useState({ google_maps_api_key: '', firebase_key: '', studio_telefono: '', studio_email: '', studio_pec: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const [trasmissioni, setTrasmissioni] = useState<any[]>([]);
  const [showECModal, setShowECModal] = useState<any>(null);
  const [ecForm, setEcForm] = useState({ condominio_id: '', periodo: '', quote_versate: '', quote_da_versare: '', scadenza: '', saldo: '', note: '' });
  // Fornitori state
  const [fornitori, setFornitori] = useState<any[]>([]);
  const [showNewForn, setShowNewForn] = useState(false);
  const [newForn, setNewForn] = useState({ ragione_sociale: '', partita_iva: '', codice_fiscale: '', settori: [] as string[], telefono: '', email: '', indirizzo: '', iban: '', stato: 'Attivo', password: '' });
  const [showAssegnaFornModal, setShowAssegnaFornModal] = useState<any>(null); // segnalazione to assign
  const [assegnaFornForm, setAssegnaFornForm] = useState({ fornitore_id: '', note_admin: '', data_prevista: '' });
  // Segnalazione create/edit states
  const [showNewSegModal, setShowNewSegModal] = useState(false);
  const [isEditingSeg, setIsEditingSeg] = useState(false);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [segForm, setSegForm] = useState({ condominio_id: '', tipologia: '', descrizione: '', urgenza: 'Media', note_admin: '' });
  const [segMediaFiles, setSegMediaFiles] = useState<MediaFile[]>([]);
  const [segUploadProgress, setSegUploadProgress] = useState('');
  // Sopralluoghi state
  const [sopralluoghi, setSopralluoghi] = useState<any[]>([]);
  const [collaboratori, setCollaboratori] = useState<any[]>([]);
  const [showNewSopralluogo, setShowNewSopralluogo] = useState(false);
  const [showSopralluogoDetail, setShowSopralluogoDetail] = useState<any>(null);
  const [sopralluogoForm, setSopralluogoForm] = useState({ condominio_id: '', data: '', ora_inizio: '', motivo: 'Controllo periodico', note_generali: '', collaboratore_id: '' });
  const [showNewCollaboratore, setShowNewCollaboratore] = useState(false);
  const [collabForm, setCollabForm] = useState({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' });
  const [utentiFilterCondo, setUtentiFilterCondo] = useState<string>(''); // Filter users by condominio
  const [showAnomaliaModal, setShowAnomaliaModal] = useState<any>(null); // { sopralluogo, item }
  const [anomaliaForm, setAnomaliaForm] = useState({ descrizione: '', gravita: 'Moderata', foto_ids: [] as string[], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' });
  const [anomaliaPhotos, setAnomaliaPhotos] = useState<MediaFile[]>([]);
  const [anomaliaVoiceNotes, setAnomaliaVoiceNotes] = useState<{ uri: string; filename: string; duration: number; uploadedId?: string }[]>([]);
  const [voiceRecorderKey, setVoiceRecorderKey] = useState(0); // Key to reset VoiceRecorder
  const [playingVoiceNoteIndex, setPlayingVoiceNoteIndex] = useState<number | null>(null);
  const [voiceNoteSound, setVoiceNoteSound] = useState<any>(null);

  // Privacy Admin state
  const [richiestePrivacy, setRichiestePrivacy] = useState<any[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyScadenzaCount, setPrivacyScadenzaCount] = useState(0);
  const [privacyFilter, setPrivacyFilter] = useState<{ stato?: string; tipo?: string; scadenza?: boolean }>({});
  const [showPrivacyDetail, setShowPrivacyDetail] = useState<any>(null);
  const [evadiForm, setEvadiForm] = useState({ azione: 'evasa', motivazione_rifiuto: '', note_admin: '' });
  const [evadiLoading, setEvadiLoading] = useState(false);

  // Sopralluoghi constants
  const MOTIVI_SOPRALLUOGO = ['Controllo periodico', 'Verifica post-intervento', 'Sopralluogo su segnalazione', 'Perizia', 'Altro'];
  const GRAVITA_OPTIONS = ['Lieve', 'Moderata', 'Grave', 'Urgente'];
  const VALUTAZIONI = ['Buono', 'Discreto', 'Sufficiente', 'Critico'];

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cond, seg, app, avv, ut, trasm, forn, sop, collab] = await Promise.all([
        api.getAdminDashboard(token!), api.getCondomini(token!),
        api.getAdminSegnalazioni(token!), api.getAdminAppuntamenti(token!),
        api.getAdminAvvisi(token!), api.getAdminUtenti(token!),
        api.getAdminTrasmissioni(token!).catch(() => []),
        api.getAdminFornitori(token!).catch(() => []),
        api.getSopralluoghi(token!).catch(() => []),
        api.getCollaboratori(token!).catch(() => []),
      ]);
      setStats(s); setCondomini(cond); setSegnalazioni(seg); setAppuntamenti(app); setAvvisi(avv); setUtenti(ut); setTrasmissioni(trasm); setFornitori(forn); setSopralluoghi(sop); setCollaboratori(collab);
      // Load privacy badge count
      api.adminCountScadenzaPrivacy(token!).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadPrivacyRichieste = useCallback(async (filters?: { stato?: string; tipo?: string; scadenza?: boolean }) => {
    if (!token) return;
    setPrivacyLoading(true);
    try {
      const data = await api.adminListRichiestePrivacy(token, {
        stato: filters?.stato,
        tipo: filters?.tipo,
        scadenza_imminente: filters?.scadenza,
      });
      setRichiestePrivacy(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setPrivacyLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const updateSeg = async (id: string, stato: string) => {
    try {
      await api.updateAdminSeg(token!, id, { stato });
      setSegnalazioni(p => p.map(s => s.id === id ? { ...s, stato } : s));
      setModalSeg(null);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const updateApp = async (id: string, stato: string) => {
    try {
      await api.updateAdminApp(token!, id, { stato });
      setAppuntamenti(p => p.map(a => a.id === id ? { ...a, stato } : a));
      setModalApp(null);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const createCond = async () => {
    if (!newCond.nome.trim() || !newCond.indirizzo.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo sono obbligatori'); return; }
    try {
      const c = await api.createCondominio(token!, newCond);
      setCondomini(p => [...p, c]);
      setShowNewCond(false);
      const emptyForm = { tipo: 'Condominio', nome: '', indirizzo: '', cap: '', citta: '', provincia: '', codice_fiscale: '', data_apertura_esercizio: '', data_costruzione: '', data_inizio_incarico: '', data_fine_incarico: '', banca: '', iban: '', swift: '', dati_catastali: '', note: '' };
      setNewCond(emptyForm);
      Alert.alert('Creato', 'Condominio aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const updateCond = async () => {
    if (!editCond || !editCond.nome.trim() || !editCond.indirizzo.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo sono obbligatori'); return; }
    try {
      const updated = await api.updateCondominio(token!, editCond.id, editCond);
      setCondomini(p => p.map(c => c.id === editCond.id ? updated : c));
      setEditCond(null);
      Alert.alert('Salvato', 'Condominio aggiornato');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const handleImportCsv = async () => {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel', 'text/csv', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImportingCsv(true);
    try {
      const file = { uri: asset.uri, name: asset.name || 'import.xls', type: asset.mimeType || 'application/octet-stream' };
      const res = await api.importCondominiFile(token!, file);
      Alert.alert('Import completato', `${res.creati} creati, ${res.aggiornati} aggiornati su ${res.righe_elaborate} righe.`);
      const updated = await api.getCondomini(token!);
      setCondomini(updated);
    } catch (e: any) { Alert.alert('Errore', e.message || 'Errore durante l\'import'); }
    finally { setImportingCsv(false); }
  };

  const deleteCond = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteCondominio(token!, id);
        setCondomini(p => p.filter(c => c.id !== id));
      }},
    ]);
  };

  const createAvviso = async () => {
    if (!newAvviso.titolo.trim() || !newAvviso.testo.trim()) { Alert.alert('Attenzione', 'Inserisci titolo e testo'); return; }
    try {
      const a = await api.createAdminAvviso(token!, { ...newAvviso, condominio_id: newAvviso.condominio_id || null });
      setAvvisi(p => [a, ...p]);
      setShowNewAvviso(false);
      setNewAvviso({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteAvviso = (id: string) => {
    Alert.alert('Elimina', 'Eliminare questo avviso?', [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteAdminAvviso(token!, id); setAvvisi(p => p.filter(a => a.id !== id));
      }},
    ]);
  };

  const associaUtente = async () => {
    if (!assocForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    try {
      await api.associaUtente(token!, { user_id: showAssocModal.id, ...assocForm });
      setShowAssocModal(null);
      setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });
      loadAll();
      Alert.alert('Associato', 'Utente associato al condominio');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const disassociaUtente = (assocId: string, userName: string, condName: string) => {
    Alert.alert('Rimuovi associazione', `Rimuovere ${userName} da "${condName}"?`, [
      { text: 'Annulla' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try { await api.disassociaUtente(token!, assocId); loadAll(); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.getConfig(token!);
      setConfig({
        google_maps_api_key: cfg.google_maps_api_key || '',
        firebase_key: cfg.firebase_key || '',
        studio_telefono: cfg.studio_telefono || '',
        studio_email: cfg.studio_email || '',
        studio_pec: cfg.studio_pec || '',
      });
    } catch {}
  }, [token]);

  useEffect(() => { if (tab === 'config') loadConfig(); }, [tab, loadConfig]);

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      await api.updateConfig(token!, config);
      Alert.alert('Salvato', 'Configurazione aggiornata con successo');
    } catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setConfigLoading(false); }
  };

  const updateTrasmStato = async (id: string, stato: string) => {
    try {
      await api.updateAdminTrasmissione(token!, id, stato);
      setTrasmissioni(p => p.map(t => t.id === id ? { ...t, stato } : t));
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const saveEstrattoConto = async () => {
    if (!ecForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    try {
      await api.upsertEstrattoConto(token!, {
        user_id: showECModal.id,
        condominio_id: ecForm.condominio_id,
        periodo: ecForm.periodo,
        quote_versate: parseFloat(ecForm.quote_versate) || 0,
        quote_da_versare: parseFloat(ecForm.quote_da_versare) || 0,
        scadenza: ecForm.scadenza,
        saldo: parseFloat(ecForm.saldo) || 0,
        note: ecForm.note,
      });
      setShowECModal(null);
      Alert.alert('Salvato', 'Estratto conto aggiornato');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const exportCSV = (type: string) => {
    const url = api.getExportUrl(type);
    Linking.openURL(url).catch(() => Alert.alert('Errore', 'Impossibile aprire il link'));
  };

  // Load segnalazione detail (with file info)
  const loadSegDetail = async (segId: string) => {
    try {
      const detail = await api.getSegnalazioneDetail(token!, segId);
      setModalSeg(detail);
    } catch {
      // fallback to list item without file details
      const item = segnalazioni.find(s => s.id === segId);
      if (item) setModalSeg(item);
    }
  };

  const openFile = (fileUrl: string) => {
    const fullUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}${fileUrl}`;
    Linking.openURL(fullUrl).catch(() => Alert.alert('Errore', 'Impossibile aprire il file'));
  };

  // === Fornitori CRUD ===
  const SETTORI = ['Idraulica', 'Elettricità', 'Edilizia', 'Pulizia', 'Fabbro', 'Ascensori', 'Giardinaggio', 'Imbiancatura', 'Altro'];

  const createFornitoreHandler = async () => {
    if (!newForn.ragione_sociale.trim() || !newForn.email.trim()) { Alert.alert('Attenzione', 'Ragione sociale e email sono obbligatori'); return; }
    try {
      const result = await api.createFornitore(token!, newForn);
      Alert.alert('Fornitore Creato', `Account creato per ${result.ragione_sociale}\n\nEmail: ${result.email}\nPassword temporanea: ${result.password_temp}\n\nComunicare le credenziali al fornitore.`);
      setShowNewForn(false);
      setNewForn({ ragione_sociale: '', partita_iva: '', codice_fiscale: '', settori: [], telefono: '', email: '', indirizzo: '', iban: '', stato: 'Attivo', password: '' });
      loadAll();
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteFornitoreHandler = (id: string, nome: string) => {
    Alert.alert('Elimina Fornitore', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteFornitore(token!, id); loadAll();
      }},
    ]);
  };

  const assegnaFornitoreHandler = async () => {
    if (!assegnaFornForm.fornitore_id) { Alert.alert('Attenzione', 'Seleziona un fornitore'); return; }
    try {
      await api.assegnaFornitore(token!, showAssegnaFornModal.id, assegnaFornForm);
      setShowAssegnaFornModal(null);
      Alert.alert('Assegnato', 'Fornitore assegnato alla segnalazione');
      loadAll();
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const chiudiSegnalazioneHandler = (segId: string) => {
    Alert.alert('Chiudi Segnalazione', 'Confermi la chiusura della segnalazione?', [
      { text: 'Annulla' },
      { text: 'Chiudi', onPress: async () => {
        try { await api.chiudiSegnalazione(token!, segId); loadAll(); setModalSeg(null); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  const riapriSegnalazioneHandler = (segId: string) => {
    Alert.alert('Richiedi nuovo intervento', 'Vuoi richiedere un ulteriore intervento al fornitore?', [
      { text: 'Annulla' },
      { text: 'Richiedi', onPress: async () => {
        try { await api.riapriSegnalazione(token!, segId); loadAll(); setModalSeg(null); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  // ========== SEGNALAZIONE CREATE/EDIT FUNCTIONS ==========

  const resetSegForm = () => {
    setSegForm({ condominio_id: '', tipologia: '', descrizione: '', urgenza: 'Media', note_admin: '' });
    setSegMediaFiles([]);
    setIsEditingSeg(false);
    setEditingSegId(null);
  };

  const openNewSegModal = () => {
    resetSegForm();
    setShowNewSegModal(true);
  };

  const openEditSegModal = (seg: any) => {
    setIsEditingSeg(true);
    setEditingSegId(seg.id);
    setSegForm({
      condominio_id: seg.condominio_id || '',
      tipologia: seg.tipologia || '',
      descrizione: seg.descrizione || '',
      urgenza: seg.urgenza || 'Media',
      note_admin: seg.note_admin || '',
    });
    // Load existing attachments as "already uploaded" files
    if (seg.allegati_dettagli && seg.allegati_dettagli.length > 0) {
      const existingFiles: MediaFile[] = seg.allegati_dettagli.map((f: any) => ({
        uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}`,
        filename: f.filename,
        mimeType: f.content_type,
        size: f.size,
        type: f.content_type?.startsWith('image/') ? 'image' : f.content_type?.startsWith('video/') ? 'video' : 'pdf',
        uploadedId: f.id,
      }));
      setSegMediaFiles(existingFiles);
    } else {
      setSegMediaFiles([]);
    }
    setModalSeg(null);
    setShowNewSegModal(true);
  };

  // Media pickers for segnalazione
  const pickSegImage = async (useCamera: boolean) => {
    if (segMediaFiles.length >= 10) {
      Alert.alert('Limite raggiunto', 'Puoi allegare massimo 10 file');
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permesso negato', 'Concedi i permessi per accedere alla fotocamera/galleria');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false, mediaTypes: ['images', 'videos'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 - segMediaFiles.length, mediaTypes: ['images', 'videos'] });

    if (result.canceled) return;

    const newFiles: MediaFile[] = result.assets.map(asset => ({
      uri: asset.uri,
      filename: asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: asset.fileSize,
      type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    }));

    setSegMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
  };

  const pickSegDocument = async () => {
    if (segMediaFiles.length >= 10) {
      Alert.alert('Limite raggiunto', 'Puoi allegare massimo 10 file');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const newFiles: MediaFile[] = result.assets.map(asset => ({
        uri: asset.uri,
        filename: asset.name || `documento_${Date.now()}.pdf`,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size,
        type: 'pdf' as const,
      }));

      setSegMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
    } catch (e) {
      Alert.alert('Errore', 'Impossibile selezionare il documento');
    }
  };

  const removeSegFile = (index: number) => {
    setSegMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'videocam';
      case 'pdf': return 'document-text';
      default: return 'attach';
    }
  };

  const getFileColor = (type: string): string => {
    switch (type) {
      case 'image': return '#3B82F6';
      case 'video': return '#8B5CF6';
      case 'pdf': return '#EF4444';
      default: return Colors.textMuted;
    }
  };

  const handleSaveSegnalazione = async () => {
    if (!segForm.condominio_id || !segForm.tipologia || !segForm.descrizione.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori (Condominio, Tipologia, Descrizione)');
      return;
    }

    setLoading(true);
    try {
      // Upload new files
      const allegatiIds: string[] = [];
      const filesToUpload = segMediaFiles.filter(f => !f.uploadedId); // only new files
      const existingIds = segMediaFiles.filter(f => f.uploadedId).map(f => f.uploadedId!);
      
      if (filesToUpload.length > 0) {
        setSegUploadProgress(`Caricamento file 0/${filesToUpload.length}...`);
        for (let i = 0; i < filesToUpload.length; i++) {
          setSegUploadProgress(`Caricamento file ${i + 1}/${filesToUpload.length}...`);
          try {
            const uploaded = await api.uploadFile(token!, filesToUpload[i].uri, filesToUpload[i].filename, filesToUpload[i].mimeType);
            allegatiIds.push(uploaded.id);
          } catch (e: any) {
            console.warn(`Failed to upload ${filesToUpload[i].filename}:`, e);
          }
        }
        setSegUploadProgress('');
      }

      const allAllegati = [...existingIds, ...allegatiIds];

      if (isEditingSeg && editingSegId) {
        // Update existing segnalazione
        await api.updateAdminSeg(token!, editingSegId, {
          tipologia: segForm.tipologia,
          descrizione: segForm.descrizione,
          urgenza: segForm.urgenza,
          note_admin: segForm.note_admin,
          allegati: allAllegati,
        });
        Alert.alert('Salvato', 'Segnalazione aggiornata con successo');
      } else {
        // Create new segnalazione
        const result = await api.createAdminSegnalazione(token!, {
          condominio_id: segForm.condominio_id,
          tipologia: segForm.tipologia,
          descrizione: segForm.descrizione,
          urgenza: segForm.urgenza,
          note_admin: segForm.note_admin,
          allegati: allAllegati,
        });
        Alert.alert('Creata', `Segnalazione creata con successo.\nProtocollo: ${result.protocollo}`);
      }

      setShowNewSegModal(false);
      resetSegForm();
      loadAll();
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
      setSegUploadProgress('');
    }
  };

  // ========== SOPRALLUOGHI FUNCTIONS ==========

  const resetSopralluogoForm = () => {
    setSopralluogoForm({ condominio_id: '', data: new Date().toISOString().split('T')[0], ora_inizio: '', motivo: 'Controllo periodico', note_generali: '', collaboratore_id: '' });
  };

  const createSopralluogoHandler = async () => {
    if (!sopralluogoForm.condominio_id) {
      Alert.alert('Attenzione', 'Seleziona un condominio');
      return;
    }
    setLoading(true);
    try {
      const result = await api.createSopralluogo(token!, {
        condominio_id: sopralluogoForm.condominio_id,
        data: sopralluogoForm.data || new Date().toISOString().split('T')[0],
        ora_inizio: sopralluogoForm.ora_inizio || new Date().toTimeString().slice(0, 5),
        motivo: sopralluogoForm.motivo,
        note_generali: sopralluogoForm.note_generali,
        collaboratore_id: sopralluogoForm.collaboratore_id || undefined,
      });
      setShowNewSopralluogo(false);
      resetSopralluogoForm();
      loadAll();
      // Open the sopralluogo detail for editing
      const full = await api.getSopralluogo(token!, result.id);
      setShowSopralluogoDetail(full);
      Alert.alert('Creato', 'Sopralluogo avviato! Compila la checklist.');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSopralluogoDetail = async (id: string) => {
    setLoading(true);
    try {
      const full = await api.getSopralluogo(token!, id);
      setShowSopralluogoDetail(full);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItemHandler = async (sopId: string, itemId: string, stato: string) => {
    // If setting to "anomalia", open the modal FIRST without saving
    if (stato === 'anomalia') {
      // Find the item in the current sopralluogo detail
      const checklist = showSopralluogoDetail?.checklist || [];
      const foundItem = checklist.find((c: any) => c.id === itemId);
      
      if (foundItem) {
        // Reset form
        setAnomaliaForm({ 
          descrizione: '', 
          gravita: 'Moderata', 
          foto_ids: [], 
          apri_segnalazione: false, 
          fornitore_id: '', 
          tipologia_intervento: '', 
          urgenza_segnalazione: '', 
          note_fornitore: '' 
        });
        setAnomaliaPhotos([]);
        setAnomaliaVoiceNotes([]);
        setVoiceRecorderKey(prev => prev + 1);
        
        // IMPORTANT: Close sopralluogo detail modal FIRST, then open anomalia modal
        const sopralluogoData = { ...showSopralluogoDetail };
        setShowSopralluogoDetail(null); // Close detail modal
        
        // Use setTimeout to ensure state update is processed
        setTimeout(() => {
          setShowAnomaliaModal({ 
            sopralluogo: sopralluogoData, 
            item: foundItem, 
            isNew: true 
          });
        }, 100);
      }
      return;
    }
    
    // For "ok" and "non_controllato", save immediately
    try {
      await api.updateChecklistItem(token!, sopId, itemId, stato);
      // Refresh detail
      const full = await api.getSopralluogo(token!, sopId);
      setShowSopralluogoDetail(full);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    }
  };

  const saveAnomaliaHandler = async () => {
    if (!anomaliaForm.descrizione.trim()) {
      Alert.alert('Attenzione', 'Inserisci una descrizione');
      return;
    }
    if (anomaliaForm.apri_segnalazione && !anomaliaForm.fornitore_id) {
      Alert.alert('Attenzione', 'Seleziona un fornitore per aprire la segnalazione');
      return;
    }

    setLoading(true);
    try {
      const sopId = showAnomaliaModal.sopralluogo.id;
      const itemId = showAnomaliaModal.item.id;
      
      // First verify sopralluogo is still in_corso
      const currentSop = await api.getSopralluogo(token!, sopId);
      if (currentSop.stato !== 'in_corso') {
        Alert.alert('Attenzione', 'Il sopralluogo è stato completato. Non è più possibile modificare le anomalie.');
        setShowAnomaliaModal(null);
        return;
      }

      // Upload photos first
      const fotoIds: string[] = [];
      for (const photo of anomaliaPhotos) {
        if (!photo.uploadedId) {
          const uploaded = await api.uploadFile(token!, photo.uri, photo.filename, photo.mimeType);
          fotoIds.push(uploaded.id);
        } else {
          fotoIds.push(photo.uploadedId);
        }
      }

      // Upload all voice notes
      const voiceNoteIds: string[] = [];
      for (const vn of anomaliaVoiceNotes) {
        if (!vn.uploadedId) {
          const uploaded = await api.uploadFile(token!, vn.uri, vn.filename, 'audio/x-m4a');
          voiceNoteIds.push(uploaded.id);
        } else {
          voiceNoteIds.push(vn.uploadedId);
        }
      }

      // If this is a NEW anomaly, first update the checklist item state
      if (showAnomaliaModal.isNew) {
        await api.updateChecklistItem(token!, sopId, itemId, 'anomalia');
      }

      // Now create/update the anomalia with all data
      await api.createAnomalia(token!, sopId, itemId, {
        descrizione: anomaliaForm.descrizione,
        gravita: anomaliaForm.gravita,
        foto_ids: fotoIds,
        nota_vocale_ids: voiceNoteIds,
        apri_segnalazione: anomaliaForm.apri_segnalazione,
        fornitore_id: anomaliaForm.fornitore_id || undefined,
        tipologia_intervento: anomaliaForm.tipologia_intervento || undefined,
        urgenza_segnalazione: anomaliaForm.urgenza_segnalazione || undefined,
        note_fornitore: anomaliaForm.note_fornitore || undefined,
      });

      // Close anomalia modal
      setShowAnomaliaModal(null);
      setAnomaliaVoiceNotes([]);
      
      // Refresh and reopen sopralluogo detail
      const full = await api.getSopralluogo(token!, sopId);
      setShowSopralluogoDetail(full);
      
      if (anomaliaForm.apri_segnalazione) {
        Alert.alert('Salvato', 'Anomalia salvata e segnalazione creata con fornitore assegnato!');
      } else {
        Alert.alert('Salvato', 'Anomalia salvata');
      }
      loadAll();
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Close anomalia modal and reopen sopralluogo
  const closeAnomaliaModal = async () => {
    const sopId = showAnomaliaModal?.sopralluogo?.id;
    setShowAnomaliaModal(null);
    setAnomaliaVoiceNotes([]);
    // Stop any playing voice note
    if (voiceNoteSound) {
      await voiceNoteSound.unloadAsync();
      setVoiceNoteSound(null);
    }
    setPlayingVoiceNoteIndex(null);
    
    if (sopId) {
      try {
        const full = await api.getSopralluogo(token!, sopId);
        setShowSopralluogoDetail(full);
      } catch (e) {
        // If error, just reload all
        loadAll();
      }
    }
  };

  // Play/stop voice note
  const playVoiceNote = async (uri: string, index: number) => {
    try {
      // If same note is playing, stop it
      if (playingVoiceNoteIndex === index && voiceNoteSound) {
        await voiceNoteSound.stopAsync();
        await voiceNoteSound.unloadAsync();
        setVoiceNoteSound(null);
        setPlayingVoiceNoteIndex(null);
        return;
      }
      
      // Stop any currently playing sound
      if (voiceNoteSound) {
        await voiceNoteSound.stopAsync();
        await voiceNoteSound.unloadAsync();
      }
      
      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status: any) => {
          if (status.didJustFinish) {
            setPlayingVoiceNoteIndex(null);
            setVoiceNoteSound(null);
          }
        }
      );
      setVoiceNoteSound(sound);
      setPlayingVoiceNoteIndex(index);
    } catch (e) {
      console.error('Error playing voice note:', e);
      Alert.alert('Errore', 'Impossibile riprodurre la nota vocale');
    }
  };

  const closeSopralluogoHandler = async (sopId: string, valutazione: string, note: string) => {
    // Confirmation dialog to prevent accidental closes
    Alert.alert(
      'Completare Sopralluogo?',
      'Una volta completato non potrai più modificare la checklist o aggiungere anomalie. Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Completa', style: 'default', onPress: async () => {
          setLoading(true);
          try {
            await api.closeSopralluogo(token!, sopId, { 
              valutazione, 
              note_finali: note,
              ora_fine: new Date().toTimeString().slice(0, 5)
            });
            setShowSopralluogoDetail(null);
            loadAll();
            Alert.alert('Completato', 'Sopralluogo chiuso con successo');
          } catch (e: any) {
            Alert.alert('Errore', e.message);
          } finally {
            setLoading(false);
          }
        }},
      ]
    );
  };

  const deleteSopralluogoHandler = (sopId: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare il sopralluogo di "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteSopralluogo(token!, sopId);
          setShowSopralluogoDetail(null);
          loadAll();
        } catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  // Pick photo for anomalia
  const pickAnomaliaPhoto = async () => {
    if (anomaliaPhotos.length >= 5) {
      Alert.alert('Limite raggiunto', 'Puoi allegare massimo 5 foto per anomalia');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permesso negato', 'Concedi i permessi per la fotocamera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    
    const asset = result.assets[0];
    setAnomaliaPhotos(prev => [...prev, {
      uri: asset.uri,
      filename: asset.fileName || `anomalia_${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
      type: 'image',
    }]);
  };

  const removeAnomaliaPhoto = (index: number) => {
    setAnomaliaPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ========== COLLABORATORI FUNCTIONS ==========

  const createCollaboratoreHandler = async () => {
    if (!collabForm.nome.trim() || !collabForm.cognome.trim() || !collabForm.email.trim() || !collabForm.password.trim()) {
      Alert.alert('Attenzione', 'Compila nome, cognome, email e password');
      return;
    }
    setLoading(true);
    try {
      await api.createCollaboratore(token!, collabForm);
      setShowNewCollaboratore(false);
      setCollabForm({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' });
      loadAll();
      Alert.alert('Creato', 'Collaboratore aggiunto');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCollaboratoreHandler = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteCollaboratore(token!, id);
          loadAll();
        } catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  // Get semaforo color
  const getSemaforoColor = (stato: string) => {
    switch (stato) {
      case 'ok': return '#22C55E';
      case 'anomalia': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  const getSemaforoIcon = (stato: string) => {
    switch (stato) {
      case 'ok': return 'checkmark-circle';
      case 'anomalia': return 'alert-circle';
      default: return 'ellipse-outline';
    }
  };

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire?', [
      { text: 'Annulla' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity testID="admin-home-btn" onPress={() => setTab('dashboard')} style={s.topBarBtn}>
          <Ionicons name="home-outline" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Pannello Admin</Text>
        <TouchableOpacity testID="admin-logout-btn" onPress={handleLogout} style={s.topBarBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Tab Bar */}
      <View style={s.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarScroll}>
          {TABS.map(t => {
            const active = tab === t.key;
            const showBadge = t.key === 'privacy' && privacyScadenzaCount > 0;
            return (
              <TouchableOpacity
                key={t.key}
                testID={`admin-tab-${t.key}`}
                style={[s.tabPill, active && s.tabPillActive]}
                onPress={() => {
                  setTab(t.key);
                  if (t.key === 'privacy') loadPrivacyRichieste(privacyFilter);
                }}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons name={(active ? t.icon.replace('-outline', '') : t.icon) as any} size={16} color={active ? Colors.white : Colors.textSec} />
                  {showBadge && (
                    <View style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' }} />
                  )}
                </View>
                <Text style={[s.tabPillLabel, active && s.tabPillLabelActive]}>{t.label}</Text>
                {showBadge && (
                  <View style={{ backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 }}>
                    <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700' }}>{privacyScadenzaCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {/* ====== DASHBOARD ====== */}
        {tab === 'dashboard' && (
          <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} />}>
            <Text style={s.secTitle}>Riepilogo</Text>
            <View style={s.statsGrid}>
              {STAT_ITEMS.map((st) => (
                <TouchableOpacity
                  key={st.key}
                  testID={`stat-${st.key}`}
                  style={s.statCard}
                  onPress={() => setTab(st.tab)}
                  activeOpacity={0.7}
                >
                  <View style={s.statCardInner}>
                    <View style={[s.statIcon, { backgroundColor: st.color + '15' }]}>
                      <Ionicons name={st.icon as any} size={24} color={st.color} />
                    </View>
                    <Text style={s.statVal}>{stats?.[st.field] ?? 0}</Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick actions */}
            <Text style={[s.secTitle, { marginTop: 24 }]}>Azioni rapide</Text>
            <View style={s.quickGrid}>
              {[
                { label: 'Nuovo Condominio', icon: 'add-circle', color: '#10B981', action: () => { setTab('condomini'); setTimeout(() => setShowNewCond(true), 300); } },
                { label: 'Pubblica Avviso', icon: 'megaphone', color: '#0D9488', action: () => { setTab('avvisi'); setTimeout(() => setShowNewAvviso(true), 300); } },
                { label: 'Esporta Dati', icon: 'download', color: '#3B82F6', action: () => setTab('config') },
                { label: 'Impostazioni', icon: 'settings', color: '#8B5CF6', action: () => setTab('config') },
              ].map((qa, i) => (
                <TouchableOpacity key={i} testID={`quick-${i}`} style={s.quickAction} onPress={qa.action} activeOpacity={0.7}>
                  <View style={[s.quickActionIcon, { backgroundColor: qa.color + '15' }]}>
                    <Ionicons name={qa.icon as any} size={22} color={qa.color} />
                  </View>
                  <Text style={s.quickActionLabel}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ====== CONDOMINI ====== */}
        {tab === 'condomini' && (
          <View style={{ flex: 1 }}>
            {/* Action buttons row */}
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
              <TouchableOpacity testID="admin-new-cond-btn" style={[s.addBtn, { flex: 1, marginTop: 0 }]} onPress={() => setShowNewCond(true)}>
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={s.addBtnText}>Nuovo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.addBtn, { flex: 1, marginTop: 0, backgroundColor: importingCsv ? Colors.textMuted : '#7C3AED' }]}
                onPress={handleImportCsv}
                disabled={importingCsv}
              >
                {importingCsv
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
                }
                <Text style={s.addBtnText}>{importingCsv ? 'Import...' : 'Importa XLS/CSV'}</Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginVertical: 8, paddingHorizontal: 12, height: 44 }}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: Colors.textMain }}
                placeholder="Cerca per nome, indirizzo, città, CF…"
                placeholderTextColor={Colors.textMuted}
                value={condSearch}
                onChangeText={setCondSearch}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {condSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCondSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Count badge */}
            {condSearch.length > 0 && (() => {
              const q = condSearch.toLowerCase();
              const filtered = condomini.filter(c =>
                c.nome?.toLowerCase().includes(q) ||
                c.indirizzo?.toLowerCase().includes(q) ||
                c.citta?.toLowerCase().includes(q) ||
                c.cap?.includes(q) ||
                c.codice_fiscale?.toLowerCase().includes(q) ||
                c.iban?.toLowerCase().includes(q) ||
                c.dati_catastali?.toLowerCase().includes(q)
              );
              return (
                <Text style={{ fontSize: 12, color: Colors.textSec, marginHorizontal: 20, marginBottom: 4 }}>
                  {filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'} per "{condSearch}"
                </Text>
              );
            })()}

            <FlatList
              data={(() => {
                if (!condSearch.trim()) return condomini;
                const q = condSearch.toLowerCase();
                return condomini.filter(c =>
                  c.nome?.toLowerCase().includes(q) ||
                  c.indirizzo?.toLowerCase().includes(q) ||
                  c.citta?.toLowerCase().includes(q) ||
                  c.cap?.includes(q) ||
                  c.codice_fiscale?.toLowerCase().includes(q) ||
                  c.iban?.toLowerCase().includes(q) ||
                  c.dati_catastali?.toLowerCase().includes(q)
                );
              })()}
              keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  {condSearch.length > 0
                    ? <>
                        <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                        <Text style={[s.emptyText, { marginTop: 10 }]}>Nessun condominio trovato per "{condSearch}"</Text>
                      </>
                    : <Text style={s.emptyText}>Nessun condominio. Usa "Importa XLS/CSV" per caricare i dati dal gestionale.</Text>
                  }
                </View>
              }
              renderItem={({ item }) => (
                <View testID={`admin-cond-${item.id}`} style={s.listCard}>
                  {/* Header row */}
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="business" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.listTitle}>{item.nome}</Text>
                        {item.tipo && item.tipo !== 'Condominio' && (
                          <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '600' }}>{item.tipo}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.listSub2}>
                        {[item.indirizzo, item.cap, item.citta, item.provincia].filter(Boolean).join(' – ')}
                      </Text>
                      {item.codice_fiscale ? <Text style={s.listMeta}>CF: {item.codice_fiscale}</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setEditCond({ ...item })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="create-outline" size={20} color={Colors.sky} />
                      </TouchableOpacity>
                      <TouchableOpacity testID={`admin-del-cond-${item.id}`} onPress={() => deleteCond(item.id, item.nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Extra fields grid - only if any populated */}
                  {(item.iban || item.banca || item.data_inizio_incarico || item.dati_catastali) && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
                      {item.banca || item.iban ? (
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {item.banca ? (
                            <View style={cs2.pill}>
                              <Ionicons name="card-outline" size={12} color={Colors.textSec} />
                              <Text style={cs2.pillText}>{item.banca}</Text>
                            </View>
                          ) : null}
                          {item.iban ? (
                            <View style={cs2.pill}>
                              <Text style={cs2.pillText}>{item.iban}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      {item.data_inizio_incarico || item.data_apertura_esercizio ? (
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
                          {item.data_inizio_incarico ? <Text style={cs2.metaText}>Incarico dal {item.data_inizio_incarico}{item.data_fine_incarico ? ` al ${item.data_fine_incarico}` : ''}</Text> : null}
                          {item.data_apertura_esercizio ? <Text style={cs2.metaText}>Esercizio: {item.data_apertura_esercizio}</Text> : null}
                        </View>
                      ) : null}
                      {item.dati_catastali ? <Text style={[cs2.metaText, { marginTop: 2 }]}>Catasto: {item.dati_catastali}</Text> : null}
                    </View>
                  )}
                </View>
              )} />
          </View>
        )}

        {/* ====== UTENTI ====== */}
        {/* ====== UTENTI ====== */}
        {tab === 'utenti' && (
          <View style={{ flex: 1 }}>
            {/* Header with filter and new collaboratore button */}
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <PickerSelect
                  label=""
                  value={utentiFilterCondo ? condomini.find(c => c.id === utentiFilterCondo)?.nome || '' : 'Tutti i condomini'}
                  options={['Tutti i condomini', ...condomini.map(c => c.nome)]}
                  onSelect={v => {
                    if (v === 'Tutti i condomini') {
                      setUtentiFilterCondo('');
                    } else {
                      const condo = condomini.find(c => c.nome === v);
                      setUtentiFilterCondo(condo?.id || '');
                    }
                  }}
                  testID="utenti-filter-condo"
                />
              </View>
              <TouchableOpacity 
                testID="admin-new-collab-btn-utenti" 
                style={[s.addBtn, { backgroundColor: '#6366F1', paddingHorizontal: 14, marginTop: 0 }]} 
                onPress={() => setShowNewCollaboratore(true)}
              >
                <Ionicons name="person-add" size={20} color={Colors.white} />
                <Text style={[s.addBtnText, { fontSize: 12 }]}>Collaboratore</Text>
              </TouchableOpacity>
            </View>

            {/* Collaboratori section */}
            {collaboratori.length > 0 && (
              <View style={{ marginHorizontal: 16, marginTop: 12 }}>
                <Text style={s.secTitle}>Collaboratori Studio ({collaboratori.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {collaboratori.map(c => (
                    <View key={c.id} style={{ backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginRight: 10, minWidth: 150, borderWidth: 1, borderColor: Colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="person" size={18} color="#6366F1" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textMain }}>{c.nome} {c.cognome}</Text>
                          <Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.qualifica || 'Collaboratore'}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="search-outline" size={12} color={Colors.textMuted} />
                          <Text style={{ fontSize: 10, color: Colors.textMuted }}>{c.sopralluoghi_count || 0} sopralluoghi</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteCollaboratoreHandler(c.id, `${c.nome} ${c.cognome}`)}>
                          <Ionicons name="trash-outline" size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[s.secTitle, { marginLeft: 16, marginTop: 8 }]}>
              Utenti Condomini {utentiFilterCondo ? `(${condomini.find(c => c.id === utentiFilterCondo)?.nome})` : ''}
            </Text>
            
            <FlatList 
              data={utentiFilterCondo 
                ? utenti.filter(u => u.associazioni?.some((a: any) => a.condominio_id === utentiFilterCondo))
                : utenti
              } 
              keyExtractor={i => i.id} 
              contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>{utentiFilterCondo ? 'Nessun utente in questo condominio' : 'Nessun utente registrato'}</Text>}
              renderItem={({ item }) => (
                <View testID={`admin-user-${item.id}`} style={s.listCard}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: item.abilitato ? '#DCFCE7' : '#FEF3C7' }]}>
                      <Ionicons name="person" size={18} color={item.abilitato ? '#16A34A' : '#D97706'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.nome} {item.cognome}</Text>
                      <Text style={s.listSub2}>{item.email}</Text>
                      {item.telefono ? <Text style={s.listMeta}>Tel: {item.telefono}</Text> : null}
                    </View>
                    <View style={[s.statusDot, { backgroundColor: item.abilitato ? '#10B981' : '#F59E0B' }]} />
                  </View>
                  {item.associazioni && item.associazioni.length > 0 && (
                    <View style={s.assocSection}>
                      <Text style={s.assocTitle}>Condomini associati:</Text>
                      {item.associazioni.map((a: any) => (
                        <View key={a.assoc_id} style={s.assocRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.assocName}>{a.condominio_nome}</Text>
                            <Text style={s.assocInfo}>{a.unita_immobiliare} {a.qualita ? `• ${a.qualita}` : ''}</Text>
                          </View>
                          <TouchableOpacity testID={`disassocia-${a.assoc_id}`} onPress={() => disassociaUtente(a.assoc_id, `${item.nome} ${item.cognome}`, a.condominio_nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={22} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  {!item.abilitato && (
                    <View style={s.notAbilitato}>
                      <Ionicons name="time-outline" size={14} color="#D97706" />
                      <Text style={s.notAbilitatoText}>In attesa di abilitazione</Text>
                    </View>
                  )}
                  <TouchableOpacity testID={`associa-btn-${item.id}`} style={s.assocBtn} onPress={() => { setShowAssocModal(item); setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' }); }}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.sky} />
                    <Text style={s.assocBtnText}>Associa a condominio</Text>
                  </TouchableOpacity>
                </View>
              )} 
            />
          </View>
        )}

        {/* ====== SEGNALAZIONI ====== */}
        {tab === 'segnalazioni' && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity testID="admin-new-seg-btn" style={[s.addBtn, { backgroundColor: '#D97706' }]} onPress={openNewSegModal}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuova Segnalazione</Text>
            </TouchableOpacity>
            <FlatList data={segnalazioni} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessuna segnalazione</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity testID={`admin-seg-${item.id}`} style={s.listCard} onPress={() => loadSegDetail(item.id)}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="warning" size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.tipologia}</Text>
                      <Text style={s.listSub2}>{item.user_nome} • {item.condominio_nome}</Text>
                      <Text style={s.listMeta}>
                        {new Date(item.created_at).toLocaleDateString('it-IT')} • Urgenza: {item.urgenza}
                        {(item.allegati?.length > 0) ? ` • ${item.allegati.length} allegati` : ''}
                      </Text>
                    </View>
                    <StatusBadge status={item.stato} />
                  </View>
                </TouchableOpacity>
              )} />
          </View>
        )}

        {/* ====== APPUNTAMENTI ====== */}
        {tab === 'appuntamenti' && (
          <FlatList data={appuntamenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun appuntamento</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`admin-app-${item.id}`} style={s.listCard} onPress={() => setModalApp(item)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: '#FCE7F3' }]}>
                    <Ionicons name="calendar" size={18} color="#EC4899" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.motivo}</Text>
                    <Text style={s.listSub2}>{item.user_nome} • {new Date(item.data_richiesta).toLocaleDateString('it-IT')}</Text>
                    <Text style={s.listMeta}>{item.fascia_oraria}</Text>
                  </View>
                  <StatusBadge status={item.stato} />
                </View>
              </TouchableOpacity>
            )} />
        )}

        {/* ====== AVVISI ====== */}
        {tab === 'avvisi' && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity testID="admin-new-avviso-btn" style={s.addBtn} onPress={() => setShowNewAvviso(true)}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuovo Avviso</Text>
            </TouchableOpacity>
            <FlatList data={avvisi} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun avviso</Text>}
              renderItem={({ item }) => (
                <View style={s.listCard}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#CCFBF1' }]}>
                      <Ionicons name="megaphone" size={18} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.titolo}</Text>
                      <Text style={s.listSub2} numberOfLines={2}>{item.testo}</Text>
                      <Text style={s.listMeta}>{item.categoria} • {new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
                    </View>
                    <TouchableOpacity testID={`admin-del-avviso-${item.id}`} onPress={() => deleteAvviso(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )} />
          </View>
        )}

        {/* ====== TRASMISSIONI ====== */}
        {tab === 'trasmissioni' && (
          <FlatList data={trasmissioni} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessuna trasmissione ricevuta</Text>}
            renderItem={({ item }) => (
              <View style={s.listCard}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="documents" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.oggetto}</Text>
                    <Text style={s.listSub2}>{item.user_nome}</Text>
                    <Text style={s.listMeta}>{new Date(item.created_at).toLocaleDateString('it-IT')} • File: {item.files?.length || 0}</Text>
                    {item.note ? <Text style={[s.listMeta, { marginTop: 2, fontStyle: 'italic' }]}>Note: {item.note}</Text> : null}
                  </View>
                  <StatusBadge status={item.stato} />
                </View>
                {item.stato === 'Inviato' && (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.miniBtn, { backgroundColor: '#DCFCE7' }]} onPress={() => updateTrasmStato(item.id, 'Ricevuto')}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                      <Text style={[s.miniBtnText, { color: '#16A34A' }]}>Ricevuto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.miniBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => updateTrasmStato(item.id, 'Visionato')}>
                      <Ionicons name="eye-outline" size={16} color="#4F46E5" />
                      <Text style={[s.miniBtnText, { color: '#4F46E5' }]}>Visionato</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )} />
        )}

        {/* ====== FORNITORI ====== */}
        {tab === 'fornitori' && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity testID="admin-new-forn-btn" style={[s.addBtn, { backgroundColor: '#EA580C' }]} onPress={() => setShowNewForn(true)}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuovo Fornitore</Text>
            </TouchableOpacity>
            <FlatList data={fornitori} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun fornitore registrato</Text>}
              renderItem={({ item }) => (
                <View testID={`admin-forn-${item.id}`} style={s.listCard}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                      <Ionicons name="construct" size={18} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.ragione_sociale}</Text>
                      <Text style={s.listSub2}>{item.email} • {item.telefono || 'N/A'}</Text>
                      {item.settori?.length > 0 && <Text style={s.listMeta}>{item.settori.join(', ')}</Text>}
                      <Text style={s.listMeta}>Interventi: {item.interventi_count || 0} • {item.stato}</Text>
                    </View>
                    <TouchableOpacity testID={`del-forn-${item.id}`} onPress={() => deleteFornitoreHandler(item.id, item.ragione_sociale)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )} />
          </View>
        )}

        {/* ====== SOPRALLUOGHI ====== */}
        {tab === 'sopralluoghi' && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
              <TouchableOpacity testID="admin-new-sop-btn" style={[s.addBtn, { flex: 1, backgroundColor: '#7C3AED' }]} onPress={() => { resetSopralluogoForm(); setShowNewSopralluogo(true); }}>
                <Ionicons name="add" size={22} color={Colors.white} />
                <Text style={s.addBtnText}>Nuovo Sopralluogo</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="admin-new-collab-btn" style={[s.addBtn, { backgroundColor: '#6366F1', paddingHorizontal: 12 }]} onPress={() => setShowNewCollaboratore(true)}>
                <Ionicons name="person-add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            {/* Collaboratori section */}
            {collaboratori.length > 0 && (
              <View style={{ marginHorizontal: 16, marginTop: 12 }}>
                <Text style={s.secTitle}>Collaboratori ({collaboratori.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {collaboratori.map(c => (
                    <View key={c.id} style={{ backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginRight: 10, minWidth: 140, borderWidth: 1, borderColor: Colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textMain }}>{c.nome} {c.cognome}</Text>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.qualifica || 'Collaboratore'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                        <Ionicons name="search-outline" size={12} color={Colors.textMuted} />
                        <Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.sopralluoghi_count || 0} sopralluoghi</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteCollaboratoreHandler(c.id, `${c.nome} ${c.cognome}`)} style={{ position: 'absolute', top: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[s.secTitle, { marginLeft: 16, marginTop: 8 }]}>Sopralluoghi</Text>
            <FlatList data={sopralluoghi} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun sopralluogo registrato</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity testID={`admin-sop-${item.id}`} style={s.listCard} onPress={() => loadSopralluogoDetail(item.id)}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                      <Ionicons name="search" size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.condominio_nome}</Text>
                      <Text style={s.listSub2}>{item.eseguito_da} • {new Date(item.data).toLocaleDateString('it-IT')}</Text>
                      <Text style={s.listMeta}>{item.motivo}</Text>
                      {/* Semaforo summary */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                          <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>{item.checklist_ok || 0}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                          <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>{item.checklist_anomalie || 0}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="ellipse-outline" size={14} color="#9CA3AF" />
                          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{item.checklist_non_controllato || 0}</Text>
                        </View>
                        {item.segnalazioni_create > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="warning" size={14} color="#DC2626" />
                            <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>{item.segnalazioni_create} seg.</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[s.badge, { backgroundColor: item.stato === 'completato' ? '#DCFCE7' : '#FEF3C7' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: item.stato === 'completato' ? '#16A34A' : '#D97706' }}>
                          {item.stato === 'completato' ? 'COMPLETATO' : 'IN CORSO'}
                        </Text>
                      </View>
                      {item.valutazione && (
                        <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 4 }}>{item.valutazione}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )} />
          </View>
        )}

        {/* ====== CONFIG ====== */}
        {tab === 'config' && (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <Text style={s.secTitle}>Impostazioni</Text>
            <View style={s.configSection}>
              <View style={s.configSectionHeader}>
                <Ionicons name="business-outline" size={20} color={Colors.navy} />
                <Text style={s.configSectionTitle}>Informazioni Studio</Text>
              </View>
              <ConfigField testID="config-telefono" label="Telefono" value={config.studio_telefono} placeholder="+39 089 123456"
                onChange={v => setConfig(p => ({ ...p, studio_telefono: v }))} />
              <ConfigField testID="config-email" label="Email" value={config.studio_email} placeholder="info@studio.it"
                onChange={v => setConfig(p => ({ ...p, studio_email: v }))} keyboardType="email-address" />
              <ConfigField testID="config-pec" label="PEC" value={config.studio_pec} placeholder="studio@pec.it"
                onChange={v => setConfig(p => ({ ...p, studio_pec: v }))} keyboardType="email-address" />
            </View>
            <View style={s.configSection}>
              <View style={s.configSectionHeader}>
                <Ionicons name="key-outline" size={20} color={Colors.navy} />
                <Text style={s.configSectionTitle}>Chiavi API</Text>
              </View>
              <ConfigField testID="config-gmaps" label="Google Maps API Key" value={config.google_maps_api_key} placeholder="Inserisci la chiave API"
                onChange={v => setConfig(p => ({ ...p, google_maps_api_key: v }))} />
              <ConfigField testID="config-firebase" label="Firebase Key" value={config.firebase_key} placeholder="Inserisci la chiave Firebase"
                onChange={v => setConfig(p => ({ ...p, firebase_key: v }))} />
            </View>
            <PrimaryButton title="Salva Configurazione" onPress={saveConfig} loading={configLoading} testID="config-save-btn" style={{ marginBottom: 20 }} />

            <View style={s.configSection}>
              <View style={s.configSectionHeader}>
                <Ionicons name="download-outline" size={20} color={Colors.navy} />
                <Text style={s.configSectionTitle}>Esporta Dati (CSV)</Text>
              </View>
              {[
                { type: 'segnalazioni', label: 'Esporta Segnalazioni', icon: 'warning-outline' },
                { type: 'appuntamenti', label: 'Esporta Appuntamenti', icon: 'calendar-outline' },
                { type: 'utenti', label: 'Esporta Utenti', icon: 'people-outline' },
              ].map((exp) => (
                <TouchableOpacity key={exp.type} testID={`export-${exp.type}`} style={s.exportBtn} onPress={() => exportCSV(exp.type)}>
                  <Ionicons name={exp.icon as any} size={18} color={Colors.sky} />
                  <Text style={s.exportBtnText}>{exp.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.configSection}>
              <View style={s.configSectionHeader}>
                <Ionicons name="cash-outline" size={20} color={Colors.navy} />
                <Text style={s.configSectionTitle}>Gestione Estratti Conto</Text>
              </View>
              <Text style={s.configHint}>Seleziona un utente per inserire o aggiornare l'estratto conto.</Text>
              {utenti.filter(u => u.abilitato).map(u => (
                <TouchableOpacity key={u.id} testID={`ec-user-${u.id}`} style={s.ecUserBtn} onPress={() => {
                  setShowECModal(u);
                  const cond = u.associazioni?.[0];
                  setEcForm({ condominio_id: cond?.condominio_id || '', periodo: '', quote_versate: '', quote_da_versare: '', scadenza: '', saldo: '', note: '' });
                }}>
                  <View style={[s.iconCircle, { backgroundColor: '#E0F2FE', marginRight: 10 }]}>
                    <Ionicons name="person" size={16} color={Colors.sky} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ecUserName}>{u.nome} {u.cognome}</Text>
                    <Text style={s.ecUserCond}>{u.condomini_nomi?.join(', ') || 'N/A'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              {utenti.filter(u => u.abilitato).length === 0 && (
                <Text style={s.emptyText}>Nessun utente abilitato</Text>
              )}
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {tab === 'privacy' && (
          <PrivacyAdminTab
            token={token!}
            richieste={richiestePrivacy}
            loading={privacyLoading}
            scadenzaCount={privacyScadenzaCount}
            filter={privacyFilter}
            onFilterChange={(f) => {
              setPrivacyFilter(f);
              loadPrivacyRichieste(f);
            }}
            onLoad={() => loadPrivacyRichieste(privacyFilter)}
            onDetail={(r: any) => {
              setShowPrivacyDetail(r);
              setEvadiForm({ azione: 'evasa', motivazione_rifiuto: '', note_admin: '' });
            }}
          />
        )}
      </View>

      {/* ── Privacy Detail Modal ── */}
      <Modal visible={!!showPrivacyDetail} transparent animationType="slide" onRequestClose={() => setShowPrivacyDetail(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={[s.modal, { maxHeight: '90%' }]} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.modalTitle}>Richiesta Privacy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyDetail(null)}>
                <Ionicons name="close" size={24} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            {showPrivacyDetail && <>
              <View style={{ backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                {[
                  { label: 'Protocollo', val: showPrivacyDetail.protocollo },
                  { label: 'Utente', val: showPrivacyDetail.user_nome || showPrivacyDetail.user_email || '—' },
                  { label: 'Tipo', val: PRIV_TIPO_LABELS[showPrivacyDetail.tipo] || showPrivacyDetail.tipo },
                  { label: 'Stato', val: showPrivacyDetail.stato },
                  { label: 'Ricevuta il', val: showPrivacyDetail.created_at ? new Date(showPrivacyDetail.created_at).toLocaleDateString('it-IT') : '—' },
                  { label: 'Scadenza', val: showPrivacyDetail.scadenza ? new Date(showPrivacyDetail.scadenza).toLocaleDateString('it-IT') : '—' },
                  ...(showPrivacyDetail.giorni_rimanenti !== null && showPrivacyDetail.giorni_rimanenti !== undefined ? [{ label: 'Giorni rimasti', val: `${showPrivacyDetail.giorni_rimanenti}` }] : []),
                  ...(showPrivacyDetail.evasa_il ? [{ label: 'Evasa il', val: new Date(showPrivacyDetail.evasa_il).toLocaleDateString('it-IT') }] : []),
                  ...(showPrivacyDetail.motivazione_rifiuto ? [{ label: 'Motivazione rifiuto', val: showPrivacyDetail.motivazione_rifiuto }] : []),
                ].map(({ label, val }) => (
                  <View key={label} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                    <Text style={{ fontSize: 13, color: Colors.textSec, width: 130 }}>{label}</Text>
                    <Text style={{ fontSize: 13, color: Colors.textMain, fontWeight: '500', flex: 1 }}>{val}</Text>
                  </View>
                ))}
              </View>

              {(showPrivacyDetail.stato === 'ricevuta' || showPrivacyDetail.stato === 'in_lavorazione') && <>
                <Text style={s.modalLabel}>Azione:</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {(['evasa', 'rifiutata'] as const).map(az => (
                    <TouchableOpacity
                      key={az}
                      style={[{ flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
                        evadiForm.azione === az
                          ? { backgroundColor: az === 'evasa' ? '#DCFCE7' : '#FEE2E2', borderColor: az === 'evasa' ? '#16A34A' : '#DC2626' }
                          : { backgroundColor: Colors.bg, borderColor: Colors.border }]}
                      onPress={() => setEvadiForm(p => ({ ...p, azione: az }))}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: az === 'evasa' ? '#15803D' : '#DC2626' }}>
                        {az === 'evasa' ? '✓ Evadi' : '✗ Rifiuta'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {evadiForm.azione === 'rifiutata' && (
                  <>
                    <Text style={s.modalLabel}>Motivazione rifiuto *</Text>
                    <TextInput
                      style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                      multiline
                      value={evadiForm.motivazione_rifiuto}
                      onChangeText={v => setEvadiForm(p => ({ ...p, motivazione_rifiuto: v }))}
                      placeholder="Inserisci la motivazione del rifiuto..."
                      placeholderTextColor={Colors.textMuted}
                    />
                  </>
                )}

                <Text style={s.modalLabel}>Note interne (facoltative)</Text>
                <TextInput
                  style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                  multiline
                  value={evadiForm.note_admin}
                  onChangeText={v => setEvadiForm(p => ({ ...p, note_admin: v }))}
                  placeholder="Note di servizio..."
                  placeholderTextColor={Colors.textMuted}
                />

                {showPrivacyDetail.tipo === 'cancellazione' && evadiForm.azione === 'evasa' && (
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#D97706' }}>
                    <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>⚠️ Attenzione</Text>
                    <Text style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>
                      Questa azione anonimizzerà permanentemente l'account dell'utente. L'operazione non è reversibile.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.submitBtn, evadiLoading && { opacity: 0.7 }]}
                  onPress={async () => {
                    if (evadiForm.azione === 'rifiutata' && !evadiForm.motivazione_rifiuto.trim()) {
                      Alert.alert('Attenzione', 'Inserisci la motivazione del rifiuto');
                      return;
                    }
                    if (showPrivacyDetail.tipo === 'cancellazione' && evadiForm.azione === 'evasa') {
                      Alert.alert(
                        'Conferma anonimizzazione',
                        'Sei sicuro di voler anonimizzare definitivamente l\'account di questo utente? L\'operazione non è reversibile.',
                        [
                          { text: 'Annulla', style: 'cancel' },
                          {
                            text: 'Conferma',
                            style: 'destructive',
                            onPress: async () => {
                              setEvadiLoading(true);
                              try {
                                await api.adminEvadiRichiestaPrivacy(token!, showPrivacyDetail.id, evadiForm);
                                Alert.alert('Successo', 'Richiesta evasa. Account anonimizzato.');
                                setShowPrivacyDetail(null);
                                loadPrivacyRichieste(privacyFilter);
                                api.adminCountScadenzaPrivacy(token!).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
                              } catch (e: any) {
                                Alert.alert('Errore', e.message);
                              } finally { setEvadiLoading(false); }
                            }
                          }
                        ]
                      );
                    } else {
                      setEvadiLoading(true);
                      try {
                        await api.adminEvadiRichiestaPrivacy(token!, showPrivacyDetail.id, evadiForm);
                        Alert.alert('Successo', `Richiesta ${evadiForm.azione} con successo`);
                        setShowPrivacyDetail(null);
                        loadPrivacyRichieste(privacyFilter);
                        api.adminCountScadenzaPrivacy(token!).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
                      } catch (e: any) {
                        Alert.alert('Errore', e.message);
                      } finally { setEvadiLoading(false); }
                    }
                  }}
                  disabled={evadiLoading}
                  activeOpacity={0.8}
                >
                  {evadiLoading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={s.submitBtnText}>Conferma azione</Text>
                  }
                </TouchableOpacity>
              </>}
            </>}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Aggiorna Segnalazione */}
      <Modal visible={!!modalSeg} transparent animationType="slide" onRequestClose={() => setModalSeg(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Aggiorna Segnalazione</Text>
            <Text style={s.modalSub}>{modalSeg?.tipologia} — {modalSeg?.user_nome}</Text>
            <Text style={s.modalDesc}>{modalSeg?.descrizione}</Text>

            {/* Show attachments if available */}
            {modalSeg?.allegati_dettagli && modalSeg.allegati_dettagli.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.modalLabel}>Allegati ({modalSeg.allegati_dettagli.length}):</Text>
                {modalSeg.allegati_dettagli.map((file: any, idx: number) => {
                  const isImage = file.content_type?.startsWith('image/');
                  return (
                    <TouchableOpacity key={idx} onPress={() => openFile(file.url)} style={s.attachRow}>
                      {isImage ? (
                        <Image source={{ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${file.url}` }} style={s.attachThumb} />
                      ) : (
                        <View style={[s.attachIcon, { backgroundColor: file.content_type === 'application/pdf' ? '#FEE2E2' : '#F3E8FF' }]}>
                          <Ionicons name={file.content_type === 'application/pdf' ? 'document-text' : 'videocam'} size={20} color={file.content_type === 'application/pdf' ? '#DC2626' : '#7C3AED'} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.textMain }} numberOfLines={1}>{file.filename}</Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted }}>{file.content_type} • {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}</Text>
                      </View>
                      <Ionicons name="open-outline" size={18} color={Colors.sky} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={s.modalLabel}>Cambia stato:</Text>
            {['Presa in carico', 'In lavorazione', 'Risolta'].map(st => (
              <TouchableOpacity key={st} testID={`seg-status-${st}`} style={[s.statusBtn, modalSeg?.stato === st && { backgroundColor: Colors.skyLight }]} onPress={() => updateSeg(modalSeg.id, st)}>
                <Text style={s.statusBtnText}>{st}</Text>
              </TouchableOpacity>
            ))}

            {/* Fornitore assignment */}
            {!modalSeg?.fornitore_id && (
              <TouchableOpacity style={[s.statusBtn, { borderColor: '#EA580C', marginTop: 8 }]}
                onPress={() => { setModalSeg(null); setShowAssegnaFornModal(modalSeg); setAssegnaFornForm({ fornitore_id: '', note_admin: '', data_prevista: '' }); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="construct-outline" size={18} color="#EA580C" />
                  <Text style={[s.statusBtnText, { color: '#EA580C', fontWeight: '700' }]}>Assegna Fornitore</Text>
                </View>
              </TouchableOpacity>
            )}
            {modalSeg?.fornitore_id && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFEDD5', borderRadius: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#7C2D12' }}>Fornitore: {modalSeg.fornitore_nome}</Text>
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Stato: {modalSeg.stato}</Text>
                {modalSeg.stato === 'Intervento completato' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={{ flex: 1, padding: 10, backgroundColor: '#16A34A', borderRadius: 8, alignItems: 'center' }}
                      onPress={() => chiudiSegnalazioneHandler(modalSeg.id)}>
                      <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 13 }}>Chiudi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, padding: 10, backgroundColor: '#D97706', borderRadius: 8, alignItems: 'center' }}
                      onPress={() => riapriSegnalazioneHandler(modalSeg.id)}>
                      <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 13 }}>Nuovo intervento</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            
            {/* Edit segnalazione button - only if not already assigned or closed */}
            {modalSeg && modalSeg.stato !== 'Risolta' && (
              <TouchableOpacity 
                style={[s.statusBtn, { borderColor: '#3B82F6', marginTop: 12, backgroundColor: '#EFF6FF' }]}
                onPress={() => openEditSegModal(modalSeg)}
                testID="edit-seg-btn"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  <Text style={[s.statusBtnText, { color: '#3B82F6', fontWeight: '700' }]}>Modifica Segnalazione</Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalSeg(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Aggiorna Appuntamento */}
      <Modal visible={!!modalApp} transparent animationType="slide" onRequestClose={() => setModalApp(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Gestisci Appuntamento</Text>
            <Text style={s.modalSub}>{modalApp?.motivo} — {modalApp?.user_nome}</Text>
            <Text style={s.modalDesc}>Data: {modalApp?.data_richiesta ? new Date(modalApp.data_richiesta).toLocaleDateString('it-IT') : ''} • {modalApp?.fascia_oraria}</Text>
            {['Confermato', 'Completato', 'Annullato'].map(st => (
              <TouchableOpacity key={st} testID={`app-status-${st}`} style={[s.statusBtn, modalApp?.stato === st && { backgroundColor: Colors.skyLight }]} onPress={() => updateApp(modalApp.id, st)}>
                <Text style={s.statusBtnText}>{st}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalApp(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Nuovo Condominio */}
      <Modal visible={showNewCond} transparent animationType="slide" onRequestClose={() => setShowNewCond(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={s.modalTitle}>Nuovo Condominio</Text>
              <TouchableOpacity onPress={() => setShowNewCond(false)}>
                <Ionicons name="close" size={24} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <CondominioFormFields form={newCond} onChange={(k, v) => setNewCond((p: any) => ({ ...p, [k]: v }))} />
              <PrimaryButton title="Crea Condominio" onPress={createCond} testID="cond-create-btn" />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Modifica Condominio */}
      <Modal visible={!!editCond} transparent animationType="slide" onRequestClose={() => setEditCond(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={s.modalTitle}>Modifica Condominio</Text>
              <TouchableOpacity onPress={() => setEditCond(null)}>
                <Ionicons name="close" size={24} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {editCond && <CondominioFormFields form={editCond} onChange={(k, v) => setEditCond((p: any) => ({ ...p, [k]: v }))} />}
              <PrimaryButton title="Salva Modifiche" onPress={updateCond} testID="cond-update-btn" />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Associa Utente */}
      <Modal visible={!!showAssocModal} transparent animationType="slide" onRequestClose={() => setShowAssocModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Associa a Condominio</Text>
            <Text style={s.modalSub}>{showAssocModal?.nome} {showAssocModal?.cognome} ({showAssocModal?.email})</Text>
            <PickerSelect label="Condominio *" value={condomini.find(c => c.id === assocForm.condominio_id)?.nome || ''}
              options={condomini.map(c => c.nome)}
              onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) setAssocForm(p => ({ ...p, condominio_id: c.id })); }}
              testID="assoc-cond-picker" />
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Unità immobiliare</Text>
              <TextInput testID="assoc-unita-input" style={s.input} placeholder="Es: Interno 5, Piano 2" value={assocForm.unita_immobiliare} onChangeText={v => setAssocForm(p => ({ ...p, unita_immobiliare: v }))} placeholderTextColor={Colors.textMuted} />
            </View>
            <PickerSelect label="Qualità *" value={assocForm.qualita} options={QUALITA_OPT} onSelect={v => setAssocForm(p => ({ ...p, qualita: v }))} testID="assoc-qualita-picker" />
            <PrimaryButton title="Associa Utente" onPress={associaUtente} testID="assoc-confirm-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAssocModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuovo Avviso */}
      <Modal visible={showNewAvviso} transparent animationType="slide" onRequestClose={() => setShowNewAvviso(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Avviso</Text>
            <TextInput testID="avviso-titolo-input" style={s.input} placeholder="Titolo *" value={newAvviso.titolo} onChangeText={v => setNewAvviso(p => ({ ...p, titolo: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="avviso-testo-input" style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Testo *" value={newAvviso.testo} onChangeText={v => setNewAvviso(p => ({ ...p, testo: v }))} multiline placeholderTextColor={Colors.textMuted} />
            <PickerSelect label="Categoria" value={newAvviso.categoria} options={['Avviso generico', 'Convocazione assemblea', 'Lavori in corso', 'Scadenza pagamento', 'Comunicazione urgente']} onSelect={v => setNewAvviso(p => ({ ...p, categoria: v }))} testID="avviso-cat-picker" />
            <PickerSelect label="Condominio (vuoto = tutti)" value={condomini.find(c => c.id === newAvviso.condominio_id)?.nome || 'Tutti i condomini'} options={['Tutti i condomini', ...condomini.map(c => c.nome)]} onSelect={v => { const c = condomini.find(c => c.nome === v); setNewAvviso(p => ({ ...p, condominio_id: c?.id || '' })); }} testID="avviso-cond-picker" />
            <PrimaryButton title="Pubblica Avviso" onPress={createAvviso} testID="avviso-publish-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewAvviso(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Estratto Conto */}
      <Modal visible={!!showECModal} transparent animationType="slide" onRequestClose={() => setShowECModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Estratto Conto</Text>
            <Text style={s.modalSub}>{showECModal?.nome} {showECModal?.cognome}</Text>
            {showECModal?.associazioni?.length > 0 && (
              <PickerSelect label="Condominio *" value={condomini.find(c => c.id === ecForm.condominio_id)?.nome || ''}
                options={showECModal.associazioni.map((a: any) => a.condominio_nome)}
                onSelect={v => { const a = showECModal.associazioni.find((a: any) => a.condominio_nome === v); if (a) setEcForm(p => ({ ...p, condominio_id: a.condominio_id })); }}
                testID="ec-cond-picker" />
            )}
            <ConfigField testID="ec-periodo" label="Periodo" value={ecForm.periodo} placeholder="Es: Gen - Giu 2026" onChange={v => setEcForm(p => ({ ...p, periodo: v }))} />
            <ConfigField testID="ec-versate" label="Quote Versate (€)" value={ecForm.quote_versate} placeholder="0.00" onChange={v => setEcForm(p => ({ ...p, quote_versate: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-da-versare" label="Quote da Versare (€)" value={ecForm.quote_da_versare} placeholder="0.00" onChange={v => setEcForm(p => ({ ...p, quote_da_versare: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-saldo" label="Saldo (€)" value={ecForm.saldo} placeholder="0.00" onChange={v => setEcForm(p => ({ ...p, saldo: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-scadenza" label="Scadenza" value={ecForm.scadenza} placeholder="Es: 30/06/2026" onChange={v => setEcForm(p => ({ ...p, scadenza: v }))} />
            <ConfigField testID="ec-note" label="Note" value={ecForm.note} placeholder="Note aggiuntive..." onChange={v => setEcForm(p => ({ ...p, note: v }))} multiline />
            <PrimaryButton title="Salva Estratto Conto" onPress={saveEstrattoConto} testID="ec-save-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowECModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuovo Fornitore */}
      <Modal visible={showNewForn} transparent animationType="slide" onRequestClose={() => setShowNewForn(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Fornitore</Text>
            <ConfigField testID="forn-rs" label="Ragione Sociale *" value={newForn.ragione_sociale} placeholder="Es: Idraulica Rossi" onChange={v => setNewForn(p => ({ ...p, ragione_sociale: v }))} />
            <ConfigField testID="forn-email" label="Email *" value={newForn.email} placeholder="fornitore@email.it" onChange={v => setNewForn(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <ConfigField testID="forn-pw" label="Password (auto se vuota)" value={newForn.password} placeholder="Lascia vuoto per auto-generare" onChange={v => setNewForn(p => ({ ...p, password: v }))} />
            <ConfigField testID="forn-tel" label="Telefono" value={newForn.telefono} placeholder="+39 333 1234567" onChange={v => setNewForn(p => ({ ...p, telefono: v }))} />
            <ConfigField testID="forn-piva" label="Partita IVA" value={newForn.partita_iva} placeholder="12345678901" onChange={v => setNewForn(p => ({ ...p, partita_iva: v }))} />
            <ConfigField testID="forn-cf" label="Codice Fiscale" value={newForn.codice_fiscale} placeholder="RSSMRA80A01H703K" onChange={v => setNewForn(p => ({ ...p, codice_fiscale: v }))} />
            <ConfigField testID="forn-addr" label="Indirizzo" value={newForn.indirizzo} placeholder="Via Roma 1, Salerno" onChange={v => setNewForn(p => ({ ...p, indirizzo: v }))} />
            <ConfigField testID="forn-iban" label="IBAN" value={newForn.iban} placeholder="IT60X0542811101000000123456" onChange={v => setNewForn(p => ({ ...p, iban: v }))} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textSec, marginBottom: 4, marginTop: 8 }}>Settori di competenza</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SETTORI.map(sett => {
                const sel = newForn.settori.includes(sett);
                return (
                  <TouchableOpacity key={sett} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: sel ? '#EA580C' : Colors.bg, borderWidth: 1, borderColor: sel ? '#EA580C' : Colors.border }}
                    onPress={() => setNewForn(p => ({ ...p, settori: sel ? p.settori.filter(s => s !== sett) : [...p.settori, sett] }))}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: sel ? Colors.white : Colors.textSec }}>{sett}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <PrimaryButton title="Crea Fornitore" onPress={createFornitoreHandler} testID="forn-create-btn" style={{ backgroundColor: '#EA580C' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewForn(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Assegna Fornitore */}
      <Modal visible={!!showAssegnaFornModal} transparent animationType="slide" onRequestClose={() => setShowAssegnaFornModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Assegna Fornitore</Text>
            <Text style={s.modalSub}>{showAssegnaFornModal?.tipologia} — {showAssegnaFornModal?.condominio_nome}</Text>
            <PickerSelect label="Fornitore *" value={fornitori.find(f => f.id === assegnaFornForm.fornitore_id)?.ragione_sociale || ''}
              options={fornitori.filter(f => f.stato === 'Attivo').map(f => f.ragione_sociale)}
              onSelect={v => { const f = fornitori.find(f => f.ragione_sociale === v); if (f) setAssegnaFornForm(p => ({ ...p, fornitore_id: f.id })); }}
              testID="assegna-forn-picker" />
            <ConfigField testID="assegna-note" label="Note per il fornitore" value={assegnaFornForm.note_admin} placeholder="Istruzioni specifiche..." onChange={v => setAssegnaFornForm(p => ({ ...p, note_admin: v }))} multiline />
            <ConfigField testID="assegna-data" label="Data prevista intervento" value={assegnaFornForm.data_prevista} placeholder="Es: 20/03/2026" onChange={v => setAssegnaFornForm(p => ({ ...p, data_prevista: v }))} />
            <PrimaryButton title="Assegna" onPress={assegnaFornitoreHandler} testID="assegna-forn-btn" style={{ backgroundColor: '#EA580C' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAssegnaFornModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuova/Modifica Segnalazione */}
      <Modal visible={showNewSegModal} transparent animationType="slide" onRequestClose={() => { setShowNewSegModal(false); resetSegForm(); }}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>{isEditingSeg ? 'Modifica Segnalazione' : 'Nuova Segnalazione'}</Text>
            {isEditingSeg && <Text style={s.modalSub}>Modifica i dettagli della segnalazione</Text>}
            
            {/* Condominio - only for new segnalazioni */}
            {!isEditingSeg && (
              <PickerSelect 
                label="Condominio *" 
                value={condomini.find(c => c.id === segForm.condominio_id)?.nome || ''}
                options={condomini.map(c => c.nome)}
                onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) setSegForm(p => ({ ...p, condominio_id: c.id })); }}
                testID="seg-new-cond-picker" 
              />
            )}
            
            {/* Tipologia */}
            <PickerSelect 
              label="Tipologia *" 
              value={segForm.tipologia} 
              options={TIPOLOGIE} 
              onSelect={v => setSegForm(p => ({ ...p, tipologia: v }))} 
              testID="seg-new-tipo-picker" 
            />
            
            {/* Descrizione */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Descrizione *</Text>
              <TextInput 
                testID="seg-new-desc-input" 
                style={[s.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Descrivi il problema nel dettaglio..." 
                value={segForm.descrizione} 
                onChangeText={v => setSegForm(p => ({ ...p, descrizione: v }))} 
                multiline 
                placeholderTextColor={Colors.textMuted} 
              />
            </View>
            
            {/* Urgenza */}
            <PickerSelect 
              label="Urgenza" 
              value={segForm.urgenza} 
              options={URGENZE} 
              onSelect={v => setSegForm(p => ({ ...p, urgenza: v }))} 
              testID="seg-new-urgenza-picker" 
            />
            
            {/* Note admin */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Note Admin (uso interno)</Text>
              <TextInput 
                testID="seg-new-note-input" 
                style={[s.input, { height: 60, textAlignVertical: 'top' }]} 
                placeholder="Note visibili solo all'admin..." 
                value={segForm.note_admin} 
                onChangeText={v => setSegForm(p => ({ ...p, note_admin: v }))} 
                multiline 
                placeholderTextColor={Colors.textMuted} 
              />
            </View>
            
            {/* Media Upload Section */}
            <View style={s.mediaSection}>
              <Text style={s.mediaSectionTitle}>Allegati (foto, video, documenti)</Text>
              <Text style={s.mediaSectionHint}>Puoi allegare fino a 10 file. Max 50MB per file.</Text>

              <View style={s.mediaButtons}>
                <TouchableOpacity testID="seg-new-camera-btn" style={s.mediaBtn} onPress={() => pickSegImage(true)} activeOpacity={0.7}>
                  <View style={[s.mediaBtnIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="camera" size={22} color="#2563EB" />
                  </View>
                  <Text style={s.mediaBtnLabel}>Fotocamera</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="seg-new-gallery-btn" style={s.mediaBtn} onPress={() => pickSegImage(false)} activeOpacity={0.7}>
                  <View style={[s.mediaBtnIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="images" size={22} color="#7C3AED" />
                  </View>
                  <Text style={s.mediaBtnLabel}>Galleria</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="seg-new-pdf-btn" style={s.mediaBtn} onPress={pickSegDocument} activeOpacity={0.7}>
                  <View style={[s.mediaBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="document-text" size={22} color="#DC2626" />
                  </View>
                  <Text style={s.mediaBtnLabel}>PDF</Text>
                </TouchableOpacity>
              </View>

              {/* Selected files list */}
              {segMediaFiles.length > 0 && (
                <View style={s.filesList}>
                  <Text style={s.filesCount}>{segMediaFiles.length}/10 file selezionati</Text>
                  {segMediaFiles.map((file, index) => (
                    <View key={index} style={s.fileItem}>
                      {file.type === 'image' ? (
                        <Image source={{ uri: file.uri }} style={s.fileThumbnail} />
                      ) : (
                        <View style={[s.fileIconWrap, { backgroundColor: getFileColor(file.type) + '15' }]}>
                          <Ionicons name={getFileIcon(file.type) as any} size={22} color={getFileColor(file.type)} />
                        </View>
                      )}
                      <View style={s.fileInfo}>
                        <Text style={s.fileName} numberOfLines={1}>{file.filename}</Text>
                        <View style={s.fileMetaRow}>
                          <Text style={s.fileMeta}>
                            {file.type === 'image' ? 'Foto' : file.type === 'video' ? 'Video' : 'PDF'}
                            {file.size ? ` • ${formatFileSize(file.size)}` : ''}
                            {file.uploadedId ? ' (già caricato)' : ''}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity testID={`seg-new-remove-file-${index}`} onPress={() => removeSegFile(index)} style={s.removeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={24} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Upload progress */}
            {segUploadProgress ? (
              <View style={s.progressBar}>
                <ActivityIndicator size="small" color={Colors.navy} />
                <Text style={s.progressText}>{segUploadProgress}</Text>
              </View>
            ) : null}
            
            <PrimaryButton 
              title={loading ? (isEditingSeg ? "Salvataggio..." : "Creazione...") : (isEditingSeg ? "Salva Modifiche" : "Crea Segnalazione")} 
              onPress={handleSaveSegnalazione} 
              loading={loading} 
              testID="seg-new-submit-btn" 
              style={{ backgroundColor: '#D97706' }} 
            />
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowNewSegModal(false); resetSegForm(); }}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuovo Sopralluogo */}
      <Modal visible={showNewSopralluogo} transparent animationType="slide" onRequestClose={() => setShowNewSopralluogo(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Sopralluogo</Text>
            <PickerSelect label="Condominio *" value={condomini.find(c => c.id === sopralluogoForm.condominio_id)?.nome || ''} options={condomini.map(c => c.nome)}
              onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) setSopralluogoForm(p => ({ ...p, condominio_id: c.id })); }}
              testID="sop-cond-picker" />
            <ConfigField testID="sop-data" label="Data" value={sopralluogoForm.data} placeholder="2026-03-14" onChange={(v: string) => setSopralluogoForm(p => ({ ...p, data: v }))} />
            <ConfigField testID="sop-ora" label="Ora Inizio" value={sopralluogoForm.ora_inizio} placeholder="09:30" onChange={(v: string) => setSopralluogoForm(p => ({ ...p, ora_inizio: v }))} />
            <PickerSelect label="Motivo" value={sopralluogoForm.motivo} options={MOTIVI_SOPRALLUOGO}
              onSelect={v => setSopralluogoForm(p => ({ ...p, motivo: v }))} testID="sop-motivo-picker" />
            {collaboratori.length > 0 && (
              <PickerSelect label="Assegna a Collaboratore (opzionale)" value={collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.nome ? `${collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.nome} ${collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.cognome}` : ''} 
                options={['', ...collaboratori.map(c => `${c.nome} ${c.cognome}`)]}
                onSelect={v => { const c = collaboratori.find(c => `${c.nome} ${c.cognome}` === v); setSopralluogoForm(p => ({ ...p, collaboratore_id: c?.id || '' })); }}
                testID="sop-collab-picker" />
            )}
            <ConfigField testID="sop-note" label="Note Generali" value={sopralluogoForm.note_generali} placeholder="Note sul sopralluogo..." onChange={(v: string) => setSopralluogoForm(p => ({ ...p, note_generali: v }))} multiline />
            <PrimaryButton title="Avvia Sopralluogo" onPress={createSopralluogoHandler} loading={loading} testID="sop-create-btn" style={{ backgroundColor: '#7C3AED' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewSopralluogo(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuovo Collaboratore */}
      <Modal visible={showNewCollaboratore} transparent animationType="slide" onRequestClose={() => setShowNewCollaboratore(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Collaboratore</Text>
            <ConfigField testID="collab-nome" label="Nome *" value={collabForm.nome} placeholder="Mario" onChange={(v: string) => setCollabForm(p => ({ ...p, nome: v }))} />
            <ConfigField testID="collab-cognome" label="Cognome *" value={collabForm.cognome} placeholder="Rossi" onChange={(v: string) => setCollabForm(p => ({ ...p, cognome: v }))} />
            <ConfigField testID="collab-email" label="Email *" value={collabForm.email} placeholder="mario@studio.it" onChange={(v: string) => setCollabForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <ConfigField testID="collab-password" label="Password *" value={collabForm.password} placeholder="••••••••" onChange={(v: string) => setCollabForm(p => ({ ...p, password: v }))} />
            <ConfigField testID="collab-telefono" label="Telefono" value={collabForm.telefono} placeholder="+39 333 1234567" onChange={(v: string) => setCollabForm(p => ({ ...p, telefono: v }))} />
            <ConfigField testID="collab-qualifica" label="Qualifica" value={collabForm.qualifica} placeholder="Geometra, Tecnico, etc." onChange={(v: string) => setCollabForm(p => ({ ...p, qualifica: v }))} />
            <PrimaryButton title="Crea Collaboratore" onPress={createCollaboratoreHandler} loading={loading} testID="collab-create-btn" style={{ backgroundColor: '#6366F1' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewCollaboratore(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Dettaglio Sopralluogo con Checklist */}
      <Modal visible={!!showSopralluogoDetail} transparent animationType="slide" onRequestClose={() => setShowSopralluogoDetail(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={[s.modal, { maxHeight: '95%' }]} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{showSopralluogoDetail?.condominio_nome}</Text>
                <Text style={s.modalSub}>{showSopralluogoDetail?.condominio_indirizzo}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: showSopralluogoDetail?.stato === 'completato' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: showSopralluogoDetail?.stato === 'completato' ? '#16A34A' : '#D97706' }}>
                  {showSopralluogoDetail?.stato === 'completato' ? 'COMPLETATO' : 'IN CORSO'}
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.textSec }}>{new Date(showSopralluogoDetail?.data || '').toLocaleDateString('it-IT')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.textSec }}>{showSopralluogoDetail?.ora_inizio || '--:--'} - {showSopralluogoDetail?.ora_fine || 'in corso'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.textSec }}>{showSopralluogoDetail?.eseguito_da}</Text>
              </View>
            </View>

            {/* Semaforo Summary */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#22C55E', marginTop: 4 }}>{showSopralluogoDetail?.checklist_ok || 0}</Text>
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>OK</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={28} color="#F59E0B" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#F59E0B', marginTop: 4 }}>{showSopralluogoDetail?.checklist_anomalie || 0}</Text>
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>Anomalie</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="ellipse-outline" size={28} color="#9CA3AF" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginTop: 4 }}>{showSopralluogoDetail?.checklist_non_controllato || 0}</Text>
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>Non controllato</Text>
              </View>
            </View>

            {/* Checklist */}
            <Text style={[s.secTitle, { marginBottom: 12 }]}>Checklist ({showSopralluogoDetail?.checklist?.length || 0} voci)</Text>
            {showSopralluogoDetail?.checklist?.map((item: any) => (
              <View key={item.id} style={{ backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Ionicons name={getSemaforoIcon(item.stato) as any} size={24} color={getSemaforoColor(item.stato)} />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.textMain, flex: 1 }}>{item.voce}</Text>
                  </View>
                  {/* Semaforo buttons - only if sopralluogo is in progress */}
                  {showSopralluogoDetail?.stato === 'in_corso' && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'ok')}
                        style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'ok' ? { backgroundColor: '#22C55E' } : { backgroundColor: '#22C55E20' }]}>
                        <Ionicons name="checkmark" size={18} color={item.stato === 'ok' ? Colors.white : '#22C55E'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'anomalia')}
                        style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'anomalia' ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#F59E0B20' }]}>
                        <Ionicons name="alert" size={18} color={item.stato === 'anomalia' ? Colors.white : '#F59E0B'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'non_controllato')}
                        style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'non_controllato' ? { backgroundColor: '#9CA3AF' } : { backgroundColor: '#9CA3AF20' }]}>
                        <Ionicons name="remove" size={18} color={item.stato === 'non_controllato' ? Colors.white : '#9CA3AF'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {/* Anomalia details */}
                {item.anomalia && (
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>Anomalia: {item.anomalia.gravita}</Text>
                    <Text style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>{item.anomalia.descrizione}</Text>
                    {item.anomalia.foto_dettagli?.length > 0 && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        {item.anomalia.foto_dettagli.map((f: any, idx: number) => (
                          <Image key={idx} source={{ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}` }} style={{ width: 50, height: 50, borderRadius: 6 }} />
                        ))}
                      </View>
                    )}
                    {item.anomalia.segnalazione_protocollo && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                        <Ionicons name="warning" size={14} color="#DC2626" />
                        <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Segnalazione: {item.anomalia.segnalazione_protocollo}</Text>
                      </View>
                    )}
                    {/* Edit anomalia button */}
                    {showSopralluogoDetail?.stato === 'in_corso' && (
                      <TouchableOpacity onPress={() => {
                        setShowAnomaliaModal({ sopralluogo: showSopralluogoDetail, item });
                        setAnomaliaForm({
                          descrizione: item.anomalia.descrizione || '',
                          gravita: item.anomalia.gravita || 'Moderata',
                          foto_ids: item.anomalia.foto_ids || [],
                          apri_segnalazione: false,
                          fornitore_id: '',
                          tipologia_intervento: '',
                          urgenza_segnalazione: '',
                          note_fornitore: ''
                        });
                        setAnomaliaPhotos(item.anomalia.foto_dettagli?.map((f: any) => ({
                          uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}`,
                          filename: f.filename,
                          mimeType: f.content_type,
                          type: 'image' as const,
                          uploadedId: f.id,
                        })) || []);
                      }} style={{ marginTop: 8, padding: 8, backgroundColor: '#FCD34D', borderRadius: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#78350F' }}>Modifica Anomalia</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* Close sopralluogo */}
            {showSopralluogoDetail?.stato === 'in_corso' && (
              <View style={{ marginTop: 16 }}>
                <Text style={[s.secTitle, { marginBottom: 8 }]}>Chiudi Sopralluogo</Text>
                <PickerSelect label="Valutazione Generale" value={showSopralluogoDetail?.valutazione_temp || 'Discreto'} options={VALUTAZIONI}
                  onSelect={v => setShowSopralluogoDetail((p: any) => ({ ...p, valutazione_temp: v }))} testID="sop-valutazione-picker" />
                <ConfigField testID="sop-note-finali" label="Note Finali" value={showSopralluogoDetail?.note_finali_temp || ''} placeholder="Note conclusive..." 
                  onChange={(v: string) => setShowSopralluogoDetail((p: any) => ({ ...p, note_finali_temp: v }))} multiline />
                <PrimaryButton title="Completa Sopralluogo" onPress={() => closeSopralluogoHandler(showSopralluogoDetail.id, showSopralluogoDetail.valutazione_temp || 'Discreto', showSopralluogoDetail.note_finali_temp || '')} 
                  loading={loading} testID="sop-close-btn" style={{ backgroundColor: '#16A34A' }} />
              </View>
            )}

            {/* Delete button */}
            <TouchableOpacity style={{ marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onPress={() => deleteSopralluogoHandler(showSopralluogoDetail?.id, showSopralluogoDetail?.condominio_nome)}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Elimina Sopralluogo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSopralluogoDetail(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Anomalia */}
      <Modal visible={!!showAnomaliaModal} transparent animationType="slide" onRequestClose={closeAnomaliaModal}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Anomalia: {showAnomaliaModal?.item?.voce}</Text>
            
            <ConfigField testID="anomalia-desc" label="Descrizione *" value={anomaliaForm.descrizione} placeholder="Descrivi l'anomalia rilevata..." 
              onChange={(v: string) => setAnomaliaForm(p => ({ ...p, descrizione: v }))} multiline />
            
            <PickerSelect label="Gravità" value={anomaliaForm.gravita} options={GRAVITA_OPTIONS}
              onSelect={v => setAnomaliaForm(p => ({ ...p, gravita: v }))} testID="anomalia-gravita-picker" />
            
            {/* Photos */}
            <Text style={[s.configLabel, { marginTop: 12 }]}>Foto ({anomaliaPhotos.length}/5)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {anomaliaPhotos.map((photo, idx) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                  <TouchableOpacity onPress={() => removeAnomaliaPhoto(idx)} style={{ position: 'absolute', top: -6, right: -6 }}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {anomaliaPhotos.length < 5 && (
                <TouchableOpacity onPress={pickAnomaliaPhoto} style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' }}>
                  <Ionicons name="camera" size={24} color={Colors.textMuted} />
                  <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>Foto</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Voice Notes - Multiple */}
            <Text style={[s.configLabel, { marginTop: 12 }]}>Note Vocali ({anomaliaVoiceNotes.length})</Text>
            <View style={{ marginTop: 8 }}>
              {/* Existing voice notes with play button */}
              {anomaliaVoiceNotes.map((vn, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginBottom: 8, gap: 10 }}>
                  <TouchableOpacity 
                    onPress={() => playVoiceNote(vn.uri, idx)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: playingVoiceNoteIndex === idx ? '#DC2626' : Colors.sky, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name={playingVoiceNoteIndex === idx ? 'stop' : 'play'} size={16} color={Colors.white} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.textMain }}>Nota {idx + 1}</Text>
                    <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                      {Math.floor(vn.duration / 60)}:{(vn.duration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setAnomaliaVoiceNotes(prev => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add new voice note - key forces remount after each recording */}
              <VoiceRecorder
                key={`voice-recorder-${voiceRecorderKey}`}
                label=""
                compact
                onRecordingComplete={(uri, filename, duration) => {
                  setAnomaliaVoiceNotes(prev => [...prev, { uri, filename, duration }]);
                  // Increment key to reset the VoiceRecorder for next recording
                  setVoiceRecorderKey(prev => prev + 1);
                }}
                onDeleteRecording={() => {}}
              />
              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>Puoi aggiungere più note vocali</Text>
            </View>
            
            {/* Create segnalazione option */}
            <View style={{ marginTop: 20, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 10 }}>
              <TouchableOpacity onPress={() => setAnomaliaForm(p => ({ ...p, apri_segnalazione: !p.apri_segnalazione }))} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D97706', justifyContent: 'center', alignItems: 'center', backgroundColor: anomaliaForm.apri_segnalazione ? '#D97706' : 'transparent' }}>
                  {anomaliaForm.apri_segnalazione && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>Apri segnalazione e assegna fornitore</Text>
              </TouchableOpacity>
              
              {anomaliaForm.apri_segnalazione && (
                <View style={{ marginTop: 12 }}>
                  <PickerSelect label="Fornitore *" value={fornitori.find(f => f.id === anomaliaForm.fornitore_id)?.ragione_sociale || ''} 
                    options={fornitori.filter(f => f.stato === 'Attivo').map(f => f.ragione_sociale)}
                    onSelect={v => { const f = fornitori.find(f => f.ragione_sociale === v); if (f) setAnomaliaForm(p => ({ ...p, fornitore_id: f.id })); }}
                    testID="anomalia-forn-picker" />
                  <ConfigField testID="anomalia-tipo" label="Tipologia Intervento" value={anomaliaForm.tipologia_intervento} placeholder="Es: Guasto idraulico" 
                    onChange={(v: string) => setAnomaliaForm(p => ({ ...p, tipologia_intervento: v }))} />
                  <PickerSelect label="Urgenza" value={anomaliaForm.urgenza_segnalazione || 'Media'} options={URGENZE}
                    onSelect={v => setAnomaliaForm(p => ({ ...p, urgenza_segnalazione: v }))} testID="anomalia-urgenza-picker" />
                  <ConfigField testID="anomalia-note-forn" label="Note per il Fornitore" value={anomaliaForm.note_fornitore} placeholder="Istruzioni specifiche..." 
                    onChange={(v: string) => setAnomaliaForm(p => ({ ...p, note_fornitore: v }))} multiline />
                </View>
              )}
            </View>
            
            <PrimaryButton title="Salva Anomalia" onPress={saveAnomaliaHandler} loading={loading} testID="anomalia-save-btn" style={{ backgroundColor: '#F59E0B', marginTop: 16 }} />
            <TouchableOpacity style={s.closeBtn} onPress={closeAnomaliaModal}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper component for config fields
function ConfigField({ testID, label, value, placeholder, onChange, keyboardType, multiline }: any) {
  return (
    <View style={s.configField}>
      <Text style={s.configLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        multiline={multiline}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  // Tab bar (scrollable horizontal)
  tabBarWrap: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBarScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bg, gap: 6 },
  tabPillActive: { backgroundColor: Colors.navy },
  tabPillLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSec },
  tabPillLabelActive: { color: Colors.white, fontWeight: '600' },
  // Content
  content: { padding: 16, paddingBottom: 24 },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 16 },
  // Stats grid (dashboard)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  statCard: { width: '50%', padding: 5 },
  statCardInner: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statVal: { fontSize: 32, fontWeight: '800', color: Colors.textMain, marginBottom: 2 },
  statLabel: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  // Quick actions (dashboard)
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  quickAction: { width: '50%', padding: 5 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  // List cards
  listCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, marginBottom: 2 },
  listSub2: { fontSize: 13, color: Colors.textSec, marginBottom: 2 },
  listMeta: { fontSize: 12, color: Colors.textMuted },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy, margin: 16, marginBottom: 0, padding: 14, borderRadius: 12 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white, marginLeft: 8 },
  // User association
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  assocSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, marginLeft: 50 },
  assocTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 6 },
  assocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  assocName: { fontSize: 13, fontWeight: '500', color: Colors.textMain },
  assocInfo: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  notAbilitato: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 50 },
  notAbilitatoText: { fontSize: 12, color: '#D97706', fontWeight: '500', marginLeft: 4 },
  assocBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, marginLeft: 50 },
  assocBtnText: { fontSize: 13, fontWeight: '600', color: Colors.sky, marginLeft: 6 },
  // Action row for trasmissioni
  actionRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8, marginLeft: 50 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  miniBtnText: { fontSize: 13, fontWeight: '600' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  modalSub: { fontSize: 15, color: Colors.textSec, marginBottom: 4 },
  modalDesc: { fontSize: 14, color: Colors.textSec, marginBottom: 16, lineHeight: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMain, marginBottom: 8 },
  statusBtn: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  statusBtnText: { fontSize: 15, color: Colors.textMain, textAlign: 'center', fontWeight: '500' },
  closeBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  closeBtnText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  input: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 16, color: Colors.textMain, marginBottom: 12, backgroundColor: Colors.bg },
  inputGroup: { marginBottom: 4 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSec, marginBottom: 6 },
  // Config
  configSection: { backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  configSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  configSectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.navy, marginLeft: 10 },
  configField: { marginBottom: 6 },
  configLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSec, marginBottom: 4 },
  configHint: { fontSize: 13, color: Colors.textSec, marginBottom: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.skyLight, borderRadius: 10, padding: 14, marginBottom: 8 },
  exportBtnText: { fontSize: 14, fontWeight: '600', color: Colors.navy, marginLeft: 10 },
  ecUserBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ecUserName: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  ecUserCond: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  // Attachments in modal
  attachRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  attachThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.bg },
  attachIcon: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  // Media section (for new/edit segnalazione)
  mediaSection: { marginTop: 8, marginBottom: 16 },
  mediaSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, marginBottom: 4 },
  mediaSectionHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  mediaButtons: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  mediaBtnIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  mediaBtnLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSec },
  filesList: { marginTop: 14 },
  filesCount: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  fileThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.bg },
  fileIconWrap: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  fileMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  fileMeta: { fontSize: 11, color: Colors.textMuted },
  removeBtn: { padding: 4 },
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.skyLight, borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  progressText: { fontSize: 13, fontWeight: '500', color: Colors.navy },
});


// Condominio card extra styles
const cs2 = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  pillText: { fontSize: 12, color: Colors.textSec, fontWeight: '500' },
  metaText: { fontSize: 12, color: Colors.textSec },
});

// Privacy Admin Tab styles
const pvs = StyleSheet.create({
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
    borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#DC2626',
  },
  alertText: { fontSize: 13, color: '#DC2626', fontWeight: '600', flex: 1, marginLeft: 8 },
  alertBtn: { backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  alertBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  filterLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSec, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { fontSize: 13, color: Colors.textSec, fontWeight: '500' },
  chipTextActive: { color: Colors.white },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSec, marginTop: 12 },
  emptySubText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardScadente: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tipoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tipoBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.navy },
  statoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statoBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardNome: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  cardProto: { fontSize: 12, color: Colors.sky, fontWeight: '500', marginTop: 1 },
  cardDate: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  scadBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 },
  scadBadgeRed: { backgroundColor: '#FEE2E2' },
  scadText: { fontSize: 12, color: Colors.textSec, fontWeight: '500' },
  scadTextRed: { color: '#DC2626', fontWeight: '700' },
});
