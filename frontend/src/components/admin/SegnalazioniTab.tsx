import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge, PickerSelect, PrimaryButton, ConfigField } from '../SharedComponents';
import { s } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface MediaFile {
  uri: string; filename: string; mimeType: string; size?: number;
  type: 'image' | 'video' | 'pdf'; uploadedId?: string;
}

const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Ascensore', 'Infiltrazioni', 'Parti comuni', 'Pulizia', 'Sicurezza', 'Altro'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];

interface Props {
  token: string;
  segnalazioni: any[];
  condomini: any[];
  fornitori: any[];
  onRefresh: () => void;
}

export default function SegnalazioniTab({ token, segnalazioni, condomini, fornitori, onRefresh }: Props) {
  const [modalSeg, setModalSeg] = useState<any>(null);
  const [showNewSegModal, setShowNewSegModal] = useState(false);
  const [isEditingSeg, setIsEditingSeg] = useState(false);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [segForm, setSegForm] = useState({ condominio_id: '', tipologia: '', descrizione: '', urgenza: 'Media', note_admin: '' });
  const [segMediaFiles, setSegMediaFiles] = useState<MediaFile[]>([]);
  const [segUploadProgress, setSegUploadProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAssegnaFornModal, setShowAssegnaFornModal] = useState<any>(null);
  const [assegnaFornForm, setAssegnaFornForm] = useState({ fornitore_id: '', note_admin: '', data_prevista: '' });

  const resetSegForm = () => { setSegForm({ condominio_id: '', tipologia: '', descrizione: '', urgenza: 'Media', note_admin: '' }); setSegMediaFiles([]); setIsEditingSeg(false); setEditingSegId(null); };
  const openNewSegModal = () => { resetSegForm(); setShowNewSegModal(true); };

  const loadSegDetail = async (segId: string) => {
    try { const detail = await api.getSegnalazioneDetail(token, segId); setModalSeg(detail); }
    catch { const item = segnalazioni.find(ss => ss.id === segId); if (item) setModalSeg(item); }
  };

  const openFile = async (file: any) => {
    try {
      const { Platform, Linking } = require('react-native');
      const url = await api.downloadFileBlobUrl(token, file.id, file.filename);
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-undef
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile aprire il file');
    }
  };

  const updateSeg = async (id: string, stato: string) => {
    try { await api.updateAdminSeg(token, id, { stato }); setModalSeg(null); onRefresh(); }
    catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const openEditSegModal = (seg: any) => {
    setIsEditingSeg(true); setEditingSegId(seg.id);
    setSegForm({ condominio_id: seg.condominio_id || '', tipologia: seg.tipologia || '', descrizione: seg.descrizione || '', urgenza: seg.urgenza || 'Media', note_admin: seg.note_admin || '' });
    if (seg.allegati_dettagli?.length > 0) {
      setSegMediaFiles(seg.allegati_dettagli.map((f: any) => ({
        uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/files/${f.id}/${encodeURIComponent(f.filename)}`,
        filename: f.filename,
        mimeType: f.content_type,
        size: f.size,
        type: f.content_type?.startsWith('image/') ? 'image' : f.content_type?.startsWith('video/') ? 'video' : 'pdf',
        uploadedId: f.id,
      })));
    } else { setSegMediaFiles([]); }
    setModalSeg(null); setShowNewSegModal(true);
  };

  const pickSegImage = async (useCamera: boolean) => {
    if (segMediaFiles.length >= 10) { Alert.alert('Limite raggiunto', 'Puoi allegare massimo 10 file'); return; }
    const permission = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permesso negato', 'Concedi i permessi'); return; }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images', 'videos'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 - segMediaFiles.length, mediaTypes: ['images', 'videos'] });
    if (result.canceled) return;
    const newFiles: MediaFile[] = result.assets.map(asset => ({ uri: asset.uri, filename: asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`, mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), size: asset.fileSize, type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video' }));
    setSegMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
  };

  const pickSegDocument = async () => {
    if (segMediaFiles.length >= 10) { Alert.alert('Limite raggiunto', 'Max 10 file'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const newFiles: MediaFile[] = result.assets.map(asset => ({ uri: asset.uri, filename: asset.name || `doc_${Date.now()}.pdf`, mimeType: asset.mimeType || 'application/pdf', size: asset.size, type: 'pdf' as const }));
      setSegMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
    } catch { Alert.alert('Errore', 'Impossibile selezionare il documento'); }
  };

  const formatFileSize = (bytes?: number): string => { if (!bytes) return ''; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };
  const getFileIcon = (type: string) => { switch (type) { case 'image': return 'image'; case 'video': return 'videocam'; case 'pdf': return 'document-text'; default: return 'attach'; } };
  const getFileColor = (type: string) => { switch (type) { case 'image': return '#3B82F6'; case 'video': return '#8B5CF6'; case 'pdf': return '#EF4444'; default: return Colors.textMuted; } };

  const handleSaveSegnalazione = async () => {
    if (!segForm.condominio_id || !segForm.tipologia || !segForm.descrizione.trim()) { Alert.alert('Attenzione', 'Compila tutti i campi obbligatori'); return; }
    setSaving(true);
    try {
      const allegatiIds: string[] = [];
      const filesToUpload = segMediaFiles.filter(f => !f.uploadedId);
      const existingIds = segMediaFiles.filter(f => f.uploadedId).map(f => f.uploadedId!);
      if (filesToUpload.length > 0) {
        setSegUploadProgress(`Caricamento file 0/${filesToUpload.length}...`);
        for (let i = 0; i < filesToUpload.length; i++) {
          setSegUploadProgress(`Caricamento file ${i + 1}/${filesToUpload.length}...`);
          try { const uploaded = await api.uploadFile(token, filesToUpload[i].uri, filesToUpload[i].filename, filesToUpload[i].mimeType); allegatiIds.push(uploaded.id); } catch (e: any) { console.warn(`Upload fail ${filesToUpload[i].filename}:`, e); }
        }
        setSegUploadProgress('');
      }
      const allAllegati = [...existingIds, ...allegatiIds];
      if (isEditingSeg && editingSegId) {
        await api.updateAdminSeg(token, editingSegId, { tipologia: segForm.tipologia, descrizione: segForm.descrizione, urgenza: segForm.urgenza, note_admin: segForm.note_admin, allegati: allAllegati });
        Alert.alert('Salvato', 'Segnalazione aggiornata');
      } else {
        const result = await api.createAdminSegnalazione(token, { condominio_id: segForm.condominio_id, tipologia: segForm.tipologia, descrizione: segForm.descrizione, urgenza: segForm.urgenza, note_admin: segForm.note_admin, allegati: allAllegati });
        Alert.alert('Creata', `Segnalazione creata.\nProtocollo: ${result.protocollo}`);
      }
      setShowNewSegModal(false); resetSegForm(); onRefresh();
    } catch (e: any) { Alert.alert('Errore', e.message); } finally { setSaving(false); setSegUploadProgress(''); }
  };

  const assegnaFornitoreHandler = async () => {
    if (!assegnaFornForm.fornitore_id) { Alert.alert('Attenzione', 'Seleziona un fornitore'); return; }
    try { await api.assegnaFornitore(token, showAssegnaFornModal.id, assegnaFornForm); setShowAssegnaFornModal(null); Alert.alert('Assegnato', 'Fornitore assegnato'); onRefresh(); }
    catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const chiudiSegnalazione = (segId: string) => {
    Alert.alert('Chiudi Segnalazione', 'Confermi?', [{ text: 'Annulla' }, { text: 'Chiudi', onPress: async () => { try { await api.chiudiSegnalazione(token, segId); onRefresh(); setModalSeg(null); } catch (e: any) { Alert.alert('Errore', e.message); } } }]);
  };

  const riapriSegnalazione = (segId: string) => {
    Alert.alert('Richiedi nuovo intervento', 'Vuoi richiedere un ulteriore intervento?', [{ text: 'Annulla' }, { text: 'Richiedi', onPress: async () => { try { await api.riapriSegnalazione(token, segId); onRefresh(); setModalSeg(null); } catch (e: any) { Alert.alert('Errore', e.message); } } }]);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity testID="admin-new-seg-btn" style={[s.addBtn, { backgroundColor: '#D97706' }]} onPress={openNewSegModal}>
        <Ionicons name="add" size={22} color={Colors.white} /><Text style={s.addBtnText}>Nuova Segnalazione</Text>
      </TouchableOpacity>
      <FlatList data={segnalazioni} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={<Text style={s.emptyText}>Nessuna segnalazione</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity testID={`admin-seg-${item.id}`} style={s.listCard} onPress={() => loadSegDetail(item.id)}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: '#FEF3C7' }]}><Ionicons name="warning" size={18} color="#D97706" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.tipologia}</Text>
                <Text style={s.listSub2}>{item.user_nome} • {item.condominio_nome}</Text>
                <Text style={s.listMeta}>{new Date(item.created_at).toLocaleDateString('it-IT')} • Urgenza: {item.urgenza}{item.allegati?.length > 0 ? ` • ${item.allegati.length} allegati` : ''}</Text>
              </View>
              <StatusBadge status={item.stato} />
            </View>
          </TouchableOpacity>
        )} />

      {/* Modal: Dettaglio Segnalazione */}
      <Modal visible={!!modalSeg} transparent animationType="slide" onRequestClose={() => setModalSeg(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Aggiorna Segnalazione</Text>
            <Text style={s.modalSub}>{modalSeg?.tipologia} — {modalSeg?.user_nome}</Text>
            <Text style={s.modalDesc}>{modalSeg?.descrizione}</Text>
            {modalSeg?.allegati_dettagli?.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.modalLabel}>Allegati ({modalSeg.allegati_dettagli.length}):</Text>
                {modalSeg.allegati_dettagli.map((file: any, idx: number) => {
                  const isImage = file.content_type?.startsWith('image/');
                  return (
                    <TouchableOpacity key={idx} onPress={() => openFile(file)} style={s.attachRow}>
                      {isImage ? <Image source={api.getFileSource(token, file.id, file.filename)} style={s.attachThumb} /> : <View style={[s.attachIcon, { backgroundColor: file.content_type === 'application/pdf' ? '#FEE2E2' : '#F3E8FF' }]}><Ionicons name={file.content_type === 'application/pdf' ? 'document-text' : 'videocam'} size={20} color={file.content_type === 'application/pdf' ? '#DC2626' : '#7C3AED'} /></View>}
                      <View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontSize: 13, fontWeight: '500', color: Colors.textMain }} numberOfLines={1}>{file.filename}</Text><Text style={{ fontSize: 11, color: Colors.textMuted }}>{file.content_type} • {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}</Text></View>
                      <Ionicons name="open-outline" size={18} color={Colors.sky} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <Text style={s.modalLabel}>Cambia stato:</Text>
            {['Presa in carico', 'In lavorazione', 'Risolta'].map(st => (
              <TouchableOpacity key={st} testID={`seg-status-${st}`} style={[s.statusBtn, modalSeg?.stato === st && { backgroundColor: '#E0F2FE' }]} onPress={() => updateSeg(modalSeg.id, st)}><Text style={s.statusBtnText}>{st}</Text></TouchableOpacity>
            ))}
            {!modalSeg?.fornitore_id && (
              <TouchableOpacity style={[s.statusBtn, { borderColor: '#EA580C', marginTop: 8 }]} onPress={() => { setModalSeg(null); setShowAssegnaFornModal(modalSeg); setAssegnaFornForm({ fornitore_id: '', note_admin: '', data_prevista: '' }); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ionicons name="construct-outline" size={18} color="#EA580C" /><Text style={[s.statusBtnText, { color: '#EA580C', fontWeight: '700' }]}>Assegna Fornitore</Text></View>
              </TouchableOpacity>
            )}
            {modalSeg?.fornitore_id && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFEDD5', borderRadius: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#7C2D12' }}>Fornitore: {modalSeg.fornitore_nome}</Text>
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Stato: {modalSeg.stato}</Text>
                {modalSeg.stato === 'Intervento completato' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={{ flex: 1, padding: 10, backgroundColor: '#16A34A', borderRadius: 8, alignItems: 'center' }} onPress={() => chiudiSegnalazione(modalSeg.id)}><Text style={{ color: Colors.white, fontWeight: '600', fontSize: 13 }}>Chiudi</Text></TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, padding: 10, backgroundColor: '#D97706', borderRadius: 8, alignItems: 'center' }} onPress={() => riapriSegnalazione(modalSeg.id)}><Text style={{ color: Colors.white, fontWeight: '600', fontSize: 13 }}>Nuovo intervento</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            {modalSeg && modalSeg.stato !== 'Risolta' && (
              <TouchableOpacity style={[s.statusBtn, { borderColor: '#3B82F6', marginTop: 12, backgroundColor: '#EFF6FF' }]} onPress={() => openEditSegModal(modalSeg)} testID="edit-seg-btn">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Ionicons name="create-outline" size={18} color="#3B82F6" /><Text style={[s.statusBtnText, { color: '#3B82F6', fontWeight: '700' }]}>Modifica Segnalazione</Text></View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalSeg(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Nuova/Modifica Segnalazione */}
      <Modal visible={showNewSegModal} transparent animationType="slide" onRequestClose={() => { setShowNewSegModal(false); resetSegForm(); }}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>{isEditingSeg ? 'Modifica Segnalazione' : 'Nuova Segnalazione'}</Text>
            {isEditingSeg && <Text style={s.modalSub}>Modifica i dettagli della segnalazione</Text>}
            {!isEditingSeg && <PickerSelect label="Condominio *" value={condomini.find(c => c.id === segForm.condominio_id)?.nome || ''} options={condomini.map(c => c.nome)} onSelect={v => { const c = condomini.find(c2 => c2.nome === v); if (c) setSegForm(p => ({ ...p, condominio_id: c.id })); }} testID="seg-new-cond-picker" />}
            <PickerSelect label="Tipologia *" value={segForm.tipologia} options={TIPOLOGIE} onSelect={v => setSegForm(p => ({ ...p, tipologia: v }))} testID="seg-new-tipo-picker" />
            <View style={s.inputGroup}><Text style={s.inputLabel}>Descrizione *</Text><TextInput testID="seg-new-desc-input" style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Descrivi il problema..." value={segForm.descrizione} onChangeText={v => setSegForm(p => ({ ...p, descrizione: v }))} multiline placeholderTextColor={Colors.textMuted} /></View>
            <PickerSelect label="Urgenza" value={segForm.urgenza} options={URGENZE} onSelect={v => setSegForm(p => ({ ...p, urgenza: v }))} testID="seg-new-urgenza-picker" />
            <View style={s.inputGroup}><Text style={s.inputLabel}>Note Admin (uso interno)</Text><TextInput testID="seg-new-note-input" style={[s.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Note visibili solo all'admin..." value={segForm.note_admin} onChangeText={v => setSegForm(p => ({ ...p, note_admin: v }))} multiline placeholderTextColor={Colors.textMuted} /></View>
            <View style={s.mediaSection}>
              <Text style={s.mediaSectionTitle}>Allegati (foto, video, documenti)</Text>
              <Text style={s.mediaSectionHint}>Puoi allegare fino a 10 file. Max 50MB per file.</Text>
              <View style={s.mediaButtons}>
                <TouchableOpacity testID="seg-new-camera-btn" style={s.mediaBtn} onPress={() => pickSegImage(true)}><View style={[s.mediaBtnIcon, { backgroundColor: '#DBEAFE' }]}><Ionicons name="camera" size={22} color="#2563EB" /></View><Text style={s.mediaBtnLabel}>Fotocamera</Text></TouchableOpacity>
                <TouchableOpacity testID="seg-new-gallery-btn" style={s.mediaBtn} onPress={() => pickSegImage(false)}><View style={[s.mediaBtnIcon, { backgroundColor: '#F3E8FF' }]}><Ionicons name="images" size={22} color="#7C3AED" /></View><Text style={s.mediaBtnLabel}>Galleria</Text></TouchableOpacity>
                <TouchableOpacity testID="seg-new-pdf-btn" style={s.mediaBtn} onPress={pickSegDocument}><View style={[s.mediaBtnIcon, { backgroundColor: '#FEE2E2' }]}><Ionicons name="document-text" size={22} color="#DC2626" /></View><Text style={s.mediaBtnLabel}>PDF</Text></TouchableOpacity>
              </View>
              {segMediaFiles.length > 0 && <View style={s.filesList}><Text style={s.filesCount}>{segMediaFiles.length}/10 file selezionati</Text>
                {segMediaFiles.map((file, index) => (
                  <View key={index} style={s.fileItem}>
                    {file.type === 'image' ? <Image source={{ uri: file.uri }} style={s.fileThumbnail} /> : <View style={[s.fileIconWrap, { backgroundColor: getFileColor(file.type) + '15' }]}><Ionicons name={getFileIcon(file.type) as any} size={22} color={getFileColor(file.type)} /></View>}
                    <View style={s.fileInfo}><Text style={s.fileName} numberOfLines={1}>{file.filename}</Text><View style={s.fileMetaRow}><Text style={s.fileMeta}>{file.type === 'image' ? 'Foto' : file.type === 'video' ? 'Video' : 'PDF'}{file.size ? ` • ${formatFileSize(file.size)}` : ''}{file.uploadedId ? ' (già caricato)' : ''}</Text></View></View>
                    <TouchableOpacity testID={`seg-new-remove-file-${index}`} onPress={() => setSegMediaFiles(prev => prev.filter((_, i) => i !== index))} style={s.removeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="close-circle" size={24} color={Colors.error} /></TouchableOpacity>
                  </View>
                ))}
              </View>}
            </View>
            {segUploadProgress ? <View style={s.progressBar}><ActivityIndicator size="small" color={Colors.navy} /><Text style={s.progressText}>{segUploadProgress}</Text></View> : null}
            <PrimaryButton title={saving ? (isEditingSeg ? 'Salvataggio...' : 'Creazione...') : (isEditingSeg ? 'Salva Modifiche' : 'Crea Segnalazione')} onPress={handleSaveSegnalazione} loading={saving} testID="seg-new-submit-btn" style={{ backgroundColor: '#D97706' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowNewSegModal(false); resetSegForm(); }}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Assegna Fornitore */}
      <Modal visible={!!showAssegnaFornModal} transparent animationType="slide" onRequestClose={() => setShowAssegnaFornModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Assegna Fornitore</Text>
            <Text style={s.modalSub}>{showAssegnaFornModal?.tipologia} — {showAssegnaFornModal?.condominio_nome}</Text>
            <PickerSelect label="Fornitore *" value={fornitori.find(f => f.id === assegnaFornForm.fornitore_id)?.ragione_sociale || ''} options={fornitori.filter(f => f.stato === 'Attivo').map(f => f.ragione_sociale)} onSelect={v => { const f = fornitori.find(f2 => f2.ragione_sociale === v); if (f) setAssegnaFornForm(p => ({ ...p, fornitore_id: f.id })); }} testID="assegna-forn-picker" />
            <ConfigField testID="assegna-note" label="Note per il fornitore" value={assegnaFornForm.note_admin} placeholder="Istruzioni specifiche..." onChange={(v: string) => setAssegnaFornForm(p => ({ ...p, note_admin: v }))} multiline />
            <ConfigField testID="assegna-data" label="Data prevista intervento" value={assegnaFornForm.data_prevista} placeholder="Es: 20/03/2026" onChange={(v: string) => setAssegnaFornForm(p => ({ ...p, data_prevista: v }))} />
            <PrimaryButton title="Assegna" onPress={assegnaFornitoreHandler} testID="assegna-forn-btn" style={{ backgroundColor: '#EA580C' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAssegnaFornModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
