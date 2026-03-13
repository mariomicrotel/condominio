import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';
import { ScreenHeader } from '../src/components/SharedComponents';

const SERVIZI = [
  { icon: 'business', title: 'Gestione Condominiale', desc: 'Amministrazione e gestione completa di condomini' },
  { icon: 'calculator', title: 'Consulenza Fiscale e Aziendale', desc: 'Assistenza contabile e fiscale per aziende e privati' },
  { icon: 'briefcase', title: 'Consulenza del Lavoro', desc: 'Gestione paghe, contributi e adempimenti' },
  { icon: 'document-text', title: 'CAF / 730 / INPS', desc: 'Dichiarazione dei redditi e pratiche previdenziali' },
];

export default function ChiSiamo() {
  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Chi Siamo" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <Ionicons name="business" size={56} color={Colors.white} />
          <Text style={s.heroTitle}>Studio Tardugno & Bonifacio</Text>
          <Text style={s.heroSub}>Salerno — Dal 1984</Text>
        </View>

        {/* About */}
        <View style={s.card}>
          <Text style={s.aboutText}>
            Lo Studio Tardugno Elvira Velia opera a Salerno dal 1984 nel settore della consulenza contabile e fiscale con particolare specializzazione in materia di Amministrazione e Gestione condominiale.
          </Text>
        </View>

        {/* Team */}
        <Text style={s.sectionTitle}>Il Nostro Team</Text>
        
        <View style={s.card}>
          <View style={s.teamMember}>
            <View style={s.avatar}><Text style={s.avatarText}>VT</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>Rag. Velia Elvira Tardugno</Text>
              <Text style={s.memberRole}>Fondatrice</Text>
              <Text style={s.memberInfo}>P.IVA 01975320654</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.teamMember}>
            <View style={[s.avatar, { backgroundColor: Colors.sky }]}><Text style={s.avatarText}>AB</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>Rag. Antonio Bonifacio</Text>
              <Text style={s.memberRole}>Collabora dal 2003</Text>
              <Text style={s.memberInfo}>Iscritto all'Ordine Consulenti del Lavoro di Salerno (n. 679)</Text>
              <Text style={s.memberInfo}>Conciliatore Camera di Commercio di Salerno</Text>
              <Text style={s.memberInfo}>CTU Tribunale di Salerno — P.IVA 04107810659</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.teamMember}>
            <View style={[s.avatar, { backgroundColor: '#10B981' }]}><Text style={s.avatarText}>DB</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>Dott. Daniele Bonifacio</Text>
              <Text style={s.memberRole}>Collabora dal 2009</Text>
              <Text style={s.memberInfo}>Esperto in management aziendale e dello sport</Text>
            </View>
          </View>
        </View>

        {/* Servizi */}
        <Text style={s.sectionTitle}>I Nostri Servizi</Text>
        {SERVIZI.map((srv, i) => (
          <View key={i} style={s.serviceCard}>
            <View style={s.serviceIcon}>
              <Ionicons name={srv.icon as any} size={24} color={Colors.sky} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.serviceTitle}>{srv.title}</Text>
              <Text style={s.serviceDesc}>{srv.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity testID="website-link" style={s.websiteBtn} onPress={() => Linking.openURL('https://www.tardugnobonifacio.it/')}>
          <Ionicons name="globe" size={18} color={Colors.white} />
          <Text style={s.websiteBtnText}>Visita il nostro sito web</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  hero: { backgroundColor: Colors.navy, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginTop: 12, textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  aboutText: { fontSize: 15, color: Colors.textSec, lineHeight: 23 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: Colors.navy, marginBottom: 12, marginTop: 8 },
  teamMember: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.textMain },
  memberRole: { fontSize: 13, color: Colors.sky, fontWeight: '500', marginTop: 2 },
  memberInfo: { fontSize: 12, color: Colors.textSec, marginTop: 3, lineHeight: 17 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  serviceIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  serviceDesc: { fontSize: 13, color: Colors.textSec, marginTop: 2 },
  websiteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.sky, borderRadius: 12, padding: 16, marginTop: 12 },
  websiteBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white, marginLeft: 8 },
});
