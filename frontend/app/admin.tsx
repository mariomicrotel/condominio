import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge, PrimaryButton, PickerSelect } from '../src/components/SharedComponents';

type Tab = 'dashboard' | 'segnalazioni' | 'appuntamenti' | 'avvisi' | 'utenti';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'segnalazioni', label: 'Guasti', icon: 'warning' },
  { key: 'appuntamenti', label: 'Appunt.', icon: 'calendar' },
  { key: 'avvisi', label: 'Avvisi', icon: 'megaphone' },
  { key: 'utenti', label: 'Utenti', icon: 'people' },
];

export default function Admin() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [utenti, setUtenti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSeg, setModalSeg] = useState<any>(null);
  const [modalApp, setModalApp] = useState<any>(null);
  const [newAvviso, setNewAvviso] = useState({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
  const [showNewAvviso, setShowNewAvviso] = useState(false);
  const [condomini, setCondomini] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, seg, app, avv, ut, cond] = await Promise.all([
        api.getAdminDashboard(token!), api.getAdminSegnalazioni(token!),
        api.getAdminAppuntamenti(token!), api.getAdminAvvisi(token!),
        api.getAdminUtenti(token!), api.getCondomini(token!),
      ]);
      setStats(s); setSegnalazioni(seg); setAppuntamenti(app); setAvvisi(avv); setUtenti(ut); setCondomini(cond);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const updateSeg = async (id: string, stato: string) => {
    try {
      await api.updateAdminSeg(token!, id, { stato });
      setSegnalazioni(p => p.map(s => s.id === id ? { ...s, stato } : s));
      setModalSeg(null);
      Alert.alert('Aggiornato', `Stato aggiornato a: ${stato}`);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const updateApp = async (id: string, stato: string) => {
    try {
      await api.updateAdminApp(token!, id, { stato });
      setAppuntamenti(p => p.map(a => a.id === id ? { ...a, stato } : a));
      setModalApp(null);
      Alert.alert('Aggiornato', `Stato aggiornato a: ${stato}`);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const createAvviso = async () => {
    if (!newAvviso.titolo.trim() || !newAvviso.testo.trim()) { Alert.alert('Attenzione', 'Inserisci titolo e testo'); return; }
    try {
      const a = await api.createAdminAvviso(token!, { ...newAvviso, condominio_id: newAvviso.condominio_id || null });
      setAvvisi(p => [a, ...p]);
      setShowNewAvviso(false);
      setNewAvviso({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
      Alert.alert('Pubblicato', 'Avviso pubblicato con successo');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteAvviso = (id: string) => {
    Alert.alert('Elimina', 'Eliminare questo avviso?', [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteAdminAvviso(token!, id); setAvvisi(p => p.filter(a => a.id !== id));
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi uscire?', [
      { text: 'Annulla' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity testID="admin-home-btn" onPress={() => router.push('/home')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="home" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Pannello Admin</Text>
        <TouchableOpacity testID="admin-logout-btn" onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {tab === 'dashboard' && (
          <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} />}>
            <Text style={s.secTitle}>Riepilogo</Text>
            <View style={s.statsGrid}>
              {[
                { label: 'Utenti', val: stats?.totale_utenti, color: '#3B82F6', icon: 'people' },
                { label: 'Condomini', val: stats?.totale_condomini, color: '#10B981', icon: 'business' },
                { label: 'Segnalazioni', val: stats?.segnalazioni_aperte, color: '#F59E0B', icon: 'warning' },
                { label: 'Richieste', val: stats?.richieste_in_attesa, color: '#8B5CF6', icon: 'document' },
                { label: 'Appuntamenti', val: stats?.appuntamenti_da_confermare, color: '#EC4899', icon: 'calendar' },
                { label: 'Avvisi', val: stats?.totale_avvisi, color: '#0D9488', icon: 'megaphone' },
              ].map((st, i) => (
                <View key={i} style={s.statCard}>
                  <View style={[s.statIcon, { backgroundColor: st.color + '18' }]}>
                    <Ionicons name={st.icon as any} size={22} color={st.color} />
                  </View>
                  <Text style={s.statVal}>{st.val ?? 0}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {tab === 'segnalazioni' && (
          <FlatList data={segnalazioni} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessuna segnalazione</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`admin-seg-${item.id}`} style={s.listCard} onPress={() => setModalSeg(item)}>
                <View style={s.listRow}><Text style={s.listTitle}>{item.tipologia}</Text><StatusBadge status={item.stato} /></View>
                <Text style={s.listSub}>{item.user_nome} • {item.condominio_nome}</Text>
                <Text style={s.listDate}>{new Date(item.created_at).toLocaleDateString('it-IT')} • Urgenza: {item.urgenza}</Text>
              </TouchableOpacity>
            )} />
        )}

        {tab === 'appuntamenti' && (
          <FlatList data={appuntamenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun appuntamento</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`admin-app-${item.id}`} style={s.listCard} onPress={() => setModalApp(item)}>
                <View style={s.listRow}><Text style={s.listTitle}>{item.motivo}</Text><StatusBadge status={item.stato} /></View>
                <Text style={s.listSub}>{item.user_nome} • {new Date(item.data_richiesta).toLocaleDateString('it-IT')}</Text>
                <Text style={s.listDate}>{item.fascia_oraria}</Text>
              </TouchableOpacity>
            )} />
        )}

        {tab === 'avvisi' && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity testID="admin-new-avviso-btn" style={s.addBtn} onPress={() => setShowNewAvviso(true)}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuovo Avviso</Text>
            </TouchableOpacity>
            <FlatList data={avvisi} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun avviso</Text>}
              renderItem={({ item }) => (
                <View style={s.listCard}>
                  <View style={s.listRow}>
                    <Text style={s.listTitle}>{item.titolo}</Text>
                    <TouchableOpacity testID={`admin-del-avviso-${item.id}`} onPress={() => deleteAvviso(item.id)}>
                      <Ionicons name="trash" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.listSub} numberOfLines={2}>{item.testo}</Text>
                  <Text style={s.listDate}>{item.categoria} • {new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
                </View>
              )} />
          </View>
        )}

        {tab === 'utenti' && (
          <FlatList data={utenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun utente</Text>}
            renderItem={({ item }) => (
              <View testID={`admin-user-${item.id}`} style={s.listCard}>
                <Text style={s.listTitle}>{item.nome} {item.cognome}</Text>
                <Text style={s.listSub}>{item.email} • {item.ruolo}</Text>
                {item.condomini_nomi?.length > 0 && <Text style={s.listDate}>Condomini: {item.condomini_nomi.join(', ')}</Text>}
              </View>
            )} />
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={s.bottomTabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} testID={`admin-tab-${t.key}`} style={s.tabBtn} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as any} size={22} color={tab === t.key ? Colors.navy : Colors.textMuted} />
            <Text style={[s.tabLabel, tab === t.key && { color: Colors.navy, fontWeight: '600' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal: Update Segnalazione */}
      <Modal visible={!!modalSeg} transparent animationType="slide" onRequestClose={() => setModalSeg(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Aggiorna Segnalazione</Text>
            <Text style={s.modalSub}>{modalSeg?.tipologia} — {modalSeg?.user_nome}</Text>
            <Text style={s.modalDesc}>{modalSeg?.descrizione}</Text>
            <Text style={s.modalLabel}>Cambia stato:</Text>
            {['Presa in carico', 'In lavorazione', 'Risolta'].map(st => (
              <TouchableOpacity key={st} testID={`seg-status-${st}`} style={[s.statusBtn, modalSeg?.stato === st && { backgroundColor: Colors.skyLight }]} onPress={() => updateSeg(modalSeg.id, st)}>
                <Text style={s.statusText}>{st}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalSeg(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Update Appuntamento */}
      <Modal visible={!!modalApp} transparent animationType="slide" onRequestClose={() => setModalApp(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Gestisci Appuntamento</Text>
            <Text style={s.modalSub}>{modalApp?.motivo} — {modalApp?.user_nome}</Text>
            <Text style={s.modalDesc}>Data: {modalApp?.data_richiesta ? new Date(modalApp.data_richiesta).toLocaleDateString('it-IT') : ''} • {modalApp?.fascia_oraria}</Text>
            <Text style={s.modalLabel}>Cambia stato:</Text>
            {['Confermato', 'Completato', 'Annullato'].map(st => (
              <TouchableOpacity key={st} testID={`app-status-${st}`} style={[s.statusBtn, modalApp?.stato === st && { backgroundColor: Colors.skyLight }]} onPress={() => updateApp(modalApp.id, st)}>
                <Text style={s.statusText}>{st}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalApp(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: New Avviso */}
      <Modal visible={showNewAvviso} transparent animationType="slide" onRequestClose={() => setShowNewAvviso(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Avviso</Text>
            <TextInput testID="avviso-titolo-input" style={s.input} placeholder="Titolo *" value={newAvviso.titolo} onChangeText={v => setNewAvviso(p => ({ ...p, titolo: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="avviso-testo-input" style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Testo *" value={newAvviso.testo} onChangeText={v => setNewAvviso(p => ({ ...p, testo: v }))} multiline placeholderTextColor={Colors.textMuted} />
            <PickerSelect label="Categoria" value={newAvviso.categoria} options={['Avviso generico', 'Convocazione assemblea', 'Lavori in corso', 'Scadenza pagamento', 'Comunicazione urgente']} onSelect={v => setNewAvviso(p => ({ ...p, categoria: v }))} testID="avviso-cat-picker" />
            <PickerSelect label="Condominio (vuoto = tutti)" value={condomini.find(c => c.id === newAvviso.condominio_id)?.nome || 'Tutti i condomini'} options={['Tutti i condomini', ...condomini.map(c => c.nome)]} onSelect={v => { const c = condomini.find(c => c.nome === v); setNewAvviso(p => ({ ...p, condominio_id: c?.id || '' })); }} testID="avviso-cond-picker" />
            <PrimaryButton title="Pubblica Avviso" onPress={createAvviso} testID="avviso-publish-btn" style={{ marginTop: 8 }} />
            <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={() => setShowNewAvviso(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  content: { padding: 16, paddingBottom: 16 },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  statCard: { width: '50%', padding: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal: { fontSize: 28, fontWeight: '700', color: Colors.textMain },
  statLabel: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  listCard: { backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  listTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, flex: 1, marginRight: 8 },
  listSub: { fontSize: 13, color: Colors.textSec, marginBottom: 4 },
  listDate: { fontSize: 12, color: Colors.textMuted },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy, margin: 16, marginBottom: 0, padding: 12, borderRadius: 10 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white, marginLeft: 6 },
  bottomTabs: { flexDirection: 'row', backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  modalSub: { fontSize: 15, color: Colors.textSec, marginBottom: 4 },
  modalDesc: { fontSize: 14, color: Colors.textSec, marginBottom: 16, lineHeight: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMain, marginBottom: 8 },
  statusBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  statusText: { fontSize: 15, color: Colors.textMain, textAlign: 'center' },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  input: { height: 52, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 16, color: Colors.textMain, marginBottom: 12, backgroundColor: Colors.bg },
});
