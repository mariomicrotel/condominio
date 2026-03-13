import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, EmptyState } from '../src/components/SharedComponents';

export default function Condominio() {
  const { user, token } = useAuth();
  const [estratti, setEstratti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setEstratti(await api.getEstrattoConto(token!)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const condomini = user?.condomini || [];

  if (loading) return <SafeAreaView style={s.safe}><ScreenHeader title="Il mio Condominio" /><ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.navy} /></SafeAreaView>;

  if (condomini.length === 0) return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Il mio Condominio" />
      <EmptyState message="Non sei ancora associato a nessun condominio. Contatta lo studio per l'abilitazione." />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Il mio Condominio" />
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.navy]} />}>
        {condomini.map((cond: any, idx: number) => {
          const ec = estratti.find(e => e.condominio_id === cond.id);
          return (
            <View key={idx}>
              {/* Condominium Info Card */}
              <View style={s.condCard}>
                <View style={s.condHeader}>
                  <View style={s.condIcon}>
                    <Ionicons name="business" size={24} color={Colors.sky} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.condName}>{cond.nome}</Text>
                    <Text style={s.condAddr}>{cond.indirizzo}</Text>
                  </View>
                </View>
                <View style={s.infoGrid}>
                  {cond.codice_fiscale ? <InfoRow icon="card" label="Codice Fiscale" value={cond.codice_fiscale} /> : null}
                  {cond.unita_immobiliare ? <InfoRow icon="home" label="Unità Immobiliare" value={cond.unita_immobiliare} /> : null}
                  {cond.qualita ? <InfoRow icon="person" label="Qualità" value={cond.qualita} /> : null}
                  <InfoRow icon="shield-checkmark" label="Amministratore" value="Studio Tardugno & Bonifacio" />
                </View>
              </View>

              {/* Estratto Conto */}
              {ec ? (
                <View style={s.ecCard}>
                  <Text style={s.ecTitle}>Estratto Conto</Text>
                  <Text style={s.ecPeriodo}>{ec.periodo || 'Periodo corrente'}</Text>
                  
                  <View style={s.ecGrid}>
                    <View style={s.ecItem}>
                      <Text style={s.ecLabel}>Quote Versate</Text>
                      <Text style={[s.ecVal, { color: '#10B981' }]}>€ {ec.quote_versate?.toFixed(2)}</Text>
                    </View>
                    <View style={s.ecItem}>
                      <Text style={s.ecLabel}>Quote da Versare</Text>
                      <Text style={[s.ecVal, { color: '#F59E0B' }]}>€ {ec.quote_da_versare?.toFixed(2)}</Text>
                    </View>
                  </View>
                  
                  <View style={s.saldoRow}>
                    <Text style={s.saldoLabel}>Saldo</Text>
                    <Text style={[s.saldoVal, { color: ec.saldo >= 0 ? '#10B981' : '#EF4444' }]}>€ {ec.saldo?.toFixed(2)}</Text>
                  </View>

                  {ec.scadenza ? (
                    <View style={s.scadenzaRow}>
                      <Ionicons name="calendar-outline" size={16} color="#D97706" />
                      <Text style={s.scadenzaText}>Prossima scadenza: {ec.scadenza}</Text>
                    </View>
                  ) : null}

                  {ec.note ? <Text style={s.ecNote}>{ec.note}</Text> : null}
                  <Text style={s.ecUpdate}>Ultimo agg.: {new Date(ec.updated_at).toLocaleDateString('it-IT')}</Text>
                </View>
              ) : (
                <View style={s.noEc}>
                  <Ionicons name="receipt-outline" size={28} color={Colors.textMuted} />
                  <Text style={s.noEcText}>Estratto conto non ancora disponibile per questo condominio.</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={16} color={Colors.sky} />
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  condCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  condHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  condIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  condName: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  condAddr: { fontSize: 13, color: Colors.textSec, marginTop: 2 },
  infoGrid: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: Colors.textMuted, marginLeft: 8, marginRight: 4 },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.textMain, flex: 1 },
  ecCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: Colors.sky, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  ecTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  ecPeriodo: { fontSize: 13, color: Colors.textMuted, marginTop: 2, marginBottom: 16 },
  ecGrid: { flexDirection: 'row', marginBottom: 14 },
  ecItem: { flex: 1, backgroundColor: Colors.bg, borderRadius: 10, padding: 14, marginRight: 8 },
  ecLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  ecVal: { fontSize: 20, fontWeight: '700' },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 10, padding: 14, marginBottom: 10 },
  saldoLabel: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  saldoVal: { fontSize: 22, fontWeight: '700' },
  scadenzaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8 },
  scadenzaText: { fontSize: 13, color: '#92400E', marginLeft: 8, fontWeight: '500' },
  ecNote: { fontSize: 13, color: Colors.textSec, fontStyle: 'italic', marginBottom: 8 },
  ecUpdate: { fontSize: 11, color: Colors.textMuted },
  noEc: { backgroundColor: Colors.white, borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 14 },
  noEcText: { fontSize: 14, color: Colors.textMuted, marginTop: 10, textAlign: 'center' },
});
