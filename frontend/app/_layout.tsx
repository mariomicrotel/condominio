import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';

function GdprUpdateModal() {
  const { gdprUpdateRequired, gdprUpdateInfo, confirmGdprUpdate, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!gdprUpdateRequired || !gdprUpdateInfo) return null;

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert('Attenzione', 'Devi leggere e accettare la nuova informativa per continuare ad usare l\'app.');
      return;
    }
    setLoading(true);
    try {
      await confirmGdprUpdate(gdprUpdateInfo.versione_attiva);
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile confermare. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Esci dall\'app',
      'Se non accetti l\'informativa aggiornata non potrai accedere ai servizi. Vuoi disconnetterti?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Disconnetti', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const pubDate = gdprUpdateInfo.data_pubblicazione
    ? new Date(gdprUpdateInfo.data_pubblicazione).toLocaleDateString('it-IT')
    : '';

  return (
    <Modal visible={true} animationType="slide" transparent={false} statusBarTranslucent>
      <SafeAreaView style={ms.safe}>
        {/* Header */}
        <View style={ms.header}>
          <View style={ms.headerIcon}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ms.headerTitle}>Informativa aggiornata</Text>
            <Text style={ms.headerSub}>Versione {gdprUpdateInfo.versione_attiva} — {pubDate}</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={ms.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#0369A1" />
          <Text style={ms.infoText}>
            L'informativa sul trattamento dei dati è stata aggiornata. Leggi attentamente il testo e accetta per continuare.
          </Text>
        </View>

        {/* Policy Text */}
        <ScrollView style={ms.scrollArea} contentContainerStyle={{ padding: 16 }}>
          <Text style={ms.policyText}>{gdprUpdateInfo.testo_completo}</Text>
          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Footer actions */}
        <View style={ms.footer}>
          {/* Checkbox */}
          <TouchableOpacity style={ms.checkRow} onPress={() => setAccepted(!accepted)} activeOpacity={0.7}>
            <View style={[ms.checkbox, accepted && ms.checkboxChecked]}>
              {accepted && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={ms.checkLabel}>
              Ho letto e accetto l'informativa sul trattamento dei dati personali (versione {gdprUpdateInfo.versione_attiva})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ms.acceptBtn, !accepted && ms.acceptBtnDisabled]}
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={ms.acceptBtnText}>Accetta e Continua</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={ms.logoutBtn} onPress={handleLogout}>
            <Text style={ms.logoutText}>Non accetto — Disconnetti</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function AppLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <GdprUpdateModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 16,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#E0F2FE', padding: 14, margin: 16, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: '#0284C7',
  },
  infoText: { fontSize: 13, color: '#0369A1', flex: 1, marginLeft: 10, lineHeight: 18 },
  scrollArea: { flex: 1, backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 12 },
  policyText: { fontSize: 13, color: Colors.textMain, lineHeight: 20 },
  footer: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.navy,
    justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  checkLabel: { fontSize: 13, color: Colors.textSec, flex: 1, lineHeight: 18 },
  acceptBtn: {
    height: 52, borderRadius: 12, backgroundColor: Colors.navy,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  acceptBtnDisabled: { backgroundColor: Colors.textMuted },
  acceptBtnText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  logoutBtn: { alignItems: 'center', paddingVertical: 8 },
  logoutText: { fontSize: 14, color: '#DC2626' },
});
