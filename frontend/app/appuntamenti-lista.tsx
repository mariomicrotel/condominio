import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, StatusBadge, EmptyState } from '../src/components/SharedComponents';

export default function AppuntamentiLista() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.getAppuntamenti(token!)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="I miei Appuntamenti" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="I miei Appuntamenti" />
      <FlatList
        data={data} keyExtractor={item => item.id} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.navy]} />}
        ListEmptyComponent={<EmptyState message="Nessun appuntamento prenotato" />}
        renderItem={({ item }) => (
          <View testID={`app-item-${item.id}`} style={s.card}>
            <View style={s.row}>
              <Text style={s.motivo}>{item.motivo}</Text>
              <StatusBadge status={item.stato} />
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Data richiesta:</Text>
              <Text style={s.infoVal}>{new Date(item.data_richiesta).toLocaleDateString('it-IT')}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fascia:</Text>
              <Text style={s.infoVal}>{item.fascia_oraria}</Text>
            </View>
            {item.data_confermata ? (
              <View style={s.confirmed}>
                <Text style={s.confirmedText}>Confermato: {item.data_confermata}</Text>
              </View>
            ) : null}
            {item.note_admin ? <Text style={s.noteAdmin}>Nota studio: {item.note_admin}</Text> : null}
            <Text style={s.date}>{new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  motivo: { fontSize: 16, fontWeight: '600', color: Colors.textMain, flex: 1, marginRight: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { fontSize: 13, color: Colors.textMuted, width: 120 },
  infoVal: { fontSize: 13, color: Colors.textMain, fontWeight: '500' },
  confirmed: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 8, marginTop: 8 },
  confirmedText: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  noteAdmin: { fontSize: 13, color: Colors.navy, marginTop: 8, fontStyle: 'italic', backgroundColor: Colors.skyLight, padding: 8, borderRadius: 6 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },
});
