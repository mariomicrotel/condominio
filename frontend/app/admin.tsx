import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, RefreshControl, ActivityIndicator, Modal, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge, PrimaryButton, PickerSelect } from '../src/components/SharedComponents';

// Media file interface for uploads
interface MediaFile {
  uri: string;
  filename: string;
  mimeType: string;
  size?: number;
  type: 'image' | 'video' | 'pdf';
  uploadedId?: string;
}

type Tab = 'dashboard' | 'condomini' | 'utenti' | 'fornitori' | 'sopralluoghi' | 'segnalazioni' | 'appuntamenti' | 'avvisi' | 'trasmissioni' | 'config';

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
];

const QUALITA_OPT = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];
const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Ascensore', 'Infiltrazioni', 'Parti comuni', 'Pulizia', 'Sicurezza', 'Altro'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];

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
  const [newCond, setNewCond] = useState({ nome: '', indirizzo: '', codice_fiscale: '', note: '' });
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
  const [showAnomaliaModal, setShowAnomaliaModal] = useState<any>(null); // { sopralluogo, item }
  const [anomaliaForm, setAnomaliaForm] = useState({ descrizione: '', gravita: 'Moderata', foto_ids: [] as string[], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' });
  const [anomaliaPhotos, setAnomaliaPhotos] = useState<MediaFile[]>([]);

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
    } catch {} finally { setLoading(false); }
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
      setNewCond({ nome: '', indirizzo: '', codice_fiscale: '', note: '' });
      Alert.alert('Creato', 'Condominio aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
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
    try {
      await api.updateChecklistItem(token!, sopId, itemId, stato);
      // Refresh detail
      const full = await api.getSopralluogo(token!, sopId);
      setShowSopralluogoDetail(full);
      
      if (stato === 'anomalia') {
        // Open anomalia modal
        const item = full.checklist.find((c: any) => c.id === itemId);
        setShowAnomaliaModal({ sopralluogo: full, item });
        setAnomaliaForm({ descrizione: '', gravita: 'Moderata', foto_ids: [], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' });
        setAnomaliaPhotos([]);
      }
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

      await api.createAnomalia(token!, showAnomaliaModal.sopralluogo.id, showAnomaliaModal.item.id, {
        descrizione: anomaliaForm.descrizione,
        gravita: anomaliaForm.gravita,
        foto_ids: fotoIds,
        apri_segnalazione: anomaliaForm.apri_segnalazione,
        fornitore_id: anomaliaForm.fornitore_id || undefined,
        tipologia_intervento: anomaliaForm.tipologia_intervento || undefined,
        urgenza_segnalazione: anomaliaForm.urgenza_segnalazione || undefined,
        note_fornitore: anomaliaForm.note_fornitore || undefined,
      });

      setShowAnomaliaModal(null);
      // Refresh sopralluogo
      const full = await api.getSopralluogo(token!, showAnomaliaModal.sopralluogo.id);
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

  const closeSopralluogoHandler = async (sopId: string, valutazione: string, note: string) => {
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
            return (
              <TouchableOpacity
                key={t.key}
                testID={`admin-tab-${t.key}`}
                style={[s.tabPill, active && s.tabPillActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={(active ? t.icon.replace('-outline', '') : t.icon) as any} size={16} color={active ? Colors.white : Colors.textSec} />
                <Text style={[s.tabPillLabel, active && s.tabPillLabelActive]}>{t.label}</Text>
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
            <TouchableOpacity testID="admin-new-cond-btn" style={s.addBtn} onPress={() => setShowNewCond(true)}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuovo Condominio</Text>
            </TouchableOpacity>
            <FlatList data={condomini} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun condominio</Text>}
              renderItem={({ item }) => (
                <View testID={`admin-cond-${item.id}`} style={s.listCard}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="business" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.nome}</Text>
                      <Text style={s.listSub2}>{item.indirizzo}</Text>
                      {item.codice_fiscale ? <Text style={s.listMeta}>CF: {item.codice_fiscale}</Text> : null}
                    </View>
                    <TouchableOpacity testID={`admin-del-cond-${item.id}`} onPress={() => deleteCond(item.id, item.nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )} />
          </View>
        )}

        {/* ====== UTENTI ====== */}
        {tab === 'utenti' && (
          <FlatList data={utenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun utente registrato</Text>}
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
            )} />
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
      </View>

      {/* ====== MODALS ====== */}

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
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Condominio</Text>
            <TextInput testID="cond-nome-input" style={s.input} placeholder="Nome condominio *" value={newCond.nome} onChangeText={v => setNewCond(p => ({ ...p, nome: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-indirizzo-input" style={s.input} placeholder="Indirizzo *" value={newCond.indirizzo} onChangeText={v => setNewCond(p => ({ ...p, indirizzo: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-cf-input" style={s.input} placeholder="Codice Fiscale" value={newCond.codice_fiscale} onChangeText={v => setNewCond(p => ({ ...p, codice_fiscale: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-note-input" style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Note" value={newCond.note} onChangeText={v => setNewCond(p => ({ ...p, note: v }))} multiline placeholderTextColor={Colors.textMuted} />
            <PrimaryButton title="Crea Condominio" onPress={createCond} testID="cond-create-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewCond(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
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
