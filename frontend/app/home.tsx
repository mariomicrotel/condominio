import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { Colors, TileColors } from '../src/constants/theme';

const TILES = [
  { label: 'Segnalazione\nGuasti', icon: 'warning', lib: 'Ionicons', route: '/segnalazioni', color: TileColors[0] },
  { label: 'Richieste\nDocumenti', icon: 'document-text', lib: 'Ionicons', route: '/richiesta-documenti', color: TileColors[1] },
  { label: 'Trasmissione\nDocumenti', icon: 'cloud-upload', lib: 'Ionicons', route: '/trasmissione-documenti', color: TileColors[2] },
  { label: 'Appuntamento', icon: 'calendar', lib: 'Ionicons', route: '/appuntamenti', color: TileColors[3] },
  { label: 'Il mio\nCondominio', icon: 'home', lib: 'Ionicons', route: '/condominio', color: TileColors[4] },
  { label: 'Bacheca', icon: 'clipboard', lib: 'Ionicons', route: '/bacheca', color: TileColors[5] },
  { label: 'Contatti', icon: 'call', lib: 'Ionicons', route: '/contatti', color: TileColors[6] },
  { label: 'Chi siamo', icon: 'information-circle', lib: 'Ionicons', route: '/chi-siamo', color: TileColors[7] },
];

export default function Home() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();

  useEffect(() => { refreshProfile(); }, []);

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire dal tuo account?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const handleTile = (route: string) => {
    if (route === '/trasmissione-documenti' || route === '/condominio') {
      Alert.alert('Prossimamente', 'Questa funzionalità sarà disponibile a breve.');
      return;
    }
    router.push(route as any);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.logoSmall}>
              <Ionicons name="business" size={28} color={Colors.white} />
            </View>
            <View>
              <Text style={s.headerTitle}>Studio Tardugno</Text>
              <Text style={s.headerSub}>& Bonifacio</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            {user?.ruolo === 'admin' && (
              <TouchableOpacity testID="admin-panel-btn" style={s.adminBtn} onPress={() => router.push('/admin')}>
                <Ionicons name="settings" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="profile-btn" style={s.profileBtn} onPress={() => router.push('/profilo')}>
              <Ionicons name="person" size={20} color={Colors.navy} />
            </TouchableOpacity>
            <TouchableOpacity testID="logout-btn" onPress={handleLogout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="log-out-outline" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome */}
        <View style={s.welcome}>
          <Text style={s.welcomeText}>Ciao, {user?.nome || 'Utente'} 👋</Text>
          <Text style={s.welcomeSub}>Come possiamo aiutarti oggi?</Text>
        </View>

        {/* Tile Grid */}
        <View style={s.grid}>
          {TILES.map((tile, i) => (
            <TouchableOpacity
              testID={`tile-${tile.route.replace('/', '')}`}
              key={i}
              style={s.tile}
              onPress={() => handleTile(tile.route)}
              activeOpacity={0.7}
            >
              <View style={[s.tileIcon, { backgroundColor: tile.color.bg }]}>
                <Ionicons name={tile.icon as any} size={28} color={tile.color.icon} />
              </View>
              <Text style={s.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links */}
        <View style={s.quickSection}>
          <Text style={s.sectionTitle}>Accesso rapido</Text>
          <TouchableOpacity testID="quick-segnalazioni-list" style={s.quickCard} onPress={() => router.push('/segnalazioni-lista')}>
            <View style={[s.quickIcon, { backgroundColor: TileColors[0].bg }]}>
              <Ionicons name="list" size={20} color={TileColors[0].icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.quickLabel}>Le mie segnalazioni</Text>
              <Text style={s.quickSub}>Visualizza lo stato delle tue segnalazioni</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity testID="quick-richieste-list" style={s.quickCard} onPress={() => router.push('/storico-richieste')}>
            <View style={[s.quickIcon, { backgroundColor: TileColors[1].bg }]}>
              <Ionicons name="documents" size={20} color={TileColors[1].icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.quickLabel}>Storico richieste</Text>
              <Text style={s.quickSub}>Richieste documenti e appuntamenti</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity testID="quick-appuntamenti-list" style={s.quickCard} onPress={() => router.push('/appuntamenti-lista')}>
            <View style={[s.quickIcon, { backgroundColor: TileColors[3].bg }]}>
              <Ionicons name="time" size={20} color={TileColors[3].icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.quickLabel}>I miei appuntamenti</Text>
              <Text style={s.quickSub}>Appuntamenti prenotati e confermati</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoSmall: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  headerSub: { fontSize: 14, fontWeight: '500', color: Colors.sky },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.sky, justifyContent: 'center', alignItems: 'center' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center' },
  welcome: { marginBottom: 24 },
  welcomeText: { fontSize: 24, fontWeight: '700', color: Colors.navy },
  welcomeSub: { fontSize: 15, color: Colors.textSec, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tile: { width: '50%', padding: 6 },
  tileIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10, alignSelf: 'center' },
  tileLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMain, textAlign: 'center', lineHeight: 19 },
  quickSection: { marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.navy, marginBottom: 14 },
  quickCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  quickIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quickLabel: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  quickSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
