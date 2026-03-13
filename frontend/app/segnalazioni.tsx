import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PickerSelect, PrimaryButton } from '../src/components/SharedComponents';

const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Ascensore', 'Infiltrazioni', 'Parti comuni', 'Pulizia', 'Sicurezza', 'Altro'];
const QUALITA = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];

export default function Segnalazioni() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [condomini, setCondomini] = useState<any[]>([]);
  const [form, setForm] = useState({ condominio_id: '', qualita: '', tipologia: '', descrizione: '', urgenza: 'Media' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) api.getCondomini(token).then(setCondomini).catch(() => {});
  }, [token]);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.condominio_id || !form.qualita || !form.tipologia || !form.descrizione.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori');
      return;
    }
    setLoading(true);
    try {
      const result = await api.createSegnalazione(token!, form);
      Alert.alert('Segnalazione Inviata', `La tua segnalazione è stata inviata con successo.\n\nProtocollo: ${result.protocollo}`, [
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
      <ScreenHeader title="Segnalazione Guasti" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>
              Richiesta di intervento / Segnalazione guasti — Lo studio si riserva di verificare la veridicità della richiesta. La presente non ha valore di notifica o comunicazione ufficiale.
            </Text>
          </View>

          <FormInput label="Nome e Cognome" value={`${user?.nome} ${user?.cognome}`} editable={false} testID="seg-nome-input" />
          <FormInput label="Email" value={user?.email} editable={false} testID="seg-email-input" />
          <FormInput label="Telefono" value={user?.telefono} editable={false} testID="seg-telefono-input" />

          <PickerSelect label="Condominio di riferimento *" value={selectedCondName} options={condOptions}
            onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) update('condominio_id', c.id); }}
            testID="seg-condominio-picker" />

          <PickerSelect label="In qualità di *" value={form.qualita} options={QUALITA} onSelect={v => update('qualita', v)} testID="seg-qualita-picker" />
          <PickerSelect label="Tipologia della segnalazione *" value={form.tipologia} options={TIPOLOGIE} onSelect={v => update('tipologia', v)} testID="seg-tipologia-picker" />
          
          <FormInput label="Descrizione dettagliata del guasto *" value={form.descrizione} onChangeText={(v: string) => update('descrizione', v)} multiline placeholder="Descrivi il problema nel dettaglio..." testID="seg-descrizione-input" />

          <PickerSelect label="Livello di urgenza" value={form.urgenza} options={URGENZE} onSelect={v => update('urgenza', v)} testID="seg-urgenza-picker" />

          <PrimaryButton title="Invia Segnalazione" onPress={handleSubmit} loading={loading} testID="seg-submit-btn" style={{ marginTop: 8 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  disclaimer: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
