import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PickerSelect, PrimaryButton } from '../src/components/SharedComponents';

const TIPI_DOC = ['Bilancio consuntivo', 'Bilancio preventivo', 'Verbale assemblea', 'Tabelle millesimali', 'Estratto conto personale', 'Certificazione quote versate', 'Regolamento condominiale', 'Altro'];
const FORMATI = ['PDF', 'Cartaceo presso lo studio'];

export default function RichiestaDocumenti() {
  const router = useRouter();
  const { token } = useAuth();
  const [condomini, setCondomini] = useState<any[]>([]);
  const [form, setForm] = useState({ condominio_id: '', tipo_documento: '', note: '', formato: 'PDF' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) api.getCondomini(token).then(setCondomini).catch(() => {});
  }, [token]);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.condominio_id || !form.tipo_documento) {
      Alert.alert('Attenzione', 'Seleziona condominio e tipo documento');
      return;
    }
    setLoading(true);
    try {
      await api.createRichiesta(token!, form);
      Alert.alert('Richiesta Inviata', 'La tua richiesta è stata inviata. Riceverai una notifica quando il documento sarà disponibile.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  const condOptions = condomini.map(c => c.nome);
  const selectedCondName = condomini.find(c => c.id === form.condominio_id)?.nome || '';

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Richiesta Documenti" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <PickerSelect label="Condominio di riferimento *" value={selectedCondName} options={condOptions}
            onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) update('condominio_id', c.id); }}
            testID="rich-condominio-picker" />

          <PickerSelect label="Tipo di documento richiesto *" value={form.tipo_documento} options={TIPI_DOC} onSelect={v => update('tipo_documento', v)} testID="rich-tipo-picker" />

          <PickerSelect label="Formato preferito" value={form.formato} options={FORMATI} onSelect={v => update('formato', v)} testID="rich-formato-picker" />

          <FormInput label="Note aggiuntive" value={form.note} onChangeText={(v: string) => update('note', v)} multiline placeholder="Eventuali dettagli aggiuntivi..." testID="rich-note-input" />

          <PrimaryButton title="Invia Richiesta" onPress={handleSubmit} loading={loading} testID="rich-submit-btn" style={{ marginTop: 8 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
});
