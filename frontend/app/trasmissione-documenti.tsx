import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PickerSelect, PrimaryButton } from '../src/components/SharedComponents';

export default function TrasmissioneDocumenti() {
  const router = useRouter();
  const { token } = useAuth();
  const [condomini, setCondomini] = useState<any[]>([]);
  const [form, setForm] = useState({ condominio_id: '', oggetto: '', note: '' });
  const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) api.getCondomini(token).then(setCondomini).catch(() => {});
  }, [token]);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const pickFile = async () => {
    if (files.length >= 5) { Alert.alert('Limite', 'Puoi allegare massimo 5 file'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setFiles(prev => [...prev, { name: asset.name, uri: asset.uri }]);
      }
    } catch { Alert.alert('Errore', 'Impossibile selezionare il file'); }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.oggetto.trim()) { Alert.alert('Attenzione', 'Inserisci l\'oggetto della trasmissione'); return; }
    setLoading(true);
    try {
      const fileData = files.map(f => ({ filename: f.name, data: '' }));
      await api.createTrasmissione(token!, { ...form, files: fileData });
      Alert.alert('Trasmissione Inviata', 'I documenti sono stati trasmessi allo studio con successo.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setLoading(false); }
  };

  const condOptions = condomini.map(c => c.nome);
  const selectedCondName = condomini.find(c => c.id === form.condominio_id)?.nome || '';

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Trasmissione Documenti" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <FormInput label="Oggetto / Motivo della trasmissione *" value={form.oggetto} onChangeText={(v: string) => update('oggetto', v)} placeholder="Es: Documentazione fiscale 2025" testID="trasm-oggetto-input" />

          <PickerSelect label="Condominio di riferimento" value={selectedCondName} options={condOptions}
            onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) update('condominio_id', c.id); }}
            testID="trasm-cond-picker" />

          <FormInput label="Note aggiuntive" value={form.note} onChangeText={(v: string) => update('note', v)} multiline placeholder="Eventuali informazioni aggiuntive..." testID="trasm-note-input" />

          {/* File upload */}
          <View style={s.fileSection}>
            <Text style={s.fileLabel}>Allegati (max 5 file, PDF o immagini)</Text>
            <TouchableOpacity testID="trasm-pick-file-btn" style={s.pickBtn} onPress={pickFile}>
              <Ionicons name="cloud-upload-outline" size={22} color={Colors.sky} />
              <Text style={s.pickBtnText}>Aggiungi file</Text>
            </TouchableOpacity>
            {files.map((f, i) => (
              <View key={i} style={s.fileItem}>
                <Ionicons name="document-outline" size={18} color={Colors.textSec} />
                <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => removeFile(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <PrimaryButton title="Trasmetti Documenti" onPress={handleSubmit} loading={loading} testID="trasm-submit-btn" style={{ marginTop: 16 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  fileSection: { marginBottom: 16 },
  fileLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSec, marginBottom: 8 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.skyLight, borderStyle: 'dashed', borderRadius: 10, padding: 16, marginBottom: 10 },
  pickBtnText: { fontSize: 15, fontWeight: '500', color: Colors.sky, marginLeft: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  fileName: { flex: 1, fontSize: 14, color: Colors.textMain, marginHorizontal: 8 },
});
