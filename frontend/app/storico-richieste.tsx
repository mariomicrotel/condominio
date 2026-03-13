import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, StatusBadge, EmptyState } from '../src/components/SharedComponents';

export default function StoricoRichieste() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.getRichieste(token!)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="Storico Richieste" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Storico Richieste" />
      <FlatList
        data={data} keyExtractor={item => item.id} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.navy]} />}
        ListEmptyComponent={<EmptyState message="Nessuna richiesta inviata" />}
        renderItem={({ item }) => (
          <View testID={`rich-item-${item.id}`} style={s.card}>
            <View style={s.row}>
              <Text style={s.tipo}>{item.tipo_documento}</Text>
              <StatusBadge status={item.stato} />
            </View>
            <Text style={s.formato}>Formato: {item.formato}</Text>
            {item.note ? <Text style={s.note}>{item.note}</Text> : null}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipo: { fontSize: 16, fontWeight: '600', color: Colors.textMain, flex: 1, marginRight: 8 },
  formato: { fontSize: 13, color: Colors.textSec, marginBottom: 4 },
  note: { fontSize: 13, color: Colors.textSec, fontStyle: 'italic', marginBottom: 4 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
