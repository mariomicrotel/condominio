import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge } from '../src/components/SharedComponents';

const FC = { bg: '#FFF7ED', accent: '#EA580C', accentLight: '#FFEDD5', navy: '#7C2D12', text: '#431407' };

type Tab = 'attivi' | 'archivio' | 'profilo';

export default function FornitoreDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('attivi');
  const [stats, setStats] = useState<any>(null);
  const [interventi, setInterventi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tutti');

  const pathname = usePathname();

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, i] = await Promise.all([
        api.fornitoreDashboard(token),
        api.fornitoreInterventi(token),
      ]);
      setStats(s);
      setInterventi(i);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData, pathname]);

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire?', [
      { text: 'Annulla' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const getStato = (item: any): string => {
    if (item.stato === 'Risolta') return 'Completato';
    if (item.stato === 'Intervento completato') return 'In verifica';
    if (item.stato === 'Richiesto nuovo intervento') return 'Da rifare';
    if (item.rapportino) return 'In verifica';
    return 'Da eseguire';
  };

  const filteredInterventi = interventi.filter(i => {
    const stato = getStato(i);
    if (tab === 'archivio') return stato === 'Completato';
    if (filter === 'tutti') return stato !== 'Completato';
    if (filter === 'da_eseguire') return stato === 'Da eseguire' || stato === 'Da rifare';
    if (filter === 'in_verifica') return stato === 'In verifica';
    return true;
  });

  const urgenzaColor = (u: string) => {
    switch (u) {
      case 'Urgente': return '#DC2626';
      case 'Alta': return '#EA580C';
      case 'Media': return '#D97706';
      default: return '#6B7280';
    }
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 60 }} size="large" color={FC.accent} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Benvenuto</Text>
          <Text style={s.headerTitle}>{user?.nome || 'Fornitore'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/notifiche')} style={s.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={FC.navy} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={s.headerBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderLeftColor: '#DC2626' }]}>
          <Text style={[s.statVal, { color: '#DC2626' }]}>{stats?.da_eseguire || 0}</Text>
          <Text style={s.statLabel}>Da eseguire</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: '#D97706' }]}>
          <Text style={[s.statVal, { color: '#D97706' }]}>{stats?.in_verifica || 0}</Text>
          <Text style={s.statLabel}>In verifica</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: '#16A34A' }]}>
          <Text style={[s.statVal, { color: '#16A34A' }]}>{stats?.completati || 0}</Text>
          <Text style={s.statLabel}>Completati</Text>
        </View>
      </View>

      {/* Tab Buttons */}
      <View style={s.tabRow}>
        {([['attivi', 'Interventi Attivi', 'construct'], ['archivio', 'Archivio', 'checkmark-done'], ['profilo', 'Profilo', 'person']] as const).map(([key, label, icon]) => (
          <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key as Tab)}>
            <Ionicons name={icon as any} size={18} color={tab === key ? Colors.white : FC.accent} />
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'profilo' ? (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.profileCard}>
            <View style={s.profileIcon}>
              <Ionicons name="person" size={40} color={FC.accent} />
            </View>
            <Text style={s.profileName}>{user?.nome}</Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
            <View style={s.profileDivider} />
            <ProfileRow icon="call" label="Telefono" value={user?.telefono} />
            <ProfileRow icon="location" label="Indirizzo" value={user?.indirizzo} />
            <ProfileRow icon="card" label="Codice Fiscale" value={user?.codice_fiscale} />
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {tab === 'attivi' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
              {[['tutti', 'Tutti'], ['da_eseguire', 'Da eseguire'], ['in_verifica', 'In verifica']].map(([k, l]) => (
                <TouchableOpacity key={k} style={[s.filterPill, filter === k && s.filterPillActive]} onPress={() => setFilter(k)}>
                  <Text style={[s.filterPillText, filter === k && s.filterPillTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <FlatList
            data={filteredInterventi}
            keyExtractor={i => i.id}
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} />}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun intervento {tab === 'archivio' ? 'completato' : 'al momento'}</Text>}
            renderItem={({ item }) => {
              const stato = getStato(item);
              return (
                <TouchableOpacity style={s.interventoCard} onPress={() => router.push(`/fornitore-intervento?segId=${item.id}`)} activeOpacity={0.7}>
                  <View style={s.interventoHeader}>
                    <View style={[s.urgenzaBadge, { backgroundColor: urgenzaColor(item.urgenza) + '20' }]}>
                      <Text style={[s.urgenzaText, { color: urgenzaColor(item.urgenza) }]}>{item.urgenza}</Text>
                    </View>
                    <StatusBadge status={stato} />
                  </View>
                  <Text style={s.interventoTitle}>{item.tipologia}</Text>
                  <View style={s.interventoInfoRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                    <Text style={s.interventoInfo}>{item.condominio_nome}</Text>
                  </View>
                  {item.condominio_indirizzo ? (
                    <Text style={s.interventoAddr}>{item.condominio_indirizzo}</Text>
                  ) : null}
                  {item.assegnazione?.data_prevista ? (
                    <View style={s.interventoInfoRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                      <Text style={s.interventoInfo}>Previsto: {item.assegnazione.data_prevista}</Text>
                    </View>
                  ) : null}
                  <Text style={s.interventoDesc} numberOfLines={2}>{item.descrizione}</Text>
                  {stato === 'Da eseguire' || stato === 'Da rifare' ? (
                    <View style={s.ctaRow}>
                      <Ionicons name="construct" size={16} color={FC.accent} />
                      <Text style={s.ctaText}>{stato === 'Da rifare' ? 'Richiesto nuovo intervento' : 'Compila rapportino'}</Text>
                      <Ionicons name="chevron-forward" size={16} color={FC.accent} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function ProfileRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.profileRow}>
      <Ionicons name={icon as any} size={18} color={FC.accent} />
      <View style={{ marginLeft: 12 }}>
        <Text style={s.profileRowLabel}>{label}</Text>
        <Text style={s.profileRowValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FC.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerSub: { fontSize: 13, color: Colors.textMuted },
  headerTitle: { fontSize: 20, fontWeight: '700', color: FC.navy },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border },
  statVal: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },
  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: FC.accent, borderColor: FC.accent },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: FC.accent },
  tabBtnTextActive: { color: Colors.white },
  // Filters
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterPillActive: { backgroundColor: FC.accent, borderColor: FC.accent },
  filterPillText: { fontSize: 13, fontWeight: '500', color: Colors.textSec },
  filterPillTextActive: { color: Colors.white },
  // Content
  content: { padding: 16, paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  // Intervento card
  interventoCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  interventoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  urgenzaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  urgenzaText: { fontSize: 11, fontWeight: '700' },
  interventoTitle: { fontSize: 17, fontWeight: '700', color: FC.navy, marginBottom: 6 },
  interventoInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  interventoInfo: { fontSize: 13, color: Colors.textSec },
  interventoAddr: { fontSize: 12, color: Colors.textMuted, marginLeft: 20, marginBottom: 4 },
  interventoDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  ctaText: { fontSize: 14, fontWeight: '600', color: FC.accent, flex: 1 },
  // Profile
  profileCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  profileIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: FC.accentLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '700', color: FC.navy },
  profileEmail: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  profileDivider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10 },
  profileRowLabel: { fontSize: 12, color: Colors.textMuted },
  profileRowValue: { fontSize: 14, fontWeight: '500', color: FC.text, marginTop: 1 },
});
