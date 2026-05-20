import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { TABS, Tab } from '../src/components/admin/types';
import {
  DashboardTab,
  CondominiiTab,
  UtentiTab,
  SegnalazioniTab,
  SopralluoghiTab,
  FornitoriTab,
  AppuntamentiTab,
  AvvisiTab,
  TrasmissioniTab,
  RichiesteDocTab,
  ConfigTab,
  PrivacyTab,
} from '../src/components/admin';

export default function Admin() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  // ── Data state ──
  const [stats, setStats] = useState<any>(null);
  const [condomini, setCondomini] = useState<any[]>([]);
  const [utenti, setUtenti] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [fornitori, setFornitori] = useState<any[]>([]);
  const [sopralluoghi, setSopralluoghi] = useState<any[]>([]);
  const [collaboratori, setCollaboratori] = useState<any[]>([]);
  const [trasmissioni, setTrasmissioni] = useState<any[]>([]);
  const [richiesteDoc, setRichiesteDoc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [privacyScadenzaCount, setPrivacyScadenzaCount] = useState(0);

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cond, seg, app, avv, ut, trasm, forn, sop, collab, rDoc] = await Promise.all([
        api.getAdminDashboard(token!), api.getCondomini(token!),
        api.getAdminSegnalazioni(token!), api.getAdminAppuntamenti(token!),
        api.getAdminAvvisi(token!), api.getAdminUtenti(token!),
        api.getAdminTrasmissioni(token!).catch(() => []),
        api.getAdminFornitori(token!).catch(() => []),
        api.getSopralluoghi(token!).catch(() => []),
        api.getCollaboratori(token!).catch(() => []),
        api.getAdminRichieste(token!).catch(() => []),
      ]);
      setStats(s); setCondomini(cond); setSegnalazioni(seg);
      setAppuntamenti(app); setAvvisi(avv); setUtenti(ut);
      setTrasmissioni(trasm); setFornitori(forn); setSopralluoghi(sop);
      setCollaboratori(collab); setRichiesteDoc(Array.isArray(rDoc) ? rDoc : []);
      api.adminCountScadenzaPrivacy(token!).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire?', [
      { text: 'Annulla' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (loading) return <SafeAreaView style={ls.safe}><ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.navy} /></SafeAreaView>;

  // ── Tab content ──
  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return <DashboardTab stats={stats} setTab={setTab} onRefresh={loadAll} onNewCondominio={() => setTab('condomini')} onNewAvviso={() => setTab('avvisi')} />;
      case 'condomini':
        return <CondominiiTab token={token!} condomini={condomini} setCondomini={setCondomini} onRefresh={loadAll} />;
      case 'utenti':
        return <UtentiTab token={token!} utenti={utenti} condomini={condomini} collaboratori={collaboratori} onRefresh={loadAll} />;
      case 'segnalazioni':
        return <SegnalazioniTab token={token!} segnalazioni={segnalazioni} condomini={condomini} fornitori={fornitori} onRefresh={loadAll} />;
      case 'sopralluoghi':
        return <SopralluoghiTab token={token!} sopralluoghi={sopralluoghi} condomini={condomini} collaboratori={collaboratori} fornitori={fornitori} onRefresh={loadAll} />;
      case 'fornitori':
        return <FornitoriTab token={token!} fornitori={fornitori} onRefresh={loadAll} />;
      case 'appuntamenti':
        return <AppuntamentiTab token={token!} appuntamenti={appuntamenti} condomini={condomini} onRefresh={loadAll} />;
      case 'avvisi':
        return <AvvisiTab token={token!} avvisi={avvisi} condomini={condomini} onRefresh={loadAll} />;
      case 'trasmissioni':
        return <TrasmissioniTab token={token!} trasmissioni={trasmissioni} />;
      case 'richieste-doc':
        return <RichiesteDocTab token={token!} richiesteDoc={richiesteDoc} onRefresh={loadAll} />;
      case 'config':
        return <ConfigTab token={token!} utenti={utenti} condomini={condomini} />;
      case 'privacy':
        return <PrivacyTab token={token!} privacyScadenzaCount={privacyScadenzaCount} onScadenzaCountUpdate={setPrivacyScadenzaCount} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={ls.safe}>
      {/* Top bar */}
      <View style={ls.topBar}>
        <TouchableOpacity testID="admin-home-btn" onPress={() => setTab('dashboard')} style={ls.topBarBtn}>
          <Ionicons name="home-outline" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={ls.topTitle}>Pannello Admin</Text>
        <TouchableOpacity testID="admin-logout-btn" onPress={handleLogout} style={ls.topBarBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Tab Bar */}
      <View style={ls.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ls.tabBarScroll}>
          {TABS.map(t => {
            const active = tab === t.key;
            const showBadge = t.key === 'privacy' && privacyScadenzaCount > 0;
            return (
              <TouchableOpacity
                key={t.key}
                testID={`admin-tab-${t.key}`}
                style={[ls.tabPill, active && ls.tabPillActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons name={(active ? t.icon.replace('-outline', '') : t.icon) as any} size={16} color={active ? Colors.white : Colors.textSec} />
                  {showBadge && (
                    <View style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' }} />
                  )}
                </View>
                <Text style={[ls.tabPillLabel, active && ls.tabPillLabelActive]}>{t.label}</Text>
                {showBadge && (
                  <View style={{ backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 }}>
                    <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700' }}>{privacyScadenzaCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>
    </SafeAreaView>
  );
}

// ── Layout styles (only for admin shell) ──
const ls = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topBarBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy },
  tabBarWrap: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBarScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bg, gap: 6 },
  tabPillActive: { backgroundColor: Colors.navy },
  tabPillLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSec },
  tabPillLabelActive: { color: Colors.white },
});
