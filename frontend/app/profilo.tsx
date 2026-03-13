import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PrimaryButton } from '../src/components/SharedComponents';

export default function Profilo() {
  const { user, token, refreshProfile, logout } = useAuth();
  const [form, setForm] = useState({
    nome: user?.nome || '', cognome: user?.cognome || '',
    telefono: user?.telefono || '', indirizzo: user?.indirizzo || '',
    codice_fiscale: user?.codice_fiscale || '',
  });
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateProfile(token!, form);
      await refreshProfile();
      Alert.alert('Successo', 'Profilo aggiornato con successo');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Il mio Profilo" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.nome?.[0] || '') + (user?.cognome?.[0] || '')}</Text>
            </View>
            <Text style={s.name}>{user?.nome} {user?.cognome}</Text>
            <Text style={s.email}>{user?.email}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{user?.ruolo === 'admin' ? 'Amministratore' : 'Condomino'}</Text>
            </View>
          </View>

          {/* Condomini */}
          {user?.condomini && user.condomini.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>I miei Condomini</Text>
              {user.condomini.map((c: any, i: number) => (
                <View key={i} style={s.condItem}>
                  <Ionicons name="business-outline" size={18} color={Colors.sky} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={s.condName}>{c.nome}</Text>
                    <Text style={s.condInfo}>{c.indirizzo}</Text>
                    {c.unita_immobiliare ? <Text style={s.condInfo}>{c.unita_immobiliare} • {c.qualita}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Edit form */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Modifica Dati</Text>
            <FormInput label="Nome" value={form.nome} onChangeText={(v: string) => update('nome', v)} testID="profilo-nome" />
            <FormInput label="Cognome" value={form.cognome} onChangeText={(v: string) => update('cognome', v)} testID="profilo-cognome" />
            <FormInput label="Telefono" value={form.telefono} onChangeText={(v: string) => update('telefono', v)} testID="profilo-telefono" />
            <FormInput label="Indirizzo" value={form.indirizzo} onChangeText={(v: string) => update('indirizzo', v)} testID="profilo-indirizzo" />
            <FormInput label="Codice Fiscale" value={form.codice_fiscale} onChangeText={(v: string) => update('codice_fiscale', v)} testID="profilo-cf" />
            <PrimaryButton title="Salva Modifiche" onPress={handleSave} loading={loading} testID="profilo-save-btn" />
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.white },
  name: { fontSize: 20, fontWeight: '700', color: Colors.navy },
  email: { fontSize: 14, color: Colors.textSec, marginTop: 2 },
  roleBadge: { backgroundColor: Colors.skyLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.sky },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: Colors.navy, marginBottom: 14 },
  condItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  condName: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  condInfo: { fontSize: 13, color: Colors.textSec, marginTop: 2 },
});
