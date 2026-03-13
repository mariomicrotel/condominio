import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, StatusBadge, EmptyState } from '../src/components/SharedComponents';

export default function SegnalazioniLista() {
  const { token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getSegnalazioni(token!);
      setData(res);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="Le mie Segnalazioni" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Le mie Segnalazioni" />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.navy]} />}
        ListEmptyComponent={<EmptyState message="Nessuna segnalazione inviata" />}
        renderItem={({ item }) => (
          <View testID={`seg-item-${item.id}`} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.protocollo}>{item.protocollo}</Text>
              <StatusBadge status={item.stato} />
            </View>
            <Text style={s.tipo}>{item.tipologia}</Text>
            <Text style={s.desc} numberOfLines={2}>{item.descrizione}</Text>
            <View style={s.cardFooter}>
              <Text style={s.date}>{new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
              <View style={[s.urgBadge, item.urgenza === 'Urgente' && { backgroundColor: '#FEE2E2' }, item.urgenza === 'Alta' && { backgroundColor: '#FEF3C7' }]}>
                <Text style={[s.urgText, item.urgenza === 'Urgente' && { color: '#DC2626' }, item.urgenza === 'Alta' && { color: '#D97706' }]}>{item.urgenza}</Text>
              </View>
            </View>
            {item.note_admin ? <Text style={s.noteAdmin}>Risposta: {item.note_admin}</Text> : null}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  protocollo: { fontSize: 13, fontWeight: '600', color: Colors.sky },
  tipo: { fontSize: 16, fontWeight: '600', color: Colors.textMain, marginBottom: 4 },
  desc: { fontSize: 14, color: Colors.textSec, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: Colors.textMuted },
  urgBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgText: { fontSize: 11, fontWeight: '600', color: Colors.textSec },
  noteAdmin: { fontSize: 13, color: Colors.navy, marginTop: 8, fontStyle: 'italic', backgroundColor: Colors.skyLight, padding: 8, borderRadius: 6 },
});
