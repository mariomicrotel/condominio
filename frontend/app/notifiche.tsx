import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, EmptyState } from '../src/components/SharedComponents';

const ICON_MAP: Record<string, { icon: string; color: string }> = {
  warning: { icon: 'warning', color: '#F59E0B' },
  calendar: { icon: 'calendar', color: '#8B5CF6' },
  document: { icon: 'document-text', color: '#3B82F6' },
  announcement: { icon: 'megaphone', color: '#0D9488' },
  finance: { icon: 'cash', color: '#10B981' },
  info: { icon: 'information-circle', color: '#6B7280' },
};

export default function Notifiche() {
  const { token } = useAuth();
  const [notifiche, setNotifiche] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setNotifiche(await api.getNotifiche(token!)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await api.markNotificaLetta(token!, id);
      setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letto: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.markAllLette(token!);
      setNotifiche(prev => prev.map(n => ({ ...n, letto: true })));
    } catch {}
  };

  const unreadCount = notifiche.filter(n => !n.letto).length;

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="Notifiche" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Notifiche" />
      {unreadCount > 0 && (
        <TouchableOpacity testID="mark-all-read-btn" style={s.markAllBtn} onPress={markAllRead}>
          <Ionicons name="checkmark-done" size={18} color={Colors.sky} />
          <Text style={s.markAllText}>Segna tutte come lette ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifiche} keyExtractor={item => item.id} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.navy]} />}
        ListEmptyComponent={<EmptyState message="Nessuna notifica" />}
        renderItem={({ item }) => {
          const iconData = ICON_MAP[item.tipo] || ICON_MAP.info;
          return (
            <TouchableOpacity testID={`notifica-${item.id}`} style={[s.card, !item.letto && s.unread]} onPress={() => markRead(item.id)} activeOpacity={0.8}>
              <View style={[s.iconWrap, { backgroundColor: iconData.color + '18' }]}>
                <Ionicons name={iconData.icon as any} size={20} color={iconData.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title} numberOfLines={1}>{item.titolo}</Text>
                  {!item.letto && <View style={s.dot} />}
                </View>
                <Text style={s.msg} numberOfLines={2}>{item.messaggio}</Text>
                <Text style={s.date}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Adesso';
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
  return date.toLocaleDateString('it-IT');
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  markAllText: { fontSize: 14, fontWeight: '500', color: Colors.sky, marginLeft: 6 },
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  unread: { backgroundColor: '#F0F9FF', borderLeftWidth: 3, borderLeftColor: Colors.sky },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textMain, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.sky, marginLeft: 6 },
  msg: { fontSize: 13, color: Colors.textSec, lineHeight: 19 },
  date: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
