import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';
import { ScreenHeader } from '../src/components/SharedComponents';

const PHONE = '+39 089 123456';
const EMAIL = 'info@tardugnobonifacio.it';
const WEBSITE = 'https://www.tardugnobonifacio.it/';
const ADDRESS = 'Via Raffaele Ricci, 37 – 84129 Salerno';

export default function Contatti() {
  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Contatti" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header card */}
        <View style={s.headerCard}>
          <Image source={require('../assets/images/logo_building.png')} style={s.logoImg} accessibilityLabel="Logo Studio" />
          <Text style={s.studioName}>Studio Tardugno & Bonifacio</Text>
          <Text style={s.studioSub}>Consulenza contabile, fiscale e condominiale</Text>
        </View>

        {/* Contact items */}
        <View style={s.card}>
          <ContactItem icon="location" label="Indirizzo" value={ADDRESS} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`)} />
          <View style={s.sep} />
          <ContactItem icon="call" label="Telefono" value={PHONE} onPress={() => Linking.openURL(`tel:${PHONE}`)} actionLabel="Chiama" />
          <View style={s.sep} />
          <ContactItem icon="mail" label="Email" value={EMAIL} onPress={() => Linking.openURL(`mailto:${EMAIL}`)} actionLabel="Scrivi" />
          <View style={s.sep} />
          <ContactItem icon="globe" label="Sito Web" value="www.tardugnobonifacio.it" onPress={() => Linking.openURL(WEBSITE)} actionLabel="Visita" />
        </View>

        {/* Orari */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Orari di Ricevimento</Text>
          <View style={s.orarioRow}>
            <Text style={s.orarioDay}>Lunedì – Venerdì</Text>
          </View>
          <View style={s.orarioRow}>
            <Ionicons name="sunny" size={16} color={Colors.warning} />
            <Text style={s.orarioText}>Mattina: 9:00 – 13:00</Text>
          </View>
          <View style={s.orarioRow}>
            <Ionicons name="moon" size={16} color={Colors.sky} />
            <Text style={s.orarioText}>Pomeriggio: 15:00 – 18:00 (su appuntamento)</Text>
          </View>
        </View>

        {/* Map placeholder */}
        <View style={s.mapCard}>
          <View style={s.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.sky} />
            <Text style={s.mapText}>Via Raffaele Ricci, 37</Text>
            <Text style={s.mapSubText}>84129 Salerno (SA)</Text>
            <TouchableOpacity testID="open-map-btn" style={s.mapBtn} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`)}>
              <Ionicons name="navigate" size={16} color={Colors.white} />
              <Text style={s.mapBtnText}>Apri in Google Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactItem({ icon, label, value, onPress, actionLabel }: any) {
  return (
    <TouchableOpacity testID={`contact-${icon}`} style={s.contactItem} onPress={onPress} activeOpacity={0.7}>
      <View style={s.contactIcon}>
        <Ionicons name={icon} size={22} color={Colors.sky} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.contactLabel}>{label}</Text>
        <Text style={s.contactValue}>{value}</Text>
      </View>
      {actionLabel && (
        <View style={s.actionBadge}>
          <Text style={s.actionText}>{actionLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  headerCard: { backgroundColor: Colors.navy, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  logoImg: { width: 72, height: 72, marginBottom: 12 },
  studioName: { fontSize: 20, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  studioSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: Colors.navy, marginBottom: 12 },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center' },
  contactIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactLabel: { fontSize: 12, color: Colors.textMuted },
  contactValue: { fontSize: 15, color: Colors.textMain, fontWeight: '500', marginTop: 2 },
  actionBadge: { backgroundColor: Colors.navy, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.white },
  orarioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  orarioDay: { fontSize: 15, fontWeight: '600', color: Colors.textMain, marginBottom: 4 },
  orarioText: { fontSize: 14, color: Colors.textSec, marginLeft: 8 },
  mapCard: { marginBottom: 12 },
  mapPlaceholder: { backgroundColor: Colors.white, borderRadius: 12, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  mapText: { fontSize: 16, fontWeight: '600', color: Colors.navy, marginTop: 12 },
  mapSubText: { fontSize: 14, color: Colors.textSec, marginTop: 2 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.sky, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  mapBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white, marginLeft: 6 },
});
