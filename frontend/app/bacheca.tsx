import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, EmptyState } from '../src/components/SharedComponents';

const CAT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Avviso generico': { bg: '#E0F2FE', text: '#0369A1', icon: 'megaphone' },
  'Convocazione assemblea': { bg: '#FEF3C7', text: '#92400E', icon: 'people' },
  'Lavori in corso': { bg: '#FFEDD5', text: '#C2410C', icon: 'construct' },
  'Scadenza pagamento': { bg: '#FEE2E2', text: '#DC2626', icon: 'card' },
  'Comunicazione urgente': { bg: '#FEE2E2', text: '#DC2626', icon: 'alert-circle' },
};

export default function Bacheca() {
  const { token } = useAuth();
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setAvvisi(await api.getAvvisi(token!)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await api.markLetto(token!, id);
      setAvvisi(prev => prev.map(a => a.id === id ? { ...a, letto: true } : a));
    } catch {}
  };

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="Bacheca Condominiale" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Bacheca Condominiale" />
      <FlatList
        data={avvisi} keyExtractor={item => item.id} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.navy]} />}
        ListEmptyComponent={<EmptyState message="Nessun avviso pubblicato" />}
        renderItem={({ item }) => {
          const cat = CAT_COLORS[item.categoria] || CAT_COLORS['Avviso generico'];
          return (
            <TouchableOpacity testID={`avviso-${item.id}`} style={[s.card, !item.letto && s.unread]} onPress={() => markRead(item.id)} activeOpacity={0.8}>
              <View style={s.cardTop}>
                <View style={[s.catBadge, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.text} />
                  <Text style={[s.catText, { color: cat.text }]}>{item.categoria}</Text>
                </View>
                {!item.letto && <View style={s.dot} />}
              </View>
              <Text style={s.title}>{item.titolo}</Text>
              <Text style={s.testo} numberOfLines={3}>{item.testo}</Text>
              <Text style={s.date}>{new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.sky },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.sky },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textMain, marginBottom: 6 },
  testo: { fontSize: 14, color: Colors.textSec, lineHeight: 21 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 10 },
});
