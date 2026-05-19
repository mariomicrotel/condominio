import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STAT_ITEMS, Tab } from './types';
import { s } from './styles';

interface Props {
  stats: any;
  setTab: (t: Tab) => void;
  onRefresh: () => void;
  onNewCondominio: () => void;
  onNewAvviso: () => void;
}

export default function DashboardTab({ stats, setTab, onRefresh, onNewCondominio, onNewAvviso }: Props) {
  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}>
      <Text style={s.secTitle}>Riepilogo</Text>
      <View style={s.statsGrid}>
        {STAT_ITEMS.map((st) => (
          <TouchableOpacity key={st.key} testID={`stat-${st.key}`} style={s.statCard} onPress={() => setTab(st.tab)} activeOpacity={0.7}>
            <View style={s.statCardInner}>
              <View style={[s.statIcon, { backgroundColor: st.color + '15' }]}>
                <Ionicons name={st.icon as any} size={24} color={st.color} />
              </View>
              <Text style={s.statVal}>{stats?.[st.field] ?? 0}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[s.secTitle, { marginTop: 24 }]}>Azioni rapide</Text>
      <View style={s.quickGrid}>
        {[
          { label: 'Nuovo Condominio', icon: 'add-circle', color: '#10B981', action: onNewCondominio },
          { label: 'Pubblica Avviso', icon: 'megaphone', color: '#0D9488', action: onNewAvviso },
          { label: 'Esporta Dati', icon: 'download', color: '#3B82F6', action: () => setTab('config') },
          { label: 'Impostazioni', icon: 'settings', color: '#8B5CF6', action: () => setTab('config') },
        ].map((qa, i) => (
          <TouchableOpacity key={i} testID={`quick-${i}`} style={s.quickAction} onPress={qa.action} activeOpacity={0.7}>
            <View style={[s.quickActionIcon, { backgroundColor: qa.color + '15' }]}>
              <Ionicons name={qa.icon as any} size={22} color={qa.color} />
            </View>
            <Text style={s.quickActionLabel}>{qa.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
