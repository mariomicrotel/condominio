import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PickerSelect, PrimaryButton } from '../src/components/SharedComponents';

const MOTIVI = ['Consulenza condominiale', 'Consulenza fiscale', 'Consulenza del lavoro', 'CAF/730/INPS', 'Passaggio consegne', 'Altro'];
const FASCE = ['Mattina (9:00 - 13:00)', 'Pomeriggio (15:00 - 18:00)'];

export default function Appuntamenti() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState({ motivo: '', data_richiesta: '', fascia_oraria: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [dateText, setDateText] = useState('');

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleDateInput = (text: string) => {
    // Simple date input: DD/MM/YYYY
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, Math.min(2, cleaned.length));
    if (cleaned.length > 2) formatted += '/' + cleaned.substring(2, Math.min(4, cleaned.length));
    if (cleaned.length > 4) formatted += '/' + cleaned.substring(4);
    setDateText(formatted);
    
    if (cleaned.length === 8) {
      const day = parseInt(cleaned.substring(0, 2));
      const month = parseInt(cleaned.substring(2, 4));
      const year = parseInt(cleaned.substring(4, 8));
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getDay() !== 0 && date.getDay() !== 6) {
        update('data_richiesta', date.toISOString().split('T')[0]);
      } else {
        update('data_richiesta', '');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.motivo || !form.data_richiesta || !form.fascia_oraria) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori');
      return;
    }
    setLoading(true);
    try {
      await api.createAppuntamento(token!, form);
      Alert.alert('Richiesta Inviata', 'La tua richiesta di appuntamento è stata inviata. Riceverai conferma dallo studio.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Prenota Appuntamento" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Orari */}
          <View style={s.infoBox}>
            <Ionicons name="time-outline" size={18} color={Colors.navy} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.infoTitle}>Orari di ricevimento</Text>
              <Text style={s.infoText}>Lunedì – Venerdì</Text>
              <Text style={s.infoText}>Mattina: 9:00 – 13:00</Text>
              <Text style={s.infoText}>Pomeriggio: 15:00 – 18:00 (su appuntamento)</Text>
            </View>
          </View>

          <PickerSelect label="Motivo dell'appuntamento *" value={form.motivo} options={MOTIVI} onSelect={v => update('motivo', v)} testID="app-motivo-picker" />

          <FormInput label="Data preferita * (GG/MM/AAAA - solo giorni lavorativi)" value={dateText} onChangeText={handleDateInput} placeholder="GG/MM/AAAA" testID="app-data-input" />
          {dateText.length === 10 && !form.data_richiesta && <Text style={s.errText}>Seleziona un giorno lavorativo (lun-ven)</Text>}

          <PickerSelect label="Fascia oraria preferita *" value={form.fascia_oraria} options={FASCE} onSelect={v => update('fascia_oraria', v)} testID="app-fascia-picker" />

          <FormInput label="Note aggiuntive" value={form.note} onChangeText={(v: string) => update('note', v)} multiline placeholder="Dettagli aggiuntivi..." testID="app-note-input" />

          <PrimaryButton title="Richiedi Appuntamento" onPress={handleSubmit} loading={loading} testID="app-submit-btn" style={{ marginTop: 8 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  infoBox: { flexDirection: 'row', backgroundColor: Colors.skyLight, borderRadius: 10, padding: 14, marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: Colors.navy, marginBottom: 4 },
  infoText: { fontSize: 13, color: Colors.textSec, lineHeight: 20 },
  errText: { fontSize: 12, color: Colors.error, marginTop: -12, marginBottom: 12 },
});
