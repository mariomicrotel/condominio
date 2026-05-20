import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, Modal, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerSelect, PrimaryButton, ConfigField } from '../SharedComponents';
import { s } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { VoiceRecorder } from '../VoiceRecorder';

interface MediaFile { uri: string; filename: string; mimeType: string; size?: number; type: 'image' | 'video' | 'pdf'; uploadedId?: string; }

const MOTIVI_SOPRALLUOGO = ['Controllo periodico', 'Verifica post-intervento', 'Sopralluogo su segnalazione', 'Perizia', 'Altro'];
const GRAVITA_OPTIONS = ['Lieve', 'Moderata', 'Grave', 'Urgente'];
const VALUTAZIONI = ['Buono', 'Discreto', 'Sufficiente', 'Critico'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];

const getSemaforoColor = (stato: string) => { switch (stato) { case 'ok': return '#22C55E'; case 'anomalia': return '#F59E0B'; default: return '#9CA3AF'; } };
const getSemaforoIcon = (stato: string) => { switch (stato) { case 'ok': return 'checkmark-circle'; case 'anomalia': return 'alert-circle'; default: return 'ellipse-outline'; } };

interface Props {
  token: string;
  sopralluoghi: any[];
  condomini: any[];
  collaboratori: any[];
  fornitori: any[];
  onRefresh: () => void;
}

