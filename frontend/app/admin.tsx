import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { StatusBadge, PrimaryButton, PickerSelect } from '../src/components/SharedComponents';

type Tab = 'dashboard' | 'condomini' | 'utenti' | 'segnalazioni' | 'appuntamenti' | 'avvisi';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'condomini', label: 'Cond.', icon: 'business' },
  { key: 'utenti', label: 'Utenti', icon: 'people' },
  { key: 'segnalazioni', label: 'Guasti', icon: 'warning' },
  { key: 'appuntamenti', label: 'App.', icon: 'calendar' },
  { key: 'avvisi', label: 'Avvisi', icon: 'megaphone' },
];

const QUALITA_OPT = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];

export default function Admin() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [condomini, setCondomini] = useState<any[]>([]);
  const [utenti, setUtenti] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Modals
  const [modalSeg, setModalSeg] = useState<any>(null);
  const [modalApp, setModalApp] = useState<any>(null);
  const [showNewAvviso, setShowNewAvviso] = useState(false);
  const [showNewCond, setShowNewCond] = useState(false);
  const [showAssocModal, setShowAssocModal] = useState<any>(null); // user object
  const [newAvviso, setNewAvviso] = useState({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
  const [newCond, setNewCond] = useState({ nome: '', indirizzo: '', codice_fiscale: '', note: '' });
  const [assocForm, setAssocForm] = useState({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cond, seg, app, avv, ut] = await Promise.all([
        api.getAdminDashboard(token!), api.getCondomini(token!),
        api.getAdminSegnalazioni(token!), api.getAdminAppuntamenti(token!),
        api.getAdminAvvisi(token!), api.getAdminUtenti(token!),
      ]);
      setStats(s); setCondomini(cond); setSegnalazioni(seg); setAppuntamenti(app); setAvvisi(avv); setUtenti(ut);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // === Segnalazioni ===
  const updateSeg = async (id: string, stato: string) => {
    try {
      await api.updateAdminSeg(token!, id, { stato });
      setSegnalazioni(p => p.map(s => s.id === id ? { ...s, stato } : s));
      setModalSeg(null);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  // === Appuntamenti ===
  const updateApp = async (id: string, stato: string) => {
    try {
      await api.updateAdminApp(token!, id, { stato });
      setAppuntamenti(p => p.map(a => a.id === id ? { ...a, stato } : a));
      setModalApp(null);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  // === Condomini ===
  const createCond = async () => {
    if (!newCond.nome.trim() || !newCond.indirizzo.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo sono obbligatori'); return; }
    try {
      const c = await api.createCondominio(token!, newCond);
      setCondomini(p => [...p, c]);
      setShowNewCond(false);
      setNewCond({ nome: '', indirizzo: '', codice_fiscale: '', note: '' });
      Alert.alert('Creato', 'Condominio aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteCond = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteCondominio(token!, id);
        setCondomini(p => p.filter(c => c.id !== id));
      }},
    ]);
  };

  // === Avvisi ===
  const createAvviso = async () => {
    if (!newAvviso.titolo.trim() || !newAvviso.testo.trim()) { Alert.alert('Attenzione', 'Inserisci titolo e testo'); return; }
    try {
      const a = await api.createAdminAvviso(token!, { ...newAvviso, condominio_id: newAvviso.condominio_id || null });
      setAvvisi(p => [a, ...p]);
      setShowNewAvviso(false);
      setNewAvviso({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
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

  // === Associazioni ===
  const associaUtente = async () => {
    if (!assocForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    try {
      await api.associaUtente(token!, { user_id: showAssocModal.id, ...assocForm });
      setShowAssocModal(null);
      setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });
      loadAll(); // Reload to update user associations
      Alert.alert('Associato', 'Utente associato al condominio');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const disassociaUtente = (assocId: string, userName: string, condName: string) => {
    Alert.alert('Rimuovi associazione', `Rimuovere ${userName} da "${condName}"?`, [
      { text: 'Annulla' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try {
          await api.disassociaUtente(token!, assocId);
          loadAll();
        } catch (e: any) { Alert.alert('Errore', e.message); }
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
        {/* ====== DASHBOARD ====== */}
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

        {/* ====== CONDOMINI ====== */}
        {tab === 'condomini' && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity testID="admin-new-cond-btn" style={s.addBtn} onPress={() => setShowNewCond(true)}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={s.addBtnText}>Nuovo Condominio</Text>
            </TouchableOpacity>
            <FlatList data={condomini} keyExtractor={i => i.id} contentContainerStyle={s.content}
              ListEmptyComponent={<Text style={s.emptyText}>Nessun condominio</Text>}
              renderItem={({ item }) => (
                <View testID={`admin-cond-${item.id}`} style={s.listCard}>
                  <View style={s.listRow}>
                    <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="business" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle}>{item.nome}</Text>
                      <Text style={s.listSub}>{item.indirizzo}</Text>
                      {item.codice_fiscale ? <Text style={s.listDate}>CF: {item.codice_fiscale}</Text> : null}
                    </View>
                    <TouchableOpacity testID={`admin-del-cond-${item.id}`} onPress={() => deleteCond(item.id, item.nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )} />
          </View>
        )}

        {/* ====== UTENTI ====== */}
        {tab === 'utenti' && (
          <FlatList data={utenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
            ListEmptyComponent={<Text style={s.emptyText}>Nessun utente registrato</Text>}
            renderItem={({ item }) => (
              <View testID={`admin-user-${item.id}`} style={s.listCard}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: item.abilitato ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Ionicons name="person" size={18} color={item.abilitato ? '#16A34A' : '#D97706'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.nome} {item.cognome}</Text>
                    <Text style={s.listSub}>{item.email}</Text>
                    {item.telefono ? <Text style={s.listDate}>Tel: {item.telefono}</Text> : null}
                  </View>
                  <View style={[s.statusDot, { backgroundColor: item.abilitato ? '#10B981' : '#F59E0B' }]} />
                </View>

                {/* Associazioni attuali */}
                {item.associazioni && item.associazioni.length > 0 && (
                  <View style={s.assocSection}>
                    <Text style={s.assocTitle}>Condomini associati:</Text>
                    {item.associazioni.map((a: any) => (
                      <View key={a.assoc_id} style={s.assocRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.assocName}>{a.condominio_nome}</Text>
                          <Text style={s.assocInfo}>{a.unita_immobiliare} • {a.qualita}</Text>
                        </View>
                        <TouchableOpacity testID={`disassocia-${a.assoc_id}`} onPress={() => disassociaUtente(a.assoc_id, `${item.nome} ${item.cognome}`, a.condominio_nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close-circle" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {!item.abilitato && (
                  <View style={s.notAbilitato}>
                    <Ionicons name="time-outline" size={14} color="#D97706" />
                    <Text style={s.notAbilitatoText}>In attesa di abilitazione</Text>
                  </View>
                )}

                <TouchableOpacity testID={`associa-btn-${item.id}`} style={s.assocBtn} onPress={() => { setShowAssocModal(item); setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' }); }}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.sky} />
                  <Text style={s.assocBtnText}>Associa a condominio</Text>
                </TouchableOpacity>
              </View>
            )} />
        )}

        {/* ====== SEGNALAZIONI ====== */}
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

        {/* ====== APPUNTAMENTI ====== */}
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

        {/* ====== AVVISI ====== */}
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
      </View>

      {/* Bottom Tabs */}
      <View style={s.bottomTabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} testID={`admin-tab-${t.key}`} style={s.tabBtn} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as any} size={20} color={tab === t.key ? Colors.navy : Colors.textMuted} />
            <Text style={[s.tabLabel, tab === t.key && { color: Colors.navy, fontWeight: '600' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ====== MODAL: Aggiorna Segnalazione ====== */}
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

      {/* ====== MODAL: Aggiorna Appuntamento ====== */}
      <Modal visible={!!modalApp} transparent animationType="slide" onRequestClose={() => setModalApp(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Gestisci Appuntamento</Text>
            <Text style={s.modalSub}>{modalApp?.motivo} — {modalApp?.user_nome}</Text>
            <Text style={s.modalDesc}>Data: {modalApp?.data_richiesta ? new Date(modalApp.data_richiesta).toLocaleDateString('it-IT') : ''} • {modalApp?.fascia_oraria}</Text>
            {['Confermato', 'Completato', 'Annullato'].map(st => (
              <TouchableOpacity key={st} testID={`app-status-${st}`} style={[s.statusBtn, modalApp?.stato === st && { backgroundColor: Colors.skyLight }]} onPress={() => updateApp(modalApp.id, st)}>
                <Text style={s.statusText}>{st}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalApp(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ====== MODAL: Nuovo Condominio ====== */}
      <Modal visible={showNewCond} transparent animationType="slide" onRequestClose={() => setShowNewCond(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Condominio</Text>
            <TextInput testID="cond-nome-input" style={s.input} placeholder="Nome condominio *" value={newCond.nome} onChangeText={v => setNewCond(p => ({ ...p, nome: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-indirizzo-input" style={s.input} placeholder="Indirizzo *" value={newCond.indirizzo} onChangeText={v => setNewCond(p => ({ ...p, indirizzo: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-cf-input" style={s.input} placeholder="Codice Fiscale" value={newCond.codice_fiscale} onChangeText={v => setNewCond(p => ({ ...p, codice_fiscale: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="cond-note-input" style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Note" value={newCond.note} onChangeText={v => setNewCond(p => ({ ...p, note: v }))} multiline placeholderTextColor={Colors.textMuted} />
            <PrimaryButton title="Crea Condominio" onPress={createCond} testID="cond-create-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewCond(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ====== MODAL: Associa Utente a Condominio ====== */}
      <Modal visible={!!showAssocModal} transparent animationType="slide" onRequestClose={() => setShowAssocModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Associa a Condominio</Text>
            <Text style={s.modalSub}>{showAssocModal?.nome} {showAssocModal?.cognome} ({showAssocModal?.email})</Text>

            <PickerSelect label="Condominio *" value={condomini.find(c => c.id === assocForm.condominio_id)?.nome || ''}
              options={condomini.map(c => c.nome)}
              onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) setAssocForm(p => ({ ...p, condominio_id: c.id })); }}
              testID="assoc-cond-picker" />

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Unità immobiliare</Text>
              <TextInput testID="assoc-unita-input" style={s.input} placeholder="Es: Interno 5, Piano 2" value={assocForm.unita_immobiliare} onChangeText={v => setAssocForm(p => ({ ...p, unita_immobiliare: v }))} placeholderTextColor={Colors.textMuted} />
            </View>

            <PickerSelect label="Qualità *" value={assocForm.qualita} options={QUALITA_OPT} onSelect={v => setAssocForm(p => ({ ...p, qualita: v }))} testID="assoc-qualita-picker" />

            <PrimaryButton title="Associa Utente" onPress={associaUtente} testID="assoc-confirm-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAssocModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ====== MODAL: Nuovo Avviso ====== */}
      <Modal visible={showNewAvviso} transparent animationType="slide" onRequestClose={() => setShowNewAvviso(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Avviso</Text>
            <TextInput testID="avviso-titolo-input" style={s.input} placeholder="Titolo *" value={newAvviso.titolo} onChangeText={v => setNewAvviso(p => ({ ...p, titolo: v }))} placeholderTextColor={Colors.textMuted} />
            <TextInput testID="avviso-testo-input" style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Testo *" value={newAvviso.testo} onChangeText={v => setNewAvviso(p => ({ ...p, testo: v }))} multiline placeholderTextColor={Colors.textMuted} />
            <PickerSelect label="Categoria" value={newAvviso.categoria} options={['Avviso generico', 'Convocazione assemblea', 'Lavori in corso', 'Scadenza pagamento', 'Comunicazione urgente']} onSelect={v => setNewAvviso(p => ({ ...p, categoria: v }))} testID="avviso-cat-picker" />
            <PickerSelect label="Condominio (vuoto = tutti)" value={condomini.find(c => c.id === newAvviso.condominio_id)?.nome || 'Tutti i condomini'} options={['Tutti i condomini', ...condomini.map(c => c.nome)]} onSelect={v => { const c = condomini.find(c => c.nome === v); setNewAvviso(p => ({ ...p, condominio_id: c?.id || '' })); }} testID="avviso-cond-picker" />
            <PrimaryButton title="Pubblica Avviso" onPress={createAvviso} testID="avviso-publish-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewAvviso(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
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
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, flex: 1, marginRight: 8 },
  listSub: { fontSize: 13, color: Colors.textSec, marginBottom: 4, marginLeft: 46 },
  listDate: { fontSize: 12, color: Colors.textMuted, marginLeft: 46 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy, margin: 16, marginBottom: 0, padding: 12, borderRadius: 10 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white, marginLeft: 6 },
  // User association styles
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  assocSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  assocTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 6, marginLeft: 46 },
  assocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginLeft: 46 },
  assocName: { fontSize: 13, fontWeight: '500', color: Colors.textMain },
  assocInfo: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  notAbilitato: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 46 },
  notAbilitatoText: { fontSize: 12, color: '#D97706', fontWeight: '500', marginLeft: 4 },
  assocBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, marginLeft: 46 },
  assocBtnText: { fontSize: 13, fontWeight: '600', color: Colors.sky, marginLeft: 6 },
  // Bottom tabs
  bottomTabs: { flexDirection: 'row', backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  modalSub: { fontSize: 15, color: Colors.textSec, marginBottom: 4 },
  modalDesc: { fontSize: 14, color: Colors.textSec, marginBottom: 16, lineHeight: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMain, marginBottom: 8 },
  statusBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  statusText: { fontSize: 15, color: Colors.textMain, textAlign: 'center' },
  closeBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  closeBtnText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  input: { height: 52, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 16, color: Colors.textMain, marginBottom: 12, backgroundColor: Colors.bg },
  inputGroup: { marginBottom: 4 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSec, marginBottom: 6 },
});
