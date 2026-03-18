import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'sopralluoghi' | 'condomini' | 'segnalazioni';

const NAV: { key: Tab; label: string; icon: string; color: string }[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: 'grid',     color: '#6366F1' },
  { key: 'sopralluoghi', label: 'Sopralluoghi', icon: 'search',   color: '#8B5CF6' },
  { key: 'condomini',    label: 'Condomini',    icon: 'business',  color: '#10B981' },
  { key: 'segnalazioni', label: 'Segnalazioni', icon: 'warning',   color: '#EF4444' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatoBadge = ({ stato }: { stato: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    'in_corso':      { bg: '#FEF3C7', color: '#D97706' },
    'completato':    { bg: '#DCFCE7', color: '#15803D' },
    'Inviata':       { bg: '#DBEAFE', color: '#1D4ED8' },
    'In lavorazione':{ bg: '#FEF3C7', color: '#D97706' },
    'Chiusa':        { bg: '#DCFCE7', color: '#15803D' },
    'Annullata':     { bg: '#FEE2E2', color: '#DC2626' },
  };
  const c = map[stato] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.color }}>{stato}</Text>
    </View>
  );
};

// ─── Table Component ──────────────────────────────────────────────────────────
function DataTable({ columns, data, onRowPress, emptyText = 'Nessun dato' }: {
  columns: { key: string; label: string; flex?: number; render?: (row: any) => React.ReactNode }[];
  data: any[]; onRowPress?: (row: any) => void; emptyText?: string;
}) {
  if (data.length === 0) {
    return (
      <View style={dt.empty}>
        <Ionicons name="albums-outline" size={40} color={Colors.textMuted} />
        <Text style={dt.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <View style={dt.wrap}>
      <View style={dt.header}>
        {columns.map(c => (
          <Text key={c.key} style={[dt.headerCell, { flex: c.flex || 1 }]}>{c.label}</Text>
        ))}
      </View>
      {data.map((row, i) => (
        <TouchableOpacity
          key={row.id || i}
          style={[dt.row, i % 2 === 0 && dt.rowAlt]}
          onPress={() => onRowPress?.(row)}
          activeOpacity={onRowPress ? 0.7 : 1}
        >
          {columns.map(c => (
            <View key={c.key} style={{ flex: c.flex || 1 }}>
              {c.render ? c.render(row) : (
                <Text style={dt.cell} numberOfLines={2}>{row[c.key] ?? '—'}</Text>
              )}
            </View>
          ))}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const dt = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', backgroundColor: Colors.navy, padding: 12 },
  headerCell: { fontSize: 12, fontWeight: '700', color: Colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'center' },
  rowAlt: { backgroundColor: Colors.bg },
  cell: { fontSize: 14, color: Colors.textMain },
  empty: { alignItems: 'center', paddingVertical: 48, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 12 },
});

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function DeskModal({ visible, title, onClose, children, width = 600 }: {
  visible: boolean; title: string; onClose: () => void;
  children: React.ReactNode; width?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={[dm.card, { width }]}>
          <View style={dm.header}>
            <Text style={dm.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
});

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder = 'Cerca...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={sb.wrap}>
      <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        style={sb.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 42, marginBottom: 16 },
  input: { flex: 1, fontSize: 14, color: Colors.textMain, outlineStyle: 'none' } as any,
});

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <View style={ph.wrap}>
      <View>
        <Text style={ph.title}>{title}</Text>
        {subtitle && <Text style={ph.sub}>{subtitle}</Text>}
      </View>
      {actions && <View style={ph.actions}>{actions}</View>}
    </View>
  );
}
const ph = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  sub: { fontSize: 14, color: Colors.textSec, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
});

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({ label, icon, onPress, color = Colors.navy, outline = false, small = false }: {
  label: string; icon?: string; onPress: () => void;
  color?: string; outline?: boolean; small?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        btnS.btn,
        small && btnS.small,
        outline ? [btnS.outline, { borderColor: color }] : { backgroundColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon as any} size={small ? 14 : 16} color={outline ? color : Colors.white} style={{ marginRight: 6 }} />}
      <Text style={[btnS.text, small && btnS.smallText, outline && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const btnS = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 18, borderRadius: 10 },
  small: { height: 32, paddingHorizontal: 12 },
  outline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  text: { fontSize: 14, fontWeight: '600', color: Colors.white },
  smallText: { fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CollaboratoreDesktop() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Data
  const [sopralluoghi, setSopralluoghi] = useState<any[]>([]);
  const [condomini, setCondomini] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search states
  const [searchSop, setSearchSop] = useState('');
  const [searchCond, setSearchCond] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sop, cond, seg] = await Promise.all([
        api.getSopralluoghi(token).catch(() => []),
        api.getCondomini(token).catch(() => []),
        api.getAdminSegnalazioni(token).catch(() => []),
      ]);
      setSopralluoghi(Array.isArray(sop) ? sop : []);
      setCondomini(Array.isArray(cond) ? cond : []);
      setSegnalazioni(Array.isArray(seg) ? seg : []);
    } catch (e: any) {
      console.log('Load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAll(); }, []);

  const handleLogout = () => {
    Alert.alert('Disconnessione', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/desktop/login'); } }
    ]);
  };

  // ── Checklist helpers ─────────────────────────────────────────────────────
  const updateChecklistItem = async (sopId: string, itemId: string, stato: string) => {
    try {
      const updated = await api.updateChecklistItem(token!, sopId, itemId, stato);
      setSopralluoghi(p => p.map(s => s.id === sopId ? updated : s));
      if (selected?.id === sopId) setSelected(updated);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const filteredSop = searchSop.trim()
    ? sopralluoghi.filter(s => {
        const condName = condomini.find(c => c.id === s.condominio_id)?.nome || '';
        return [condName, s.stato, s.note].join(' ').toLowerCase().includes(searchSop.toLowerCase());
      })
    : sopralluoghi;
  const filteredCond = searchCond.trim()
    ? condomini.filter(c => [c.nome, c.indirizzo, c.citta].join(' ').toLowerCase().includes(searchCond.toLowerCase()))
    : condomini;

  // Stats
  const sopInCorso = sopralluoghi.filter(s => s.stato === 'in_corso').length;
  const sopCompletati = sopralluoghi.filter(s => s.stato === 'completato').length;
  const totalAnomalies = sopralluoghi.reduce((sum, s) => {
    const items = s.checklist || [];
    return sum + items.filter((i: any) => i.stato === 'anomalia').length;
  }, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.shell}>
      {/* ── SIDEBAR ── */}
      <View style={s.sidebar}>
        <View style={s.sidebarLogo}>
          <View style={s.logoCircle}>
            <Ionicons name="business" size={22} color={Colors.white} />
          </View>
          <View>
            <Text style={s.logoTitle}>Studio T&B</Text>
            <Text style={s.logoSub}>Collaboratore</Text>
          </View>
        </View>

        <ScrollView style={s.navScroll} showsVerticalScrollIndicator={false}>
          {NAV.map(n => {
            const active = tab === n.key;
            return (
              <TouchableOpacity
                key={n.key}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => setTab(n.key)}
                activeOpacity={0.7}
              >
                <View style={[s.navIcon, { backgroundColor: active ? n.color : 'transparent' }]}>
                  <Ionicons name={n.icon as any} size={18} color={active ? Colors.white : Colors.textSec} />
                </View>
                <Text style={[s.navLabel, active && s.navLabelActive]}>{n.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.sidebarFooter}>
          <View style={s.userInfo}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarText}>{user?.nome?.[0] || 'C'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>{user?.nome} {user?.cognome}</Text>
              <Text style={s.userRole}>Collaboratore</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN ── */}
      <View style={s.main}>
        {loading
          ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.navy} />
              <Text style={{ marginTop: 12, color: Colors.textSec }}>Caricamento dati...</Text>
            </View>
          : <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

              {/* ── DASHBOARD ── */}
              {tab === 'dashboard' && (
                <View>
                  <PageHeader title="Dashboard" subtitle={`Benvenuto, ${user?.nome}`} 
                    actions={<Btn label="Aggiorna" icon="refresh-outline" onPress={loadAll} outline />}
                  />

                  <View style={s.statsGrid}>
                    {[
                      { label: 'Sopralluoghi totali', value: sopralluoghi.length, icon: 'search', color: '#8B5CF6' },
                      { label: 'In corso', value: sopInCorso, icon: 'time', color: '#F59E0B' },
                      { label: 'Completati', value: sopCompletati, icon: 'checkmark-circle', color: '#10B981' },
                      { label: 'Anomalie rilevate', value: totalAnomalies, icon: 'alert-circle', color: '#EF4444' },
                    ].map(({ label, value, icon, color }) => (
                      <View key={label} style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
                        <View style={[s.statIcon, { backgroundColor: color + '20' }]}>
                          <Ionicons name={icon as any} size={22} color={color} />
                        </View>
                        <Text style={s.statValue}>{value}</Text>
                        <Text style={s.statLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Recent sopralluoghi */}
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Sopralluoghi recenti</Text>
                    <DataTable
                      columns={[
                        { key: 'condominio', label: 'Condominio', flex: 2, render: row => <Text style={dt.cell}>{condomini.find(c => c.id === row.condominio_id)?.nome || '—'}</Text> },
                        { key: 'data', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.data || row.created_at)}</Text> },
                        { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                        { key: 'checklist', label: 'Progresso', flex: 1.5, render: row => {
                          const items = row.checklist || [];
                          const done = items.filter((i: any) => i.stato !== 'non_controllato').length;
                          const anom = items.filter((i: any) => i.stato === 'anomalia').length;
                          return <Text style={dt.cell}>{done}/{items.length} controllati · {anom} anomalie</Text>;
                        }},
                      ]}
                      data={sopralluoghi.slice(0, 5)}
                      onRowPress={row => { setSelected(row); setShowModal('detailSop'); }}
                      emptyText="Nessun sopralluogo assegnato"
                    />
                  </View>
                </View>
              )}

              {/* ── SOPRALLUOGHI ── */}
              {tab === 'sopralluoghi' && (
                <View>
                  <PageHeader title="I miei Sopralluoghi" subtitle={`${filteredSop.length} sopralluoghi`}
                    actions={<Btn label="Aggiorna" icon="refresh-outline" onPress={loadAll} outline />}
                  />
                  <SearchBar value={searchSop} onChange={setSearchSop} placeholder="Cerca per condominio, stato…" />
                  <DataTable
                    columns={[
                      { key: 'condominio', label: 'Condominio', flex: 2, render: row => <Text style={dt.cell}>{condomini.find(c => c.id === row.condominio_id)?.nome || '—'}</Text> },
                      { key: 'data', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.data || row.created_at)}</Text> },
                      { key: 'stato', label: 'Stato', flex: 0.8, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'checklist', label: 'Checklist', flex: 1.5, render: row => {
                        const items = row.checklist || [];
                        const ok = items.filter((i: any) => i.stato === 'ok').length;
                        const anom = items.filter((i: any) => i.stato === 'anomalia').length;
                        const nc = items.filter((i: any) => i.stato === 'non_controllato').length;
                        return (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>{ok} OK</Text>
                            <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600' }}>{anom} Anomalie</Text>
                            <Text style={{ fontSize: 12, color: Colors.textMuted }}>{nc} Da fare</Text>
                          </View>
                        );
                      }},
                      { key: 'note', label: 'Note', flex: 1.5, render: row => <Text style={dt.cell} numberOfLines={1}>{row.note_finali || '—'}</Text> },
                    ]}
                    data={filteredSop}
                    onRowPress={row => { setSelected(row); setShowModal('detailSop'); }}
                    emptyText="Nessun sopralluogo assegnato"
                  />
                </View>
              )}

              {/* ── CONDOMINI ── */}
              {tab === 'condomini' && (
                <View>
                  <PageHeader title="Condomini" subtitle={`${filteredCond.length} condomini`} />
                  <SearchBar value={searchCond} onChange={setSearchCond} placeholder="Cerca per nome, indirizzo…" />
                  <DataTable
                    columns={[
                      { key: 'tipo', label: 'Tipo', flex: 0.8 },
                      { key: 'nome', label: 'Nome', flex: 2 },
                      { key: 'indirizzo', label: 'Indirizzo', flex: 2, render: row => (
                        <Text style={dt.cell}>{[row.indirizzo, row.cap, row.citta, row.provincia].filter(Boolean).join(' — ')}</Text>
                      )},
                      { key: 'codice_fiscale', label: 'Cod. Fiscale', flex: 1.2 },
                      { key: 'sopralluoghi', label: 'Sopralluoghi', flex: 1, render: row => {
                        const count = sopralluoghi.filter(s => s.condominio_id === row.id).length;
                        return <Text style={dt.cell}>{count}</Text>;
                      }},
                    ]}
                    data={filteredCond}
                    emptyText="Nessun condominio trovato"
                  />
                </View>
              )}

              {/* ── SEGNALAZIONI ── */}
              {tab === 'segnalazioni' && (
                <View>
                  <PageHeader title="Segnalazioni" subtitle={`${segnalazioni.length} segnalazioni`} />
                  <DataTable
                    columns={[
                      { key: 'protocollo', label: 'Protocollo', flex: 1 },
                      { key: 'condominio', label: 'Condominio', flex: 1.5, render: row => <Text style={dt.cell}>{condomini.find(c => c.id === row.condominio_id)?.nome || '—'}</Text> },
                      { key: 'tipologia', label: 'Tipo', flex: 1.5 },
                      { key: 'urgenza', label: 'Urgenza', flex: 0.8, render: row => {
                        const urg = row.urgenza || '';
                        const c = urg === 'Urgente' ? '#DC2626' : urg === 'Alta' ? '#F59E0B' : Colors.textSec;
                        return <Text style={{ fontSize: 13, color: c, fontWeight: '600' }}>{urg || '—'}</Text>;
                      }},
                      { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'created_at', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                    ]}
                    data={segnalazioni}
                    emptyText="Nessuna segnalazione"
                  />
                </View>
              )}

          </ScrollView>
        }
      </View>

      {/* ── MODALS ── */}

      {/* Sopralluogo Detail */}
      {showModal === 'detailSop' && selected && (
        <DeskModal
          visible
          title={`Sopralluogo — ${condomini.find(c => c.id === selected.condominio_id)?.nome || 'N/D'}`}
          onClose={() => { setShowModal(null); setSelected(null); }}
          width={700}
        >
          {/* Info header */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { l: 'Data', v: fmtDate(selected.data || selected.created_at) },
              { l: 'Stato', v: selected.stato },
              { l: 'Valutazione', v: selected.valutazione_generale || '—' },
            ].map(({ l, v }) => (
              <View key={l} style={{ flex: 1, minWidth: 120, backgroundColor: Colors.bg, padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>{l}</Text>
                <Text style={{ fontSize: 15, color: Colors.textMain, fontWeight: '600', marginTop: 4 }}>{v}</Text>
              </View>
            ))}
          </View>

          {selected.note_finali ? (
            <View style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 10, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>Note finali</Text>
              <Text style={{ fontSize: 13, color: '#92400E' }}>{selected.note_finali}</Text>
            </View>
          ) : null}

          {/* Checklist */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: 12 }}>
            Checklist ({(selected.checklist || []).length} voci)
          </Text>
          {(selected.checklist || []).map((item: any, idx: number) => (
            <View key={item.id || idx} style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
              borderBottomWidth: 1, borderBottomColor: Colors.border,
              backgroundColor: item.stato === 'anomalia' ? '#FEF2F2' : item.stato === 'ok' ? '#F0FDF4' : Colors.white,
              borderRadius: idx === 0 ? 10 : 0,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: Colors.textMain, fontWeight: '500' }}>{item.nome || item.voce}</Text>
                {item.anomalia && (
                  <View style={{ marginTop: 4, flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>Anomalia: {item.anomalia.gravita || '—'}</Text>
                    {item.anomalia.descrizione && <Text style={{ fontSize: 12, color: Colors.textSec }}>{item.anomalia.descrizione}</Text>}
                  </View>
                )}
              </View>
              {selected.stato === 'in_corso' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: item.stato === 'ok' ? '#15803D' : Colors.bg }}
                    onPress={() => updateChecklistItem(selected.id, item.id, 'ok')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: item.stato === 'ok' ? Colors.white : Colors.textSec }}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: item.stato === 'anomalia' ? '#DC2626' : Colors.bg }}
                    onPress={() => updateChecklistItem(selected.id, item.id, 'anomalia')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: item.stato === 'anomalia' ? Colors.white : Colors.textSec }}>Anomalia</Text>
                  </TouchableOpacity>
                </View>
              )}
              {selected.stato !== 'in_corso' && (
                <StatoBadge stato={item.stato} />
              )}
            </View>
          ))}
        </DeskModal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: Colors.bg },
  sidebar: {
    width: 240, backgroundColor: Colors.white,
    borderRightWidth: 1, borderRightColor: Colors.border,
    flexDirection: 'column',
  },
  sidebarLogo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  logoCircle: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center',
  },
  logoTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  logoSub: { fontSize: 12, color: Colors.textSec },
  navScroll: { flex: 1, paddingVertical: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, marginHorizontal: 8, borderRadius: 10, marginBottom: 2,
  },
  navItemActive: { backgroundColor: Colors.navy + '12' },
  navIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  navLabel: { fontSize: 14, color: Colors.textSec, flex: 1 },
  navLabelActive: { color: Colors.navy, fontWeight: '700' },
  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 12, flexDirection: 'row', alignItems: 'center',
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  userAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  userAvatarText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  userName: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  userRole: { fontSize: 11, color: Colors.textSec },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  main: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 28, minHeight: '100%' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: 180, backgroundColor: Colors.white,
    borderRadius: 14, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: '800', color: Colors.navy },
  statLabel: { fontSize: 13, color: Colors.textSec, marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.navy, marginBottom: 12 },
});