export default function SopralluoghiTab({ token, sopralluoghi, condomini, collaboratori, fornitori, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [showNewSopralluogo, setShowNewSopralluogo] = useState(false);
  const [showSopralluogoDetail, setShowSopralluogoDetail] = useState<any>(null);
  const [sopralluogoForm, setSopralluogoForm] = useState({ condominio_id: '', data: '', ora_inizio: '', motivo: 'Controllo periodico', note_generali: '', collaboratore_id: '' });
  const [showNewCollaboratore, setShowNewCollaboratore] = useState(false);
  const [collabForm, setCollabForm] = useState({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' });
  // Anomalia state
  const [showAnomaliaModal, setShowAnomaliaModal] = useState<any>(null);
  const [anomaliaForm, setAnomaliaForm] = useState({ descrizione: '', gravita: 'Moderata', foto_ids: [] as string[], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' });
  const [anomaliaPhotos, setAnomaliaPhotos] = useState<MediaFile[]>([]);
  const [anomaliaVoiceNotes, setAnomaliaVoiceNotes] = useState<{ uri: string; filename: string; duration: number; uploadedId?: string }[]>([]);
  const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
  const [playingVoiceNoteIndex, setPlayingVoiceNoteIndex] = useState<number | null>(null);
  const [voiceNoteSound, setVoiceNoteSound] = useState<any>(null);
  const [anomaliaSaving, setAnomaliaSaving] = useState(false);
  const [anomaliaError, setAnomaliaError] = useState<string | null>(null);

  const resetSopralluogoForm = () => setSopralluogoForm({ condominio_id: '', data: new Date().toISOString().split('T')[0], ora_inizio: '', motivo: 'Controllo periodico', note_generali: '', collaboratore_id: '' });

  const createSopralluogoHandler = async () => {
    if (!sopralluogoForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    setLoading(true);
    try {
      const result = await api.createSopralluogo(token, { condominio_id: sopralluogoForm.condominio_id, data: sopralluogoForm.data || new Date().toISOString().split('T')[0], ora_inizio: sopralluogoForm.ora_inizio || new Date().toTimeString().slice(0, 5), motivo: sopralluogoForm.motivo, note_generali: sopralluogoForm.note_generali, collaboratore_id: sopralluogoForm.collaboratore_id || undefined });
      setShowNewSopralluogo(false); resetSopralluogoForm(); onRefresh();
      const full = await api.getSopralluogo(token, result.id); setShowSopralluogoDetail(full);
      Alert.alert('Creato', 'Sopralluogo avviato! Compila la checklist.');
    } catch (e: any) { Alert.alert('Errore', e.message); } finally { setLoading(false); }
  };

  const loadSopralluogoDetail = async (id: string) => {
    setLoading(true);
    try { const full = await api.getSopralluogo(token, id); setShowSopralluogoDetail(full); }
    catch (e: any) { Alert.alert('Errore', e.message); } finally { setLoading(false); }
  };

  const updateChecklistItemHandler = async (sopId: string, itemId: string, stato: string) => {
    if (stato === 'anomalia') {
      const checklist = showSopralluogoDetail?.checklist || [];
      const foundItem = checklist.find((c: any) => c.id === itemId);
      if (foundItem) {
        setAnomaliaForm({ descrizione: '', gravita: 'Moderata', foto_ids: [], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' });
        setAnomaliaPhotos([]); setAnomaliaVoiceNotes([]); setVoiceRecorderKey(prev => prev + 1); setAnomaliaError(null);
        const sopralluogoData = { ...showSopralluogoDetail };
        setShowSopralluogoDetail(null);
        setTimeout(() => { setShowAnomaliaModal({ sopralluogo: sopralluogoData, item: foundItem, isNew: true }); }, 100);
      }
      return;
    }
    try { await api.updateChecklistItem(token, sopId, itemId, stato); const full = await api.getSopralluogo(token, sopId); setShowSopralluogoDetail(full); }
    catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const saveAnomaliaHandler = async () => {
    setAnomaliaError(null);
    if (!anomaliaForm.descrizione.trim()) { setAnomaliaError("Inserisci una descrizione per l'anomalia"); return; }
    if (anomaliaForm.apri_segnalazione && !anomaliaForm.fornitore_id) { setAnomaliaError('Seleziona un fornitore per aprire la segnalazione'); return; }
    setAnomaliaSaving(true);
    try {
      const sopId = showAnomaliaModal?.sopralluogo?.id;
      const itemId = showAnomaliaModal?.item?.id;
      if (!sopId || !itemId) { setAnomaliaError('Dati sopralluogo non validi. Chiudi e riprova.'); return; }
      const fotoIds: string[] = [];
      for (const photo of anomaliaPhotos) { if (!photo.uploadedId) { const uploaded = await api.uploadFile(token, photo.uri, photo.filename, photo.mimeType); fotoIds.push(uploaded.id); } else { fotoIds.push(photo.uploadedId); } }
      const voiceNoteIds: string[] = [];
      for (const vn of anomaliaVoiceNotes) { if (!vn.uploadedId) { const uploaded = await api.uploadFile(token, vn.uri, vn.filename, 'audio/x-m4a'); voiceNoteIds.push(uploaded.id); } else { voiceNoteIds.push(vn.uploadedId); } }
      if (showAnomaliaModal.isNew) { await api.updateChecklistItem(token, sopId, itemId, 'anomalia'); }
      await api.createAnomalia(token, sopId, itemId, { descrizione: anomaliaForm.descrizione, gravita: anomaliaForm.gravita, foto_ids: fotoIds, nota_vocale_ids: voiceNoteIds, apri_segnalazione: anomaliaForm.apri_segnalazione, fornitore_id: anomaliaForm.fornitore_id || undefined, tipologia_intervento: anomaliaForm.tipologia_intervento || undefined, urgenza_segnalazione: anomaliaForm.urgenza_segnalazione || undefined, note_fornitore: anomaliaForm.note_fornitore || undefined });
      const savedSopId = sopId;
      setShowAnomaliaModal(null); setAnomaliaVoiceNotes([]); setAnomaliaError(null);
      try { const full = await api.getSopralluogo(token, savedSopId); setShowSopralluogoDetail(full); } catch { onRefresh(); }
      Alert.alert('Salvato', anomaliaForm.apri_segnalazione ? 'Anomalia salvata e segnalazione creata!' : 'Anomalia salvata con successo');
      onRefresh();
    } catch (e: any) { setAnomaliaError(e?.message || 'Errore durante il salvataggio'); } finally { setAnomaliaSaving(false); }
  };

  const closeAnomaliaModal = async () => {
    const sopId = showAnomaliaModal?.sopralluogo?.id;
    setShowAnomaliaModal(null); setAnomaliaVoiceNotes([]); setAnomaliaError(null);
    if (voiceNoteSound) { await voiceNoteSound.unloadAsync(); setVoiceNoteSound(null); }
    setPlayingVoiceNoteIndex(null);
    if (sopId) { try { const full = await api.getSopralluogo(token, sopId); setShowSopralluogoDetail(full); } catch { onRefresh(); } }
  };

  const playVoiceNote = async (uri: string, index: number) => {
    try {
      if (playingVoiceNoteIndex === index && voiceNoteSound) { await voiceNoteSound.stopAsync(); await voiceNoteSound.unloadAsync(); setVoiceNoteSound(null); setPlayingVoiceNoteIndex(null); return; }
      if (voiceNoteSound) { await voiceNoteSound.stopAsync(); await voiceNoteSound.unloadAsync(); }
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status: any) => { if (status.didJustFinish) { setPlayingVoiceNoteIndex(null); setVoiceNoteSound(null); } });
      setVoiceNoteSound(sound); setPlayingVoiceNoteIndex(index);
    } catch { Alert.alert('Errore', 'Impossibile riprodurre la nota vocale'); }
  };

  const closeSopralluogoHandler = (sopId: string, valutazione: string, note: string) => {
    Alert.alert('Completare Sopralluogo?', 'Una volta completato non potrai più modificare la checklist.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Completa', onPress: async () => {
        setLoading(true);
        try { await api.closeSopralluogo(token, sopId, { valutazione, note_finali: note, ora_fine: new Date().toTimeString().slice(0, 5) }); setShowSopralluogoDetail(null); onRefresh(); Alert.alert('Completato', 'Sopralluogo chiuso'); }
        catch (e: any) { Alert.alert('Errore', e.message); } finally { setLoading(false); }
      }},
    ]);
  };

  const deleteSopralluogoHandler = (sopId: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare il sopralluogo di "${nome}"?`, [{ text: 'Annulla' }, { text: 'Elimina', style: 'destructive', onPress: async () => { try { await api.deleteSopralluogo(token, sopId); setShowSopralluogoDetail(null); onRefresh(); } catch (e: any) { Alert.alert('Errore', e.message); } } }]);
  };

  const pickAnomaliaPhoto = async () => {
    if (anomaliaPhotos.length >= 5) { Alert.alert('Limite raggiunto', 'Max 5 foto per anomalia'); return; }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permesso negato', 'Concedi permessi fotocamera'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAnomaliaPhotos(prev => [...prev, { uri: asset.uri, filename: asset.fileName || `anomalia_${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', size: asset.fileSize, type: 'image' }]);
  };

  const createCollaboratoreHandler = async () => {
    if (!collabForm.nome.trim() || !collabForm.cognome.trim() || !collabForm.email.trim() || !collabForm.password.trim()) { Alert.alert('Attenzione', 'Compila nome, cognome, email e password'); return; }
    setLoading(true);
    try { await api.createCollaboratore(token, collabForm); setShowNewCollaboratore(false); setCollabForm({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' }); onRefresh(); Alert.alert('Creato', 'Collaboratore aggiunto'); }
    catch (e: any) { Alert.alert('Errore', e.message); } finally { setLoading(false); }
  };

  const deleteCollaboratoreHandler = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [{ text: 'Annulla' }, { text: 'Elimina', style: 'destructive', onPress: async () => { try { await api.deleteCollaboratore(token, id); onRefresh(); } catch (e: any) { Alert.alert('Errore', e.message); } } }]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
        <TouchableOpacity testID="admin-new-sop-btn" style={[s.addBtn, { flex: 1, backgroundColor: '#7C3AED' }]} onPress={() => { resetSopralluogoForm(); setShowNewSopralluogo(true); }}>
          <Ionicons name="add" size={22} color={Colors.white} /><Text style={s.addBtnText}>Nuovo Sopralluogo</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="admin-new-collab-btn" style={[s.addBtn, { backgroundColor: '#6366F1', paddingHorizontal: 12 }]} onPress={() => setShowNewCollaboratore(true)}>
          <Ionicons name="person-add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
      {collaboratori.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Text style={s.secTitle}>Collaboratori ({collaboratori.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            {collaboratori.map(c => (
              <View key={c.id} style={{ backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginRight: 10, minWidth: 140, borderWidth: 1, borderColor: Colors.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textMain }}>{c.nome} {c.cognome}</Text>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.qualifica || 'Collaboratore'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}><Ionicons name="search-outline" size={12} color={Colors.textMuted} /><Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.sopralluoghi_count || 0} sopralluoghi</Text></View>
                <TouchableOpacity onPress={() => deleteCollaboratoreHandler(c.id, `${c.nome} ${c.cognome}`)} style={{ position: 'absolute', top: 8, right: 8 }}><Ionicons name="close-circle" size={18} color={Colors.error} /></TouchableOpacity>
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
              <View style={[s.iconCircle, { backgroundColor: '#EDE9FE' }]}><Ionicons name="search" size={18} color="#7C3AED" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.condominio_nome}</Text>
                <Text style={s.listSub2}>{item.eseguito_da} • {new Date(item.data).toLocaleDateString('it-IT')}</Text>
                <Text style={s.listMeta}>{item.motivo}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="checkmark-circle" size={14} color="#22C55E" /><Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>{item.checklist_ok || 0}</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="alert-circle" size={14} color="#F59E0B" /><Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>{item.checklist_anomalie || 0}</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="ellipse-outline" size={14} color="#9CA3AF" /><Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{item.checklist_non_controllato || 0}</Text></View>
                  {item.segnalazioni_create > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="warning" size={14} color="#DC2626" /><Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>{item.segnalazioni_create} seg.</Text></View>}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[s.badge, { backgroundColor: item.stato === 'completato' ? '#DCFCE7' : '#FEF3C7' }]}><Text style={{ fontSize: 10, fontWeight: '700', color: item.stato === 'completato' ? '#16A34A' : '#D97706' }}>{item.stato === 'completato' ? 'COMPLETATO' : 'IN CORSO'}</Text></View>
                {item.valutazione && <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 4 }}>{item.valutazione}</Text>}
              </View>
            </View>
          </TouchableOpacity>
        )} />

      {/* Modal: Nuovo Sopralluogo */}
      <Modal visible={showNewSopralluogo} transparent animationType="slide" onRequestClose={() => setShowNewSopralluogo(false)}>
        <View style={s.modalOverlay}><ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>Nuovo Sopralluogo</Text>
          <PickerSelect label="Condominio *" value={condomini.find(c => c.id === sopralluogoForm.condominio_id)?.nome || ''} options={condomini.map(c => c.nome)} onSelect={v => { const c = condomini.find(c2 => c2.nome === v); if (c) setSopralluogoForm(p => ({ ...p, condominio_id: c.id })); }} testID="sop-cond-picker" />
          <ConfigField testID="sop-data" label="Data" value={sopralluogoForm.data} placeholder="2026-03-14" onChange={(v: string) => setSopralluogoForm(p => ({ ...p, data: v }))} />
          <ConfigField testID="sop-ora" label="Ora Inizio" value={sopralluogoForm.ora_inizio} placeholder="09:30" onChange={(v: string) => setSopralluogoForm(p => ({ ...p, ora_inizio: v }))} />
          <PickerSelect label="Motivo" value={sopralluogoForm.motivo} options={MOTIVI_SOPRALLUOGO} onSelect={v => setSopralluogoForm(p => ({ ...p, motivo: v }))} testID="sop-motivo-picker" />
          {collaboratori.length > 0 && <PickerSelect label="Assegna a Collaboratore (opzionale)" value={collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.nome ? `${collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.nome} ${collaboratori.find(c => c.id === sopralluogoForm.collaboratore_id)?.cognome}` : ''} options={['', ...collaboratori.map(c => `${c.nome} ${c.cognome}`)]} onSelect={v => { const c = collaboratori.find(c2 => `${c2.nome} ${c2.cognome}` === v); setSopralluogoForm(p => ({ ...p, collaboratore_id: c?.id || '' })); }} testID="sop-collab-picker" />}
          <ConfigField testID="sop-note" label="Note Generali" value={sopralluogoForm.note_generali} placeholder="Note sul sopralluogo..." onChange={(v: string) => setSopralluogoForm(p => ({ ...p, note_generali: v }))} multiline />
          <PrimaryButton title="Avvia Sopralluogo" onPress={createSopralluogoHandler} loading={loading} testID="sop-create-btn" style={{ backgroundColor: '#7C3AED' }} />
          <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewSopralluogo(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>

      {/* Modal: Nuovo Collaboratore */}
      <Modal visible={showNewCollaboratore} transparent animationType="slide" onRequestClose={() => setShowNewCollaboratore(false)}>
        <View style={s.modalOverlay}><ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>Nuovo Collaboratore</Text>
          <ConfigField testID="collab-nome" label="Nome *" value={collabForm.nome} placeholder="Mario" onChange={(v: string) => setCollabForm(p => ({ ...p, nome: v }))} />
          <ConfigField testID="collab-cognome" label="Cognome *" value={collabForm.cognome} placeholder="Rossi" onChange={(v: string) => setCollabForm(p => ({ ...p, cognome: v }))} />
          <ConfigField testID="collab-email" label="Email *" value={collabForm.email} placeholder="mario@studio.it" onChange={(v: string) => setCollabForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
          <ConfigField testID="collab-password" label="Password *" value={collabForm.password} placeholder="••••••••" onChange={(v: string) => setCollabForm(p => ({ ...p, password: v }))} />
          <ConfigField testID="collab-telefono" label="Telefono" value={collabForm.telefono} placeholder="+39 333 1234567" onChange={(v: string) => setCollabForm(p => ({ ...p, telefono: v }))} />
          <ConfigField testID="collab-qualifica" label="Qualifica" value={collabForm.qualifica} placeholder="Geometra, Tecnico, etc." onChange={(v: string) => setCollabForm(p => ({ ...p, qualifica: v }))} />
          <PrimaryButton title="Crea Collaboratore" onPress={createCollaboratoreHandler} loading={loading} testID="collab-create-btn" style={{ backgroundColor: '#6366F1' }} />
          <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewCollaboratore(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>

      {/* Modal: Dettaglio Sopralluogo */}
      <Modal visible={!!showSopralluogoDetail} transparent animationType="slide" onRequestClose={() => setShowSopralluogoDetail(null)}>
        <View style={s.modalOverlay}><ScrollView style={[s.modal, { maxHeight: '95%' }]} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}><Text style={s.modalTitle}>{showSopralluogoDetail?.condominio_nome}</Text><Text style={s.modalSub}>{showSopralluogoDetail?.condominio_indirizzo}</Text></View>
            <View style={[s.badge, { backgroundColor: showSopralluogoDetail?.stato === 'completato' ? '#DCFCE7' : '#FEF3C7' }]}><Text style={{ fontSize: 10, fontWeight: '700', color: showSopralluogoDetail?.stato === 'completato' ? '#16A34A' : '#D97706' }}>{showSopralluogoDetail?.stato === 'completato' ? 'COMPLETATO' : 'IN CORSO'}</Text></View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="calendar-outline" size={14} color={Colors.textMuted} /><Text style={{ fontSize: 12, color: Colors.textSec }}>{new Date(showSopralluogoDetail?.data || '').toLocaleDateString('it-IT')}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="time-outline" size={14} color={Colors.textMuted} /><Text style={{ fontSize: 12, color: Colors.textSec }}>{showSopralluogoDetail?.ora_inizio || '--:--'} - {showSopralluogoDetail?.ora_fine || 'in corso'}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="person-outline" size={14} color={Colors.textMuted} /><Text style={{ fontSize: 12, color: Colors.textSec }}>{showSopralluogoDetail?.eseguito_da}</Text></View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <View style={{ alignItems: 'center' }}><Ionicons name="checkmark-circle" size={28} color="#22C55E" /><Text style={{ fontSize: 18, fontWeight: '700', color: '#22C55E', marginTop: 4 }}>{showSopralluogoDetail?.checklist_ok || 0}</Text><Text style={{ fontSize: 10, color: Colors.textMuted }}>OK</Text></View>
            <View style={{ alignItems: 'center' }}><Ionicons name="alert-circle" size={28} color="#F59E0B" /><Text style={{ fontSize: 18, fontWeight: '700', color: '#F59E0B', marginTop: 4 }}>{showSopralluogoDetail?.checklist_anomalie || 0}</Text><Text style={{ fontSize: 10, color: Colors.textMuted }}>Anomalie</Text></View>
            <View style={{ alignItems: 'center' }}><Ionicons name="ellipse-outline" size={28} color="#9CA3AF" /><Text style={{ fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginTop: 4 }}>{showSopralluogoDetail?.checklist_non_controllato || 0}</Text><Text style={{ fontSize: 10, color: Colors.textMuted }}>Non controllato</Text></View>
          </View>
          <Text style={[s.secTitle, { marginBottom: 12 }]}>Checklist ({showSopralluogoDetail?.checklist?.length || 0} voci)</Text>
          {showSopralluogoDetail?.checklist?.map((item: any) => (
            <View key={item.id} style={{ backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                  <Ionicons name={getSemaforoIcon(item.stato) as any} size={24} color={getSemaforoColor(item.stato)} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.textMain, flex: 1 }}>{item.voce}</Text>
                </View>
                {showSopralluogoDetail?.stato === 'in_corso' && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity testID={`checklist-ok-${item.id}`} onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'ok')} style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'ok' ? { backgroundColor: '#22C55E' } : { backgroundColor: '#22C55E20' }]}><Ionicons name="checkmark" size={18} color={item.stato === 'ok' ? Colors.white : '#22C55E'} /></TouchableOpacity>
                    <TouchableOpacity testID={`checklist-anomalia-${item.id}`} onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'anomalia')} style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'anomalia' ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#F59E0B20' }]}><Ionicons name="alert" size={18} color={item.stato === 'anomalia' ? Colors.white : '#F59E0B'} /></TouchableOpacity>
                    <TouchableOpacity testID={`checklist-nc-${item.id}`} onPress={() => updateChecklistItemHandler(showSopralluogoDetail.id, item.id, 'non_controllato')} style={[{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, item.stato === 'non_controllato' ? { backgroundColor: '#9CA3AF' } : { backgroundColor: '#9CA3AF20' }]}><Ionicons name="remove" size={18} color={item.stato === 'non_controllato' ? Colors.white : '#9CA3AF'} /></TouchableOpacity>
                  </View>
                )}
              </View>
              {item.anomalia && (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>Anomalia: {item.anomalia.gravita}</Text>
                  <Text style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>{item.anomalia.descrizione}</Text>
                  {item.anomalia.foto_dettagli?.length > 0 && <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{item.anomalia.foto_dettagli.map((f: any, idx: number) => <Image key={idx} source={{ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}` }} style={{ width: 50, height: 50, borderRadius: 6 }} />)}</View>}
                  {item.anomalia.segnalazione_protocollo && <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}><Ionicons name="warning" size={14} color="#DC2626" /><Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Segnalazione: {item.anomalia.segnalazione_protocollo}</Text></View>}
                  {showSopralluogoDetail?.stato === 'in_corso' && (
                    <TouchableOpacity onPress={() => {
                      const sopData = { ...showSopralluogoDetail }; const itemData = { ...item };
                      const formData = { descrizione: item.anomalia.descrizione || '', gravita: item.anomalia.gravita || 'Moderata', foto_ids: item.anomalia.foto_ids || [], apri_segnalazione: false, fornitore_id: '', tipologia_intervento: '', urgenza_segnalazione: '', note_fornitore: '' };
                      const photoData = item.anomalia.foto_dettagli?.map((f: any) => ({ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}`, filename: f.filename, mimeType: f.content_type, type: 'image' as const, uploadedId: f.id })) || [];
                      setShowSopralluogoDetail(null); setAnomaliaError(null);
                      setTimeout(() => { setShowAnomaliaModal({ sopralluogo: sopData, item: itemData, isNew: false }); setAnomaliaForm(formData); setAnomaliaPhotos(photoData); }, 100);
                    }} style={{ marginTop: 8, padding: 8, backgroundColor: '#FCD34D', borderRadius: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#78350F' }}>Modifica Anomalia</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
          {showSopralluogoDetail?.stato === 'in_corso' && (
            <View style={{ marginTop: 16 }}>
              <Text style={[s.secTitle, { marginBottom: 8 }]}>Chiudi Sopralluogo</Text>
              <PickerSelect label="Valutazione Generale" value={showSopralluogoDetail?.valutazione_temp || 'Discreto'} options={VALUTAZIONI} onSelect={v => setShowSopralluogoDetail((p: any) => ({ ...p, valutazione_temp: v }))} testID="sop-valutazione-picker" />
              <ConfigField testID="sop-note-finali" label="Note Finali" value={showSopralluogoDetail?.note_finali_temp || ''} placeholder="Note conclusive..." onChange={(v: string) => setShowSopralluogoDetail((p: any) => ({ ...p, note_finali_temp: v }))} multiline />
              <PrimaryButton title="Completa Sopralluogo" onPress={() => closeSopralluogoHandler(showSopralluogoDetail.id, showSopralluogoDetail.valutazione_temp || 'Discreto', showSopralluogoDetail.note_finali_temp || '')} loading={loading} testID="sop-close-btn" style={{ backgroundColor: '#16A34A' }} />
            </View>
          )}
          <TouchableOpacity style={{ marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} onPress={() => deleteSopralluogoHandler(showSopralluogoDetail?.id, showSopralluogoDetail?.condominio_nome)}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Elimina Sopralluogo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={() => setShowSopralluogoDetail(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>

      {/* Modal: Anomalia */}
      <Modal visible={!!showAnomaliaModal} transparent animationType="slide" onRequestClose={closeAnomaliaModal}>
        <View style={s.modalOverlay}><ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>Anomalia: {showAnomaliaModal?.item?.voce}</Text>
          <ConfigField testID="anomalia-desc" label="Descrizione *" value={anomaliaForm.descrizione} placeholder="Descrivi l'anomalia rilevata..." onChange={(v: string) => setAnomaliaForm(p => ({ ...p, descrizione: v }))} multiline />
          <PickerSelect label="Gravità" value={anomaliaForm.gravita} options={GRAVITA_OPTIONS} onSelect={v => setAnomaliaForm(p => ({ ...p, gravita: v }))} testID="anomalia-gravita-picker" />
          <Text style={[s.configLabel, { marginTop: 12 }]}>Foto ({anomaliaPhotos.length}/5)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {anomaliaPhotos.map((photo, idx) => <View key={idx} style={{ position: 'relative' }}><Image source={{ uri: photo.uri }} style={{ width: 70, height: 70, borderRadius: 8 }} /><TouchableOpacity onPress={() => setAnomaliaPhotos(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -6, right: -6 }}><Ionicons name="close-circle" size={22} color={Colors.error} /></TouchableOpacity></View>)}
            {anomaliaPhotos.length < 5 && <TouchableOpacity onPress={pickAnomaliaPhoto} style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' }}><Ionicons name="camera" size={24} color={Colors.textMuted} /><Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>Foto</Text></TouchableOpacity>}
          </View>
          <Text style={[s.configLabel, { marginTop: 12 }]}>Note Vocali ({anomaliaVoiceNotes.length})</Text>
          <View style={{ marginTop: 8 }}>
            {anomaliaVoiceNotes.map((vn, idx) => <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginBottom: 8, gap: 10 }}>
              <TouchableOpacity onPress={() => playVoiceNote(vn.uri, idx)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: playingVoiceNoteIndex === idx ? '#DC2626' : Colors.sky, justifyContent: 'center', alignItems: 'center' }}><Ionicons name={playingVoiceNoteIndex === idx ? 'stop' : 'play'} size={16} color={Colors.white} /></TouchableOpacity>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '500', color: Colors.textMain }}>Nota {idx + 1}</Text><Text style={{ fontSize: 11, color: Colors.textMuted }}>{Math.floor(vn.duration / 60)}:{(vn.duration % 60).toString().padStart(2, '0')}</Text></View>
              <TouchableOpacity onPress={() => setAnomaliaVoiceNotes(prev => prev.filter((_, i) => i !== idx))}><Ionicons name="close-circle" size={22} color={Colors.error} /></TouchableOpacity>
            </View>)}
            <VoiceRecorder key={`voice-recorder-${voiceRecorderKey}`} label="" compact onRecordingComplete={(uri, filename, duration) => { setAnomaliaVoiceNotes(prev => [...prev, { uri, filename, duration }]); setVoiceRecorderKey(prev => prev + 1); }} onDeleteRecording={() => {}} />
            <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>Puoi aggiungere più note vocali</Text>
          </View>
          <View style={{ marginTop: 20, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 10 }}>
            <TouchableOpacity onPress={() => setAnomaliaForm(p => ({ ...p, apri_segnalazione: !p.apri_segnalazione }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D97706', justifyContent: 'center', alignItems: 'center', backgroundColor: anomaliaForm.apri_segnalazione ? '#D97706' : 'transparent' }}>{anomaliaForm.apri_segnalazione && <Ionicons name="checkmark" size={16} color={Colors.white} />}</View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>Apri segnalazione e assegna fornitore</Text>
            </TouchableOpacity>
            {anomaliaForm.apri_segnalazione && <View style={{ marginTop: 12 }}>
              <PickerSelect label="Fornitore *" value={fornitori.find(f => f.id === anomaliaForm.fornitore_id)?.ragione_sociale || ''} options={fornitori.filter(f => f.stato === 'Attivo').map(f => f.ragione_sociale)} onSelect={v => { const f = fornitori.find(f2 => f2.ragione_sociale === v); if (f) setAnomaliaForm(p => ({ ...p, fornitore_id: f.id })); }} testID="anomalia-forn-picker" />
              <ConfigField testID="anomalia-tipo" label="Tipologia Intervento" value={anomaliaForm.tipologia_intervento} placeholder="Es: Guasto idraulico" onChange={(v: string) => setAnomaliaForm(p => ({ ...p, tipologia_intervento: v }))} />
              <PickerSelect label="Urgenza" value={anomaliaForm.urgenza_segnalazione || 'Media'} options={URGENZE} onSelect={v => setAnomaliaForm(p => ({ ...p, urgenza_segnalazione: v }))} testID="anomalia-urgenza-picker" />
              <ConfigField testID="anomalia-note-forn" label="Note per il Fornitore" value={anomaliaForm.note_fornitore} placeholder="Istruzioni specifiche..." onChange={(v: string) => setAnomaliaForm(p => ({ ...p, note_fornitore: v }))} multiline />
            </View>}
          </View>
          {anomaliaError ? <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="alert-circle" size={20} color="#DC2626" /><Text style={{ flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' }}>{anomaliaError}</Text><TouchableOpacity onPress={() => setAnomaliaError(null)}><Ionicons name="close-circle" size={20} color="#DC2626" /></TouchableOpacity></View> : null}
          <PrimaryButton title={anomaliaSaving ? 'Salvataggio...' : 'Salva Anomalia'} onPress={saveAnomaliaHandler} loading={anomaliaSaving} testID="anomalia-save-btn" style={{ backgroundColor: '#F59E0B', marginTop: 16 }} />
          <TouchableOpacity style={s.closeBtn} onPress={closeAnomaliaModal} disabled={anomaliaSaving}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>
    </View>
  );
}
