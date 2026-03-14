import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors, TileColors } from '../src/constants/theme';

const TILES = [
  { label: 'Segnalazione\nGuasti', icon: 'warning', route: '/segnalazioni', color: TileColors[0] },
  { label: 'Richieste\nDocumenti', icon: 'document-text', route: '/richiesta-documenti', color: TileColors[1] },
  { label: 'Trasmissione\nDocumenti', icon: 'cloud-upload', route: '/trasmissione-documenti', color: TileColors[2] },
  { label: 'Appuntamento', icon: 'calendar', route: '/appuntamenti', color: TileColors[3] },
  { label: 'Il mio\nCondominio', icon: 'home', route: '/condominio', color: TileColors[4] },
  { label: 'Bacheca', icon: 'clipboard', route: '/bacheca', color: TileColors[5] },
  { label: 'Contatti', icon: 'call', route: '/contatti', color: TileColors[6] },
  { label: 'Chi siamo', icon: 'information-circle', route: '/chi-siamo', color: TileColors[7] },
];

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export default function Home() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const [now, setNow] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { refreshProfile(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Notification count - refresh on path change (returning from notifiche screen) and periodic
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const stored = await AsyncStorage.getItem('token');
        if (stored) {
          const { count } = await api.getNotificheCount(stored);
          setUnreadCount(count);
        }
      } catch {}
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 30000);
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkNotifs();
      }
      appState.current = nextState;
    });
    return () => { clearInterval(interval); sub.remove(); };
  }, [pathname]);

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire dal tuo account?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const dateStr = `${GIORNI[now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]} ${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image source={require('../assets/images/logo_building.png')} style={s.logoImg} accessibilityLabel="Logo Studio" />
            <View>
              <Text style={s.headerTitle}>Studio Tardugno</Text>
              <Text style={s.headerSub}>& Bonifacio</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity testID="notifiche-btn" style={s.bellBtn} onPress={() => router.push('/notifiche')}>
              <Ionicons name="notifications-outline" size={22} color={Colors.navy} />
              {unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {user?.ruolo === 'admin' && (
              <TouchableOpacity testID="admin-panel-btn" style={s.adminBtn} onPress={() => router.push('/admin')}>
                <Ionicons name="settings" size={20} color={Colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="profile-btn" style={s.profileBtn} onPress={() => router.push('/profilo')}>
              <Ionicons name="person" size={18} color={Colors.navy} />
            </TouchableOpacity>
            <TouchableOpacity testID="logout-btn" onPress={handleLogout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date & Time */}
        <View style={s.dateRow}>
          <View>
            <Text style={s.dateText}>{dateStr}</Text>
            <Text style={s.timeText}>{timeStr}</Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={s.welcome}>
          <Text style={s.welcomeText}>Ciao, {user?.nome || 'Utente'} 👋</Text>
          <Text style={s.welcomeSub}>Come possiamo aiutarti oggi?</Text>
        </View>

        {/* Avviso se non ancora abilitato */}
        {(!user?.condomini || user.condomini.length === 0) && user?.ruolo !== 'admin' && (
          <View style={s.pendingBox}>
            <Ionicons name="time-outline" size={22} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.pendingTitle}>Account in attesa di abilitazione</Text>
              <Text style={s.pendingText}>Lo studio sta verificando i tuoi dati e ti assocerà al condominio di appartenenza.</Text>
            </View>
          </View>
        )}

        {/* Tile Grid */}
        <View style={s.grid}>
          {TILES.map((tile, i) => (
            <TouchableOpacity
              testID={`tile-${tile.route.replace('/', '')}`}
              key={i}
              style={s.tile}
              onPress={() => router.push(tile.route as any)}
              activeOpacity={0.7}
            >
              <View style={[s.tileInner]}>
                <View style={[s.tileIcon, { backgroundColor: tile.color.bg }]}>
                  <Ionicons name={tile.icon as any} size={28} color={tile.color.icon} />
                </View>
                <Text style={s.tileLabel}>{tile.label}</Text>
              </View>
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
              <Text style={s.quickSub}>Richieste documenti</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoImg: { width: 44, height: 44, marginRight: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.navy },
  headerSub: { fontSize: 13, fontWeight: '500', color: Colors.sky },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  adminBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.sky, justifyContent: 'center', alignItems: 'center' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center' },
  dateRow: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  dateText: { fontSize: 15, fontWeight: '500', color: Colors.textMain },
  timeText: { fontSize: 28, fontWeight: '700', color: Colors.navy, marginTop: 2 },
  welcome: { marginBottom: 20 },
  welcomeText: { fontSize: 24, fontWeight: '700', color: Colors.navy },
  welcomeSub: { fontSize: 15, color: Colors.textSec, marginTop: 4 },
  pendingBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  pendingTitle: { fontSize: 15, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  pendingText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tile: { width: '50%', padding: 6 },
  tileInner: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  tileIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMain, textAlign: 'center', lineHeight: 18 },
  quickSection: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.navy, marginBottom: 14 },
  quickCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  quickIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quickLabel: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  quickSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
