import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge, PrimaryButton, PickerSelect } from '../src/components/SharedComponents';

const FC = { accent: '#EA580C', accentLight: '#FFEDD5', navy: '#7C2D12' };
const ESITI = ['Risolto completamente', 'Risolto parzialmente', 'Necessita ulteriore intervento', 'Non risolvibile'];

interface FotoItem {
  file_id?: string;
  uri?: string;
  filename: string;
  mimeType?: string;
  didascalia: string;
  uploading?: boolean;
}

export default function FornitoreIntervento() {
  const router = useRouter();
  const { segId } = useLocalSearchParams<{ segId: string }>();
  const { token } = useAuth();
  const [intervento, setIntervento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    data_intervento: new Date().toISOString().split('T')[0],
    ora_inizio: '', ora_fine: '', descrizione_lavori: '',
    esito: '', materiali: '', note: '',
  });
  const [foto, setFoto] = useState<FotoItem[]>([]);

  const loadDetail = useCallback(async () => {
    if (!token || !segId) return;
    setLoading(true);
    try {
      const data = await api.fornitoreInterventoDetail(token, segId);
      setIntervento(data);
      if (data.rapportino) {
        setForm({
          data_intervento: data.rapportino.data_intervento || '',
          ora_inizio: data.rapportino.ora_inizio || '',
          ora_fine: data.rapportino.ora_fine || '',
          descrizione_lavori: data.rapportino.descrizione_lavori || '',
          esito: data.rapportino.esito || '',
          materiali: data.rapportino.materiali || '',
          note: data.rapportino.note || '',
        });
        setFoto((data.rapportino.foto || []).map((f: any) => ({ file_id: f.file_id, didascalia: f.didascalia || '', filename: f.filename || 'foto' })));
      }
    } catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setLoading(false); }
  }, [token, segId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const pickPhoto = async () => {
    if (foto.length >= 10) { Alert.alert('Limite', 'Max 10 foto'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permesso negato'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 - foto.length, mediaTypes: ['images'] });
    if (result.canceled) return;
    const newFoto: FotoItem[] = result.assets.map(a => ({
      uri: a.uri, filename: a.fileName || `foto_${Date.now()}.jpg`,
      mimeType: a.mimeType || 'image/jpeg', didascalia: '',
    }));
    setFoto(p => [...p, ...newFoto].slice(0, 10));
  };

  const takePhoto = async () => {
    if (foto.length >= 10) { Alert.alert('Limite', 'Max 10 foto'); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permesso negato'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    const a = result.assets[0];
    setFoto(p => [...p, { uri: a.uri, filename: a.fileName || `foto_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', didascalia: '' }]);
  };

  const removeFoto = (idx: number) => setFoto(p => p.filter((_, i) => i !== idx));
  const updateDidascalia = (idx: number, val: string) => setFoto(p => p.map((f, i) => i === idx ? { ...f, didascalia: val } : f));

  const submitRapportino = async () => {
    if (!form.data_intervento || !form.descrizione_lavori || !form.esito) {
      Alert.alert('Attenzione', 'Compila data, descrizione lavori ed esito'); return;
    }
    if (foto.length === 0) { Alert.alert('Attenzione', 'Allega almeno una foto dell\'intervento'); return; }
    setSubmitting(true);
    try {
      const uploadedFoto: { file_id: string; didascalia: string }[] = [];
      for (const f of foto) {
        if (f.file_id) {
          uploadedFoto.push({ file_id: f.file_id, didascalia: f.didascalia });
        } else if (f.uri) {
          const uploaded = await api.uploadFile(token!, f.uri, f.filename, f.mimeType || 'image/jpeg');
          uploadedFoto.push({ file_id: uploaded.id, didascalia: f.didascalia });
        }
      }
      await api.createRapportino(token!, segId!, { ...form, foto: uploadedFoto });
      Alert.alert('Rapportino Inviato', 'Il rapportino è stato inviato con successo. L\'amministratore verrà notificato.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={st.safe}><ActivityIndicator style={{ marginTop: 60 }} size="large" color={FC.accent} /></SafeAreaView>;
  if (!intervento) return <SafeAreaView style={st.safe}><Text style={{ textAlign: 'center', marginTop: 60 }}>Intervento non trovato</Text></SafeAreaView>;

  const canEdit = intervento.stato !== 'Risolta';

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={FC.navy} />
        </TouchableOpacity>
        <Text style={st.topTitle}>Dettaglio Intervento</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          {/* Segnalazione originale */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={20} color={FC.accent} />
              <Text style={st.sectionTitle}>Segnalazione originale</Text>
            </View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Tipologia</Text><Text style={st.infoVal}>{intervento.tipologia}</Text></View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Urgenza</Text><StatusBadge status={intervento.urgenza} /></View>
            <View style={st.infoRow}><Text style={st.infoLabel}>Condominio</Text><Text style={st.infoVal}>{intervento.condominio_nome}</Text></View>
            {intervento.condominio_indirizzo ? <View style={st.infoRow}><Text style={st.infoLabel}>Indirizzo</Text><Text style={st.infoVal}>{intervento.condominio_indirizzo}</Text></View> : null}
            <Text style={st.descText}>{intervento.descrizione}</Text>
            {/* Foto originali */}
            {intervento.allegati_dettagli?.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={st.subLabel}>Foto del condomino ({intervento.allegati_dettagli.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {intervento.allegati_dettagli.map((f: any, i: number) => (
                    <Image key={i} source={{ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}${f.url}` }} style={st.thumbImg} />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Note admin */}
          {intervento.assegnazione?.note_admin ? (
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={FC.accent} />
                <Text style={st.sectionTitle}>Note dell'amministratore</Text>
              </View>
              <Text style={st.noteText}>{intervento.assegnazione.note_admin}</Text>
              {intervento.assegnazione.data_prevista ? <Text style={st.dataPrevista}>Data prevista: {intervento.assegnazione.data_prevista}</Text> : null}
            </View>
          ) : null}

          {/* Rapportino */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={FC.accent} />
              <Text style={st.sectionTitle}>Il mio rapportino</Text>
            </View>

            {!showForm && !intervento.rapportino && canEdit ? (
              <TouchableOpacity style={st.bigCta} onPress={() => setShowForm(true)} activeOpacity={0.7}>
                <Ionicons name="create" size={28} color={Colors.white} />
                <Text style={st.bigCtaText}>Compila rapportino intervento</Text>
              </TouchableOpacity>
            ) : null}

            {!showForm && intervento.rapportino ? (
              <View>
                <View style={st.infoRow}><Text style={st.infoLabel}>Data</Text><Text style={st.infoVal}>{intervento.rapportino.data_intervento}</Text></View>
                {intervento.rapportino.ora_inizio ? <View style={st.infoRow}><Text style={st.infoLabel}>Orario</Text><Text style={st.infoVal}>{intervento.rapportino.ora_inizio} - {intervento.rapportino.ora_fine}</Text></View> : null}
                <View style={st.infoRow}><Text style={st.infoLabel}>Esito</Text><StatusBadge status={intervento.rapportino.esito} /></View>
                <Text style={st.descText}>{intervento.rapportino.descrizione_lavori}</Text>
                {intervento.rapportino.materiali ? <Text style={st.materialText}>Materiali: {intervento.rapportino.materiali}</Text> : null}
                {canEdit && (
                  <TouchableOpacity style={st.editBtn} onPress={() => setShowForm(true)}>
                    <Ionicons name="create-outline" size={18} color={FC.accent} />
                    <Text style={st.editBtnText}>Modifica rapportino</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {showForm ? (
              <View>
                <Text style={st.fieldLabel}>Data intervento *</Text>
                <TextInput style={st.input} value={form.data_intervento} onChangeText={v => setForm(p => ({ ...p, data_intervento: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Ora inizio</Text>
                    <TextInput style={st.input} value={form.ora_inizio} onChangeText={v => setForm(p => ({ ...p, ora_inizio: v }))} placeholder="09:00" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Ora fine</Text>
                    <TextInput style={st.input} value={form.ora_fine} onChangeText={v => setForm(p => ({ ...p, ora_fine: v }))} placeholder="12:00" placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>
                <Text style={st.fieldLabel}>Descrizione lavori eseguiti *</Text>
                <TextInput style={[st.input, { height: 100, textAlignVertical: 'top' }]} value={form.descrizione_lavori} onChangeText={v => setForm(p => ({ ...p, descrizione_lavori: v }))} multiline placeholder="Descrivi i lavori eseguiti..." placeholderTextColor={Colors.textMuted} />
                <PickerSelect label="Esito dell'intervento *" value={form.esito} options={ESITI} onSelect={v => setForm(p => ({ ...p, esito: v }))} testID="rap-esito" />
                <Text style={st.fieldLabel}>Materiali utilizzati</Text>
                <TextInput style={[st.input, { height: 60, textAlignVertical: 'top' }]} value={form.materiali} onChangeText={v => setForm(p => ({ ...p, materiali: v }))} multiline placeholder="Es: 2 tubi PVC 50mm, guarnizioni" placeholderTextColor={Colors.textMuted} />
                <Text style={st.fieldLabel}>Note aggiuntive</Text>
                <TextInput style={st.input} value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} placeholder="Note..." placeholderTextColor={Colors.textMuted} />

                {/* Photo upload */}
                <Text style={st.fieldLabel}>Foto dell'intervento * (min. 1, max 10)</Text>
                <View style={st.photoButtons}>
                  <TouchableOpacity style={st.photoBtn} onPress={takePhoto}>
                    <Ionicons name="camera" size={24} color={FC.accent} />
                    <Text style={st.photoBtnText}>Scatta foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.photoBtn} onPress={pickPhoto}>
                    <Ionicons name="images" size={24} color={FC.accent} />
                    <Text style={st.photoBtnText}>Galleria</Text>
                  </TouchableOpacity>
                </View>

                {foto.length > 0 && (
                  <View style={st.fotoList}>
                    {foto.map((f, idx) => (
                      <View key={idx} style={st.fotoItem}>
                        {f.uri ? (
                          <Image source={{ uri: f.uri }} style={st.fotoThumb} />
                        ) : f.file_id ? (
                          <View style={st.fotoPlaceholder}><Ionicons name="image" size={22} color={FC.accent} /></View>
                        ) : null}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <TextInput style={st.didascaliaInput} value={f.didascalia} onChangeText={v => updateDidascalia(idx, v)} placeholder="Didascalia (es: Prima dell'intervento)" placeholderTextColor={Colors.textMuted} />
                        </View>
                        <TouchableOpacity onPress={() => removeFoto(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <PrimaryButton title={submitting ? 'Invio in corso...' : 'Invia Rapportino'} onPress={submitRapportino} loading={submitting} testID="rap-submit" style={{ marginTop: 16, backgroundColor: FC.accent }} />
                <TouchableOpacity style={st.cancelBtn} onPress={() => setShowForm(false)}><Text style={st.cancelBtnText}>Annulla</Text></TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7ED' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: FC.navy },
  content: { padding: 16 },
  section: { backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: FC.navy },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  infoVal: { fontSize: 13, fontWeight: '600', color: Colors.textMain, maxWidth: '60%', textAlign: 'right' },
  descText: { fontSize: 14, color: Colors.textSec, marginTop: 10, lineHeight: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10 },
  subLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  thumbImg: { width: 80, height: 80, borderRadius: 10, marginRight: 8, backgroundColor: '#F3F4F6' },
  noteText: { fontSize: 14, color: FC.navy, lineHeight: 20, backgroundColor: FC.accentLight, padding: 12, borderRadius: 10 },
  dataPrevista: { fontSize: 13, color: FC.accent, fontWeight: '600', marginTop: 8 },
  // CTA
  bigCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: FC.accent, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 24 },
  bigCtaText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  editBtnText: { fontSize: 14, fontWeight: '600', color: FC.accent },
  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSec, marginBottom: 4, marginTop: 8 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, fontSize: 15, color: Colors.textMain, backgroundColor: '#FAFAFA', marginBottom: 8 },
  materialText: { fontSize: 13, color: Colors.textSec, marginTop: 6, fontStyle: 'italic' },
  photoButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  photoBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: FC.accent, borderStyle: 'dashed', gap: 6 },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: FC.accent },
  fotoList: { marginTop: 12 },
  fotoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 10, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  fotoThumb: { width: 52, height: 52, borderRadius: 8 },
  fotoPlaceholder: { width: 52, height: 52, borderRadius: 8, backgroundColor: FC.accentLight, justifyContent: 'center', alignItems: 'center' },
  didascaliaInput: { height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, fontSize: 13, color: Colors.textMain, backgroundColor: Colors.white },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { fontSize: 15, color: Colors.textMuted },
});
