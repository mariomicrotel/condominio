import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, FlatList, RefreshControl, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/theme';
import SopralluogoDetail from '../../src/components/desktop/SopralluogoDetail';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'condomini' | 'utenti' | 'fornitori' | 'sopralluoghi' |
           'segnalazioni' | 'appuntamenti' | 'avvisi' | 'trasmissioni' | 'privacy' | 'config';

const NAV: { key: Tab; label: string; icon: string; color: string }[] = [
  { key: 'dashboard',    label: 'Dashboard',       icon: 'grid',                  color: '#6366F1' },
  { key: 'condomini',    label: 'Condomini',        icon: 'business',              color: '#10B981' },
  { key: 'utenti',       label: 'Utenti',           icon: 'people',                color: '#3B82F6' },
  { key: 'fornitori',    label: 'Fornitori',        icon: 'construct',             color: '#F59E0B' },
  { key: 'sopralluoghi', label: 'Sopralluoghi',     icon: 'search',                color: '#8B5CF6' },
  { key: 'segnalazioni', label: 'Segnalazioni',     icon: 'warning',               color: '#EF4444' },
  { key: 'appuntamenti', label: 'Appuntamenti',     icon: 'calendar',              color: '#0EA5E9' },
  { key: 'avvisi',       label: 'Avvisi',           icon: 'megaphone',             color: '#F97316' },
  { key: 'trasmissioni', label: 'Documenti',        icon: 'documents',             color: '#14B8A6' },
  { key: 'privacy',      label: 'Privacy',          icon: 'shield-checkmark',      color: '#EC4899' },
  { key: 'config',       label: 'Impostazioni',     icon: 'settings',              color: '#6B7280' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatoBadge = ({ stato }: { stato: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    'Inviata':       { bg: '#DBEAFE', color: '#1D4ED8' },
    'In lavorazione':{ bg: '#FEF3C7', color: '#D97706' },
    'Chiusa':        { bg: '#DCFCE7', color: '#15803D' },
    'Annullata':     { bg: '#FEE2E2', color: '#DC2626' },
    'in_corso':      { bg: '#FEF3C7', color: '#D97706' },
    'completato':    { bg: '#DCFCE7', color: '#15803D' },
    'confermato':    { bg: '#DCFCE7', color: '#15803D' },
    'ricevuta':      { bg: '#DBEAFE', color: '#1D4ED8' },
    'evasa':         { bg: '#DCFCE7', color: '#15803D' },
    'rifiutata':     { bg: '#FEE2E2', color: '#DC2626' },
  };
  const c = map[stato] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
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
      {/* Header */}
      <View style={dt.header}>
        {columns.map(c => (
          <Text key={c.key} style={[dt.headerCell, { flex: c.flex || 1 }]}>{c.label}</Text>
        ))}
      </View>
      {/* Rows */}
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
function DeskModal({ visible, title, onClose, children, width = 560 }: {
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

// ─── Form Input ───────────────────────────────────────────────────────────────
function FInput({ label, value, onChange, placeholder = '', multiline = false, type = 'default' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; type?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[fi.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={type as any}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSec, marginBottom: 6 },
  input: { height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 14, fontSize: 14, color: Colors.textMain, outlineStyle: 'none' } as any,
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

// ─── Segnalazione Detail Modal (Full Featured) ───────────────────────────────
function SegnalazioneDetailModal({ seg, token, condomini, fornitori, onClose, onUpdate, onRefreshAll }: {
  seg: any; token: string; condomini: any[]; fornitori: any[];
  onClose: () => void; onUpdate: (s: any) => void; onRefreshAll: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'dettagli' | 'modifica' | 'fornitore' | 'timeline' | 'rapportino'>('dettagli');
  const [editData, setEditData] = useState({ tipologia: seg.tipologia || '', descrizione: seg.descrizione || '', urgenza: seg.urgenza || 'Media', note_admin: seg.note_admin || '' });
  const [assegnData, setAssegnData] = useState({ fornitore_id: seg.fornitore_id || '', note: '', data_prevista: '' });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [rapportino, setRapportino] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);

  const condNome = condomini.find(c => c.id === seg.condominio_id)?.nome || '—';
  const fornNome = fornitori.find(f => f.id === seg.fornitore_id)?.ragione_sociale || null;

  const loadTimeline = async () => {
    setLoadingExtra(true);
    try { const t = await api.getAdminTimeline(token, seg.id); setTimeline(Array.isArray(t) ? t : []); } catch { setTimeline([]); }
    setLoadingExtra(false);
  };
  const loadRapportino = async () => {
    setLoadingExtra(true);
    try { const r = await api.getAdminRapportino(token, seg.id); setRapportino(r); } catch { setRapportino(null); }
    setLoadingExtra(false);
  };

  useEffect(() => {
    if (activeTab === 'timeline') loadTimeline();
    if (activeTab === 'rapportino') loadRapportino();
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateAdminSeg(token, seg.id, editData);
      onUpdate({ ...seg, ...editData, ...updated });
      Alert.alert('Salvato', 'Segnalazione aggiornata');
      setActiveTab('dettagli');
    } catch (e: any) { Alert.alert('Errore', e.message); }
    setSaving(false);
  };

  const handleAssegna = async () => {
    if (!assegnData.fornitore_id) { Alert.alert('Attenzione', 'Seleziona un fornitore'); return; }
    setSaving(true);
    try {
      await api.assegnaFornitore(token, seg.id, assegnData);
      onUpdate({ ...seg, stato: 'Assegnata al fornitore', fornitore_id: assegnData.fornitore_id });
      Alert.alert('Assegnata', 'Segnalazione assegnata al fornitore');
      onRefreshAll();
      onClose();
    } catch (e: any) { Alert.alert('Errore', e.message); }
    setSaving(false);
  };

  const handleChiudi = async () => {
    setSaving(true);
    try {
      await api.chiudiSegnalazione(token, seg.id);
      onUpdate({ ...seg, stato: 'Chiusa' });
      onClose();
    } catch (e: any) { Alert.alert('Errore', e.message); }
    setSaving(false);
  };

  const handleRiapri = async () => {
    setSaving(true);
    try {
      await api.riapriSegnalazione(token, seg.id);
      onUpdate({ ...seg, stato: 'Richiesto nuovo intervento' });
      onClose();
    } catch (e: any) { Alert.alert('Errore', e.message); }
    setSaving(false);
  };

  const tabs = [
    { key: 'dettagli', label: 'Dettagli', icon: 'document-text-outline' },
    { key: 'modifica', label: 'Modifica', icon: 'create-outline' },
    { key: 'fornitore', label: 'Assegna Fornitore', icon: 'construct-outline' },
    { key: 'timeline', label: 'Timeline', icon: 'time-outline' },
    { key: 'rapportino', label: 'Rapportino', icon: 'clipboard-outline' },
  ];

  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const urgColor = (u: string) => u === 'Urgente' ? '#DC2626' : u === 'Alta' ? '#F59E0B' : u === 'Media' ? '#3B82F6' : '#6B7280';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 720, maxHeight: '90%', backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.navy, paddingHorizontal: 24, paddingVertical: 16 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.white }}>{seg.protocollo}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{condNome} · {fmtD(seg.created_at)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <StatoBadge stato={seg.stato} />
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab bar */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bg }}>
            {tabs.map(t => (
              <TouchableOpacity
                key={t.key}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === t.key ? Colors.navy : 'transparent' }}
                onPress={() => setActiveTab(t.key as any)}
              >
                <Ionicons name={t.icon as any} size={15} color={activeTab === t.key ? Colors.navy : Colors.textMuted} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 13, fontWeight: activeTab === t.key ? '700' : '500', color: activeTab === t.key ? Colors.navy : Colors.textMuted }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

            {/* TAB: Dettagli */}
            {activeTab === 'dettagli' && (
              <View>
                {[
                  { l: 'Protocollo', v: seg.protocollo },
                  { l: 'Condominio', v: condNome },
                  { l: 'Tipologia', v: seg.tipologia },
                  { l: 'Descrizione', v: seg.descrizione },
                  { l: 'Urgenza', v: seg.urgenza, color: urgColor(seg.urgenza || '') },
                  { l: 'Stato', v: seg.stato },
                  { l: 'Fornitore', v: fornNome || 'Non assegnato' },
                  { l: 'Data Creazione', v: fmtD(seg.created_at) },
                  { l: 'Note Admin', v: seg.note_admin || '—' },
                ].map(({ l, v, color }) => (
                  <View key={l} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                    <Text style={{ fontSize: 13, color: Colors.textSec, width: 130, fontWeight: '600' }}>{l}</Text>
                    <Text style={{ fontSize: 14, color: color || Colors.textMain, fontWeight: '500', flex: 1 }}>{v}</Text>
                  </View>
                ))}

                {/* Allegati */}
                {seg.allegati?.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textSec, marginBottom: 8 }}>Allegati ({seg.allegati.length})</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {seg.allegati.map((a: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Ionicons name="attach" size={14} color={Colors.textSec} />
                          <Text style={{ fontSize: 12, color: Colors.textSec, marginLeft: 4 }}>File {i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Azioni rapide */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                  {seg.stato !== 'Chiusa' && !fornNome && (
                    <Btn label="Assegna Fornitore" icon="construct-outline" color="#F59E0B" onPress={() => setActiveTab('fornitore')} />
                  )}
                  {seg.stato !== 'Chiusa' && (
                    <Btn label="Modifica" icon="create-outline" color={Colors.sky} onPress={() => setActiveTab('modifica')} />
                  )}
                  {seg.stato !== 'Chiusa' && (
                    <Btn label="Chiudi" icon="checkmark-circle-outline" color="#15803D" onPress={handleChiudi} />
                  )}
                  {seg.stato === 'Chiusa' && (
                    <Btn label="Riapri / Nuovo Intervento" icon="refresh-outline" color={Colors.sky} onPress={handleRiapri} />
                  )}
                </View>
              </View>
            )}

            {/* TAB: Modifica */}
            {activeTab === 'modifica' && (
              <View>
                <FInput label="Tipologia *" value={editData.tipologia} onChange={v => setEditData(p => ({ ...p, tipologia: v }))} placeholder="Es. Guasto idraulico" />
                <FInput label="Descrizione *" value={editData.descrizione} onChange={v => setEditData(p => ({ ...p, descrizione: v }))} multiline />
                <View style={{ marginBottom: 14 }}>
                  <Text style={fi.label}>Urgenza</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['Bassa', 'Media', 'Alta', 'Urgente'].map(u => (
                      <TouchableOpacity key={u} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: editData.urgenza === u ? urgColor(u) : Colors.bg, borderWidth: 1, borderColor: editData.urgenza === u ? urgColor(u) : Colors.border }} onPress={() => setEditData(p => ({ ...p, urgenza: u }))}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: editData.urgenza === u ? Colors.white : Colors.textSec }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <FInput label="Note Admin" value={editData.note_admin} onChange={v => setEditData(p => ({ ...p, note_admin: v }))} multiline placeholder="Note interne visibili solo all'admin" />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Btn label={saving ? 'Salvataggio...' : 'Salva Modifiche'} icon="save-outline" onPress={handleSave} />
                  <Btn label="Annulla" outline color={Colors.textSec} onPress={() => setActiveTab('dettagli')} />
                </View>
              </View>
            )}

            {/* TAB: Assegna Fornitore */}
            {activeTab === 'fornitore' && (
              <View>
                {fornNome && (
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
                    <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>Fornitore attuale: {fornNome}</Text>
                    <Text style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>Puoi riassegnare selezionando un nuovo fornitore qui sotto.</Text>
                  </View>
                )}
                <Text style={fi.label}>Seleziona Fornitore *</Text>
                <View style={{ marginBottom: 16 }}>
                  {fornitori.length === 0 ? (
                    <Text style={{ fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' }}>Nessun fornitore registrato. Creane uno dalla sezione Fornitori.</Text>
                  ) : (
                    fornitori.map(f => (
                      <TouchableOpacity key={f.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6, borderRadius: 10, backgroundColor: assegnData.fornitore_id === f.id ? '#EFF6FF' : Colors.bg, borderWidth: 1.5, borderColor: assegnData.fornitore_id === f.id ? Colors.sky : Colors.border }} onPress={() => setAssegnData(p => ({ ...p, fornitore_id: f.id }))}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.navy, backgroundColor: assegnData.fornitore_id === f.id ? Colors.navy : 'transparent', marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                          {assegnData.fornitore_id === f.id && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textMain }}>{f.ragione_sociale}</Text>
                          <Text style={{ fontSize: 12, color: Colors.textSec }}>{(f.settori_competenza || []).join(', ') || f.email || '—'}</Text>
                        </View>
                        {f.telefono && <Text style={{ fontSize: 12, color: Colors.textMuted }}>{f.telefono}</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                <FInput label="Note per il fornitore" value={assegnData.note} onChange={v => setAssegnData(p => ({ ...p, note: v }))} multiline placeholder="Es. Urgente, chiamare il mattino" />
                <FInput label="Data prevista intervento" value={assegnData.data_prevista} onChange={v => setAssegnData(p => ({ ...p, data_prevista: v }))} placeholder="Es. 2026-03-25" />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Btn label={saving ? 'Assegnazione...' : 'Assegna Fornitore'} icon="send-outline" color="#F59E0B" onPress={handleAssegna} />
                  <Btn label="Annulla" outline color={Colors.textSec} onPress={() => setActiveTab('dettagli')} />
                </View>
              </View>
            )}

            {/* TAB: Timeline */}
            {activeTab === 'timeline' && (
              <View>
                {loadingExtra ? (
                  <ActivityIndicator size="small" color={Colors.navy} style={{ marginVertical: 24 }} />
                ) : timeline.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                    <Text style={{ fontSize: 14, color: Colors.textMuted, marginTop: 8 }}>Nessun evento registrato</Text>
                  </View>
                ) : (
                  timeline.map((ev: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 16 }}>
                      <View style={{ alignItems: 'center', width: 32 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? Colors.navy : Colors.border, marginTop: 4 }} />
                        {i < timeline.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 }} />}
                      </View>
                      <View style={{ flex: 1, backgroundColor: Colors.bg, borderRadius: 10, padding: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textMain }}>{ev.azione || ev.evento || ev.tipo || '—'}</Text>
                        {ev.dettaglio && <Text style={{ fontSize: 12, color: Colors.textSec, marginTop: 4 }}>{ev.dettaglio}</Text>}
                        {ev.note && <Text style={{ fontSize: 12, color: Colors.textSec, marginTop: 2 }}>{ev.note}</Text>}
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>{fmtD(ev.data || ev.created_at)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB: Rapportino */}
            {activeTab === 'rapportino' && (
              <View>
                {loadingExtra ? (
                  <ActivityIndicator size="small" color={Colors.navy} style={{ marginVertical: 24 }} />
                ) : !rapportino ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Ionicons name="clipboard-outline" size={40} color={Colors.textMuted} />
                    <Text style={{ fontSize: 14, color: Colors.textMuted, marginTop: 8 }}>Nessun rapportino disponibile</Text>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Il fornitore non ha ancora compilato il rapportino</Text>
                  </View>
                ) : (
                  <View>
                    {[
                      { l: 'Data Intervento', v: fmtD(rapportino.data_intervento) },
                      { l: 'Descrizione Lavori', v: rapportino.descrizione_lavori },
                      { l: 'Esito', v: rapportino.esito },
                      { l: 'Materiali', v: rapportino.materiali_utilizzati || '—' },
                      { l: 'Compilato il', v: fmtD(rapportino.created_at) },
                    ].map(({ l, v }) => (
                      <View key={l} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                        <Text style={{ fontSize: 13, color: Colors.textSec, width: 140, fontWeight: '600' }}>{l}</Text>
                        <Text style={{ fontSize: 14, color: Colors.textMain, flex: 1 }}>{v}</Text>
                      </View>
                    ))}
                    {rapportino.foto_ids?.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textSec, marginBottom: 6 }}>Foto ({rapportino.foto_ids.length})</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {rapportino.foto_ids.map((f: string, i: number) => (
                            <View key={i} style={{ backgroundColor: Colors.bg, borderRadius: 8, padding: 8 }}>
                              <Ionicons name="image-outline" size={20} color={Colors.textSec} />
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDesktop() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Data
  const [stats, setStats] = useState<any>(null);
  const [condomini, setCondomini] = useState<any[]>([]);
  const [utenti, setUtenti] = useState<any[]>([]);
  const [fornitori, setFornitori] = useState<any[]>([]);
  const [sopralluoghi, setSopralluoghi] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [avvisi, setAvvisi] = useState<any[]>([]);
  const [trasmissioni, setTrasmissioni] = useState<any[]>([]);
  const [richiestePrivacy, setRichiestePrivacy] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [collaboratori, setCollaboratori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [privacyScadenzaCount, setPrivacyScadenzaCount] = useState(0);

  // Search states
  const [searchCond, setSearchCond] = useState('');
  const [searchUtenti, setSearchUtenti] = useState('');
  const [searchForn, setSearchForn] = useState('');
  const [searchSeg, setSearchSeg] = useState('');
  const [searchSop, setSearchSop] = useState('');
  const [sopFilter, setSopFilter] = useState<'tutti' | 'in_corso' | 'completato'>('tutti');

  // Modal states
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, cond, seg, app, avv, ut, trasm, forn, sop, collab, cfg] = await Promise.all([
        api.getAdminDashboard(token),
        api.getCondomini(token),
        api.getAdminSegnalazioni(token),
        api.getAdminAppuntamenti(token),
        api.getAdminAvvisi(token),
        api.getAdminUtenti(token),
        api.getAdminTrasmissioni(token).catch(() => []),
        api.getAdminFornitori(token).catch(() => []),
        api.getSopralluoghi(token).catch(() => []),
        api.getCollaboratori(token).catch(() => []),
        api.getConfig(token).catch(() => null),
      ]);
      setStats(s); setCondomini(cond); setSegnalazioni(seg); setAppuntamenti(app);
      setAvvisi(avv); setUtenti(ut); setTrasmissioni(trasm); setFornitori(forn);
      setSopralluoghi(sop); setCollaboratori(collab); setConfig(cfg);
      api.adminCountScadenzaPrivacy(token).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
    } catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setLoading(false); }
  }, [token]);

  const loadPrivacy = useCallback(async () => {
    if (!token) return;
    const data = await api.adminListRichiestePrivacy(token).catch(() => []);
    setRichiestePrivacy(Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === 'privacy') loadPrivacy(); }, [tab]);

  const setForm = (key: string, val: any) => setFormData((p: any) => ({ ...p, [key]: val }));

  const handleLogout = () => {
    Alert.alert('Disconnessione', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/desktop/login'); } }
    ]);
  };

  // ── CRUD helpers ──────────────────────────────────────────────────────────

  const createCondominio = async () => {
    if (!formData.nome?.trim() || !formData.indirizzo?.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo obbligatori'); return; }
    try {
      const c = await api.createCondominio(token!, formData);
      setCondomini(p => [...p, c]);
      setShowModal(null); setFormData({});
      Alert.alert('Creato', 'Condominio aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const updateCondominio = async () => {
    try {
      const c = await api.updateCondominio(token!, selected.id, formData);
      setCondomini(p => p.map(x => x.id === selected.id ? c : x));
      setShowModal(null); setSelected(null); setFormData({});
      Alert.alert('Salvato', 'Condominio aggiornato');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteCondominio = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteCondominio(token!, id);
          setCondomini(p => p.filter(x => x.id !== id));
        } catch (e: any) { Alert.alert('Errore', e.message); }
      }}
    ]);
  };

  const createAvviso = async () => {
    if (!formData.titolo?.trim() || !formData.testo?.trim()) { Alert.alert('Attenzione', 'Titolo e testo obbligatori'); return; }
    try {
      const a = await api.createAdminAvviso(token!, formData);
      setAvvisi(p => [a, ...p]);
      setShowModal(null); setFormData({});
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteAvviso = (id: string) => {
    Alert.alert('Elimina', 'Eliminare questo avviso?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try { await api.deleteAdminAvviso(token!, id); setAvvisi(p => p.filter(x => x.id !== id)); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }}
    ]);
  };

  const createFornitore = async () => {
    if (!formData.ragione_sociale?.trim() || !formData.email?.trim()) { Alert.alert('Attenzione', 'Ragione sociale ed email obbligatorie'); return; }
    try {
      const f = await api.createFornitore(token!, formData);
      setFornitori(p => [...p, f]);
      setShowModal(null); setFormData({});
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const approvaAppuntamento = async (id: string) => {
    try {
      await api.updateAdminApp(token!, id, { stato: 'confermato' });
      setAppuntamenti(p => p.map(x => x.id === id ? { ...x, stato: 'confermato' } : x));
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const rifiutaAppuntamento = async (id: string) => {
    try {
      await api.updateAdminApp(token!, id, { stato: 'rifiutato' });
      setAppuntamenti(p => p.map(x => x.id === id ? { ...x, stato: 'rifiutato' } : x));
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const evadiPrivacy = async (id: string, azione: string, motivazione?: string) => {
    try {
      await api.adminEvadiRichiestaPrivacy(token!, id, { azione, motivazione_rifiuto: motivazione });
      loadPrivacy();
      api.adminCountScadenzaPrivacy(token!).then((r: any) => setPrivacyScadenzaCount(r.scadenza_imminente || 0)).catch(() => {});
      Alert.alert('Fatto', `Richiesta ${azione}`);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const saveConfig = async () => {
    try {
      await api.updateConfig(token!, config);
      Alert.alert('Salvato', 'Configurazione aggiornata');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const filteredCondomini = searchCond.trim()
    ? condomini.filter(c => [c.nome, c.indirizzo, c.citta, c.codice_fiscale].join(' ').toLowerCase().includes(searchCond.toLowerCase()))
    : condomini;
  const filteredUtenti = searchUtenti.trim()
    ? utenti.filter(u => [u.nome, u.cognome, u.email, u.ruolo].join(' ').toLowerCase().includes(searchUtenti.toLowerCase()))
    : utenti;
  const filteredForn = searchForn.trim()
    ? fornitori.filter(f => [f.ragione_sociale, f.email, f.p_iva].join(' ').toLowerCase().includes(searchForn.toLowerCase()))
    : fornitori;
  const filteredSeg = searchSeg.trim()
    ? segnalazioni.filter(s => [s.protocollo, s.tipologia, s.stato].join(' ').toLowerCase().includes(searchSeg.toLowerCase()))
    : segnalazioni;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.shell}>
      {/* ── SIDEBAR ── */}
      <View style={s.sidebar}>
        {/* Logo */}
        <View style={s.sidebarLogo}>
          <View style={s.logoCircle}>
            <Ionicons name="business" size={22} color={Colors.white} />
          </View>
          <View>
            <Text style={s.logoTitle}>Studio T&B</Text>
            <Text style={s.logoSub}>Portale Admin</Text>
          </View>
        </View>

        {/* Nav */}
        <ScrollView style={s.navScroll} showsVerticalScrollIndicator={false}>
          {NAV.map(n => {
            const active = tab === n.key;
            const badge = n.key === 'privacy' && privacyScadenzaCount > 0;
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
                {badge && (
                  <View style={s.navBadge}><Text style={s.navBadgeText}>{privacyScadenzaCount}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* User */}
        <View style={s.sidebarFooter}>
          <View style={s.userInfo}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarText}>{user?.nome?.[0] || 'A'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>{user?.nome} {user?.cognome}</Text>
              <Text style={s.userRole}>Amministratore</Text>
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
                  <PageHeader title="Dashboard" subtitle={`Benvenuto, ${user?.nome}`} />

                  <View style={s.statsGrid}>
                    {[
                      { label: 'Condomini', value: stats?.totale_condomini ?? condomini.length, icon: 'business', color: '#10B981' },
                      { label: 'Utenti', value: stats?.totale_utenti ?? utenti.length, icon: 'people', color: '#3B82F6' },
                      { label: 'Segnalazioni aperte', value: stats?.segnalazioni_aperte ?? segnalazioni.filter(s => s.stato !== 'Chiusa').length, icon: 'warning', color: '#EF4444' },
                      { label: 'Appuntamenti pendenti', value: appuntamenti.filter(a => a.stato === 'in_attesa').length, icon: 'calendar', color: '#F59E0B' },
                      { label: 'Fornitori', value: fornitori.length, icon: 'construct', color: '#8B5CF6' },
                      { label: 'Sopralluoghi', value: sopralluoghi.length, icon: 'search', color: '#0EA5E9' },
                      { label: 'Avvisi attivi', value: avvisi.length, icon: 'megaphone', color: '#F97316' },
                      { label: 'Documenti trasmessi', value: trasmissioni.length, icon: 'documents', color: '#14B8A6' },
                    ].map(({ label, value, icon, color }) => (
                      <View key={label} style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
                        <View style={[s.statIcon, { backgroundColor: color + '20' }]}>
                          <Ionicons name={icon as any} size={22} color={color} />
                        </View>
                        <Text style={s.statValue}>{value ?? 0}</Text>
                        <Text style={s.statLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Recent segnalazioni */}
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Segnalazioni recenti</Text>
                    <DataTable
                      columns={[
                        { key: 'protocollo', label: 'Protocollo', flex: 1 },
                        { key: 'tipologia', label: 'Tipo', flex: 1.5 },
                        { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                        { key: 'created_at', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                      ]}
                      data={segnalazioni.slice(0, 8)}
                    />
                  </View>
                </View>
              )}

              {/* ── CONDOMINI ── */}
              {tab === 'condomini' && (
                <View>
                  <PageHeader
                    title="Condomini"
                    subtitle={`${filteredCondomini.length} di ${condomini.length} condomini`}
                    actions={<>
                      <Btn label="Importa XLS" icon="cloud-upload-outline" onPress={() => Alert.alert('Info', 'Usa l\'app mobile per importare file XLS')} outline color={Colors.navy} />
                      <Btn label="Nuovo" icon="add" onPress={() => { setFormData({ tipo: 'Condominio' }); setShowModal('newCond'); }} />
                    </>}
                  />
                  <SearchBar value={searchCond} onChange={setSearchCond} placeholder="Cerca per nome, indirizzo, città, CF…" />
                  <DataTable
                    columns={[
                      { key: 'tipo', label: 'Tipo', flex: 0.7 },
                      { key: 'nome', label: 'Nome', flex: 2 },
                      { key: 'indirizzo', label: 'Indirizzo', flex: 2, render: row => <Text style={dt.cell}>{[row.indirizzo, row.cap, row.citta, row.provincia].filter(Boolean).join(' — ')}</Text> },
                      { key: 'codice_fiscale', label: 'Cod. Fiscale', flex: 1.2 },
                      { key: 'banca', label: 'Banca', flex: 1.2 },
                      { key: 'azioni', label: 'Azioni', flex: 0.8, render: row => (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity onPress={() => { setSelected(row); setFormData({ ...row }); setShowModal('editCond'); }}>
                            <Ionicons name="create-outline" size={18} color={Colors.sky} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteCondominio(row.id, row.nome)}>
                            <Ionicons name="trash-outline" size={18} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      )},
                    ]}
                    data={filteredCondomini}
                    emptyText="Nessun condominio trovato"
                  />
                </View>
              )}

              {/* ── UTENTI ── */}
              {tab === 'utenti' && (
                <View>
                  <PageHeader title="Utenti" subtitle={`${filteredUtenti.length} utenti registrati`}
                    actions={<Btn label="Nuovo Collaboratore" icon="person-add-outline" onPress={() => { setFormData({}); setShowModal('newCollab'); }} />}
                  />
                  <SearchBar value={searchUtenti} onChange={setSearchUtenti} placeholder="Cerca per nome, email, ruolo…" />
                  <DataTable
                    columns={[
                      { key: 'nome', label: 'Nome', flex: 1.5, render: row => <Text style={dt.cell}>{row.nome} {row.cognome}</Text> },
                      { key: 'email', label: 'Email', flex: 2 },
                      { key: 'telefono', label: 'Telefono', flex: 1 },
                      { key: 'ruolo', label: 'Ruolo', flex: 1, render: row => {
                        const map: any = { admin: '#6366F1', condomino: '#10B981', collaboratore: '#F59E0B', fornitore: '#3B82F6' };
                        return <View style={{ backgroundColor: (map[row.ruolo] || '#6B7280') + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: map[row.ruolo] || '#6B7280' }}>{row.ruolo}</Text>
                        </View>;
                      }},
                      { key: 'created_at', label: 'Registrato', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                    ]}
                    data={filteredUtenti}
                    emptyText="Nessun utente trovato"
                  />
                </View>
              )}

              {/* ── FORNITORI ── */}
              {tab === 'fornitori' && (
                <View>
                  <PageHeader title="Fornitori" subtitle={`${filteredForn.length} fornitori`}
                    actions={<Btn label="Nuovo Fornitore" icon="add" onPress={() => { setFormData({}); setShowModal('newForn'); }} />}
                  />
                  <SearchBar value={searchForn} onChange={setSearchForn} placeholder="Cerca per ragione sociale, email, P.IVA…" />
                  <DataTable
                    columns={[
                      { key: 'ragione_sociale', label: 'Ragione Sociale', flex: 2 },
                      { key: 'email', label: 'Email', flex: 2 },
                      { key: 'telefono', label: 'Telefono', flex: 1 },
                      { key: 'p_iva', label: 'P.IVA', flex: 1.2 },
                      { key: 'specializzazione', label: 'Specializzazione', flex: 1.5 },
                      { key: 'azioni', label: 'Azioni', flex: 0.6, render: row => (
                        <TouchableOpacity onPress={() => { Alert.alert('Elimina', `Eliminare "${row.ragione_sociale}"?`, [{ text: 'Annulla', style: 'cancel' }, { text: 'Elimina', style: 'destructive', onPress: async () => { try { await api.deleteFornitore(token!, row.id); setFornitori(p => p.filter(f => f.id !== row.id)); } catch (e: any) { Alert.alert('Errore', e.message); } } }]); }}>
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      )},
                    ]}
                    data={filteredForn}
                    emptyText="Nessun fornitore registrato"
                  />
                </View>
              )}

              {/* ── SOPRALLUOGHI ── */}
              {tab === 'sopralluoghi' && (
                <View>
                  <PageHeader title="Sopralluoghi" subtitle={`${sopralluoghi.length} sopralluoghi totali`}
                    actions={<Btn label="Aggiorna" icon="refresh-outline" onPress={loadAll} outline />}
                  />

                  {/* Filtri e ricerca */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <SearchBar value={searchSop} onChange={setSearchSop} placeholder="Cerca per condominio, collaboratore, motivo…" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['tutti', 'completato', 'in_corso'] as const).map(f => (
                        <TouchableOpacity
                          key={f}
                          style={[
                            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: sopFilter === f ? Colors.navy : Colors.border },
                            sopFilter === f && { backgroundColor: Colors.navy },
                          ]}
                          onPress={() => setSopFilter(f)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: sopFilter === f ? Colors.white : Colors.textSec }}>
                            {f === 'tutti' ? 'Tutti' : f === 'completato' ? 'Completati' : 'In corso'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <DataTable
                    columns={[
                      { key: 'condominio_nome', label: 'Condominio', flex: 2, render: row => <Text style={dt.cell}>{condomini.find(c => c.id === row.condominio_id)?.nome || row.condominio_id}</Text> },
                      { key: 'collaboratore', label: 'Collaboratore', flex: 1.5, render: row => <Text style={dt.cell}>{collaboratori.find(c => c.id === row.collaboratore_id)?.nome || '—'}</Text> },
                      { key: 'data', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.data || row.created_at)}</Text> },
                      { key: 'motivo', label: 'Motivo', flex: 1.2, render: row => <Text style={dt.cell} numberOfLines={1}>{row.motivo || '—'}</Text> },
                      { key: 'stato', label: 'Stato', flex: 0.8, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'checklist', label: 'Checklist', flex: 1.2, render: row => {
                        const items = row.checklist || [];
                        const ok = items.filter((i: any) => i.stato === 'ok').length;
                        const anom = items.filter((i: any) => i.stato === 'anomalia').length;
                        return (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>{ok} OK</Text>
                            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>{anom} AN</Text>
                            <Text style={{ fontSize: 12, color: Colors.textMuted }}>/ {items.length}</Text>
                          </View>
                        );
                      }},
                      { key: 'media', label: 'Media', flex: 0.8, render: row => {
                        const items = row.checklist || [];
                        const hasMedia = items.some((i: any) => 
                          i.anomalia?.foto_ids?.length > 0 || i.anomalia?.nota_vocale_ids?.length > 0
                        );
                        const hasVoiceNote = row.nota_vocale_generale_id || row.nota_vocale_finale_id;
                        return (
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {hasMedia && <Ionicons name="camera" size={14} color="#6366F1" />}
                            {hasVoiceNote && <Ionicons name="mic" size={14} color="#6366F1" />}
                            {!hasMedia && !hasVoiceNote && <Text style={{ fontSize: 12, color: Colors.textMuted }}>—</Text>}
                          </View>
                        );
                      }},
                      { key: 'action', label: '', flex: 0.6, render: row => (
                        <TouchableOpacity
                          style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}
                          onPress={() => { setSelectedSopId(row.id); setShowModal('detailSop'); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={16} color="#6366F1" />
                        </TouchableOpacity>
                      )},
                    ]}
                    data={sopralluoghi
                      .filter(sop => sopFilter === 'tutti' || sop.stato === sopFilter)
                      .filter(sop => {
                        if (!searchSop.trim()) return true;
                        const q = searchSop.toLowerCase();
                        const condName = condomini.find(c => c.id === sop.condominio_id)?.nome || '';
                        const collabName = collaboratori.find(c => c.id === sop.collaboratore_id)?.nome || '';
                        return [condName, collabName, sop.motivo, sop.stato, sop.note_generali].join(' ').toLowerCase().includes(q);
                      })
                    }
                    onRowPress={row => { setSelectedSopId(row.id); setShowModal('detailSop'); }}
                    emptyText="Nessun sopralluogo trovato"
                  />
                </View>
              )}

              {/* ── SEGNALAZIONI ── */}
              {tab === 'segnalazioni' && (
                <View>
                  <PageHeader title="Segnalazioni" subtitle={`${filteredSeg.length} segnalazioni`}
                    actions={<Btn label="Nuova segnalazione" icon="add" onPress={() => { setFormData({}); setShowModal('newSeg'); }} />}
                  />
                  <SearchBar value={searchSeg} onChange={setSearchSeg} placeholder="Cerca per protocollo, tipo, stato…" />
                  <DataTable
                    columns={[
                      { key: 'protocollo', label: 'Protocollo', flex: 1 },
                      { key: 'condominio', label: 'Condominio', flex: 1.5, render: row => <Text style={dt.cell}>{condomini.find(c => c.id === row.condominio_id)?.nome || '—'}</Text> },
                      { key: 'tipologia', label: 'Tipo', flex: 1.2 },
                      { key: 'urgenza', label: 'Urgenza', flex: 0.7, render: row => {
                        const urg = row.urgenza || '';
                        const c = urg === 'Urgente' ? '#DC2626' : urg === 'Alta' ? '#F59E0B' : Colors.textSec;
                        return <Text style={{ fontSize: 13, color: c, fontWeight: '600' }}>{urg || '—'}</Text>;
                      }},
                      { key: 'fornitore', label: 'Fornitore', flex: 1.2, render: row => {
                        const fn = fornitori.find(f => f.id === row.fornitore_id);
                        return <Text style={{ fontSize: 13, color: fn ? Colors.textMain : Colors.textMuted, fontStyle: fn ? 'normal' : 'italic' }}>{fn ? fn.ragione_sociale : '—'}</Text>;
                      }},
                      { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'created_at', label: 'Data', flex: 0.8, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                    ]}
                    data={filteredSeg}
                    onRowPress={row => { setSelected(row); setShowModal('detailSeg'); }}
                    emptyText="Nessuna segnalazione"
                  />
                </View>
              )}

              {/* ── APPUNTAMENTI ── */}
              {tab === 'appuntamenti' && (
                <View>
                  <PageHeader title="Appuntamenti" subtitle={`${appuntamenti.length} appuntamenti`} />
                  <DataTable
                    columns={[
                      { key: 'utente', label: 'Utente', flex: 1.5, render: row => {
                        const u = utenti.find(u => u.id === row.user_id);
                        return <Text style={dt.cell}>{u ? `${u.nome} ${u.cognome}` : '—'}</Text>;
                      }},
                      { key: 'data_richiesta', label: 'Data Rich.', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.data_richiesta)}</Text> },
                      { key: 'fascia_oraria', label: 'Fascia', flex: 1 },
                      { key: 'motivo', label: 'Motivo', flex: 2 },
                      { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'azioni', label: 'Azioni', flex: 1, render: row => (
                        row.stato === 'in_attesa' ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => approvaAppuntamento(row.id)}>
                              <Ionicons name="checkmark-circle-outline" size={20} color="#15803D" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => rifiutaAppuntamento(row.id)}>
                              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        ) : <Text style={{ fontSize: 12, color: Colors.textMuted }}>—</Text>
                      )},
                    ]}
                    data={appuntamenti}
                    emptyText="Nessun appuntamento"
                  />
                </View>
              )}

              {/* ── AVVISI ── */}
              {tab === 'avvisi' && (
                <View>
                  <PageHeader title="Avvisi & Comunicazioni" subtitle={`${avvisi.length} avvisi`}
                    actions={<Btn label="Nuovo Avviso" icon="add" onPress={() => { setFormData({ categoria: 'Avviso generico' }); setShowModal('newAvviso'); }} />}
                  />
                  <DataTable
                    columns={[
                      { key: 'titolo', label: 'Titolo', flex: 2 },
                      { key: 'categoria', label: 'Categoria', flex: 1.5 },
                      { key: 'condominio', label: 'Condominio', flex: 1.5, render: row => <Text style={dt.cell}>{row.condominio_id ? (condomini.find(c => c.id === row.condominio_id)?.nome || '—') : 'Tutti'}</Text> },
                      { key: 'created_at', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                      { key: 'azioni', label: '', flex: 0.5, render: row => (
                        <TouchableOpacity onPress={() => deleteAvviso(row.id)}>
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      )},
                    ]}
                    data={avvisi}
                    onRowPress={row => { setSelected(row); setShowModal('detailAvviso'); }}
                    emptyText="Nessun avviso pubblicato"
                  />
                </View>
              )}

              {/* ── TRASMISSIONI ── */}
              {tab === 'trasmissioni' && (
                <View>
                  <PageHeader title="Trasmissioni Documenti" subtitle={`${trasmissioni.length} trasmissioni`} />
                  <DataTable
                    columns={[
                      { key: 'utente', label: 'Utente', flex: 1.5, render: row => {
                        const u = utenti.find(u => u.id === row.user_id);
                        return <Text style={dt.cell}>{u ? `${u.nome} ${u.cognome}` : '—'}</Text>;
                      }},
                      { key: 'oggetto', label: 'Oggetto', flex: 2 },
                      { key: 'n_file', label: 'File', flex: 0.7, render: row => <Text style={dt.cell}>{(row.files || []).length}</Text> },
                      { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato || '—'} /> },
                      { key: 'created_at', label: 'Data', flex: 1, render: row => <Text style={dt.cell}>{fmtDate(row.created_at)}</Text> },
                    ]}
                    data={trasmissioni}
                    emptyText="Nessuna trasmissione documenti"
                  />
                </View>
              )}

              {/* ── PRIVACY ── */}
              {tab === 'privacy' && (
                <View>
                  <PageHeader title="Richieste Privacy" subtitle="Gestione richieste GDPR (artt. 15-22)"
                    actions={<Btn label="Aggiorna" icon="refresh-outline" onPress={loadPrivacy} outline />}
                  />
                  {privacyScadenzaCount > 0 && (
                    <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: '#DC2626' }}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <Text style={{ fontSize: 14, color: '#DC2626', fontWeight: '600', marginLeft: 10 }}>
                        {privacyScadenzaCount} {privacyScadenzaCount === 1 ? 'richiesta scade' : 'richieste scadono'} entro 5 giorni
                      </Text>
                    </View>
                  )}
                  <DataTable
                    columns={[
                      { key: 'protocollo', label: 'Protocollo', flex: 1.2 },
                      { key: 'user_nome', label: 'Utente', flex: 1.5, render: row => <Text style={dt.cell}>{row.user_nome || row.user_email || '—'}</Text> },
                      { key: 'tipo', label: 'Tipo', flex: 1.5 },
                      { key: 'stato', label: 'Stato', flex: 1, render: row => <StatoBadge stato={row.stato} /> },
                      { key: 'scadenza', label: 'Scadenza', flex: 1, render: row => {
                        const days = row.giorni_rimanenti;
                        const red = days !== null && days !== undefined && days <= 5 && (row.stato === 'ricevuta' || row.stato === 'in_lavorazione');
                        return <Text style={{ fontSize: 13, color: red ? '#DC2626' : Colors.textMain, fontWeight: red ? '700' : '400' }}>{fmtDate(row.scadenza)}{red ? ` (${days}gg)` : ''}</Text>;
                      }},
                      { key: 'azioni', label: 'Azioni', flex: 1.2, render: row => (
                        (row.stato === 'ricevuta' || row.stato === 'in_lavorazione') ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => evadiPrivacy(row.id, 'evasa')}>
                              <Ionicons name="checkmark-circle-outline" size={20} color="#15803D" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                              Alert.prompt
                                ? Alert.prompt('Rifiuta', 'Motivazione:', (mot) => evadiPrivacy(row.id, 'rifiutata', mot))
                                : Alert.alert('Azione', 'Cosa fare?', [
                                    { text: 'Annulla', style: 'cancel' },
                                    { text: 'Evadi', onPress: () => evadiPrivacy(row.id, 'evasa') },
                                    { text: 'Rifiuta', onPress: () => evadiPrivacy(row.id, 'rifiutata', 'Richiesta non accoglibile') },
                                  ]);
                            }}>
                              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        ) : <Text style={{ fontSize: 12, color: Colors.textMuted }}>—</Text>
                      )},
                    ]}
                    data={richiestePrivacy}
                    emptyText="Nessuna richiesta privacy"
                  />
                </View>
              )}

              {/* ── CONFIG ── */}
              {tab === 'config' && config && (
                <View>
                  <PageHeader title="Impostazioni Studio"
                    actions={<Btn label="Salva tutto" icon="save-outline" onPress={saveConfig} />}
                  />
                  <View style={s.configGrid}>
                    {[
                      { label: 'Nome Studio', key: 'nome_studio' },
                      { label: 'Indirizzo', key: 'indirizzo' },
                      { label: 'Città', key: 'citta' },
                      { label: 'Telefono', key: 'telefono' },
                      { label: 'Email', key: 'email' },
                      { label: 'Sito Web', key: 'sito_web' },
                      { label: 'P.IVA', key: 'p_iva' },
                      { label: 'PEC', key: 'pec' },
                    ].map(({ label, key }) => (
                      <View key={key} style={s.configField}>
                        <Text style={fi.label}>{label}</Text>
                        <TextInput
                          style={[fi.input, { backgroundColor: Colors.white }]}
                          value={config[key] || ''}
                          onChangeText={v => setConfig((p: any) => ({ ...p, [key]: v }))}
                          placeholder={label}
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    ))}
                  </View>
                  {config.orari_ufficio !== undefined && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={fi.label}>Orari ufficio</Text>
                      <TextInput
                        style={[fi.input, { height: 80, textAlignVertical: 'top', backgroundColor: Colors.white }]}
                        multiline
                        value={config.orari_ufficio || ''}
                        onChangeText={v => setConfig((p: any) => ({ ...p, orari_ufficio: v }))}
                        placeholder="Orari ufficio..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  )}
                </View>
              )}

          </ScrollView>
        }
      </View>

      {/* ── MODALS ── */}

      {/* New / Edit Condominio */}
      {(showModal === 'newCond' || showModal === 'editCond') && (
        <DeskModal
          visible
          title={showModal === 'newCond' ? 'Nuovo Condominio' : 'Modifica Condominio'}
          onClose={() => { setShowModal(null); setFormData({}); setSelected(null); }}
          width={640}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {[
              { l: 'Tipo *', k: 'tipo' }, { l: 'Nome *', k: 'nome' },
              { l: 'Codice Fiscale', k: 'codice_fiscale' }, { l: 'Indirizzo *', k: 'indirizzo' },
              { l: 'CAP', k: 'cap' }, { l: 'Città', k: 'citta' }, { l: 'Provincia', k: 'provincia' },
              { l: 'Banca', k: 'banca' }, { l: 'IBAN', k: 'iban' }, { l: 'SWIFT', k: 'swift' },
              { l: 'Data apertura esercizio', k: 'data_apertura_esercizio' }, { l: 'Data costruzione', k: 'data_costruzione' },
              { l: 'Inizio incarico', k: 'data_inizio_incarico' }, { l: 'Fine incarico', k: 'data_fine_incarico' },
            ].map(({ l, k }) => (
              <View key={k} style={{ width: '47%' }}>
                <FInput label={l} value={formData[k] || ''} onChange={v => setForm(k, v)} />
              </View>
            ))}
            <View style={{ width: '100%' }}>
              <FInput label="Dati catastali" value={formData.dati_catastali || ''} onChange={v => setForm('dati_catastali', v)} multiline />
            </View>
            <View style={{ width: '100%' }}>
              <FInput label="Note" value={formData.note || ''} onChange={v => setForm('note', v)} multiline />
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <Btn label={showModal === 'newCond' ? 'Crea Condominio' : 'Salva Modifiche'}
              onPress={showModal === 'newCond' ? createCondominio : updateCondominio} />
          </View>
        </DeskModal>
      )}

      {/* New Fornitore */}
      {showModal === 'newForn' && (
        <DeskModal visible title="Nuovo Fornitore" onClose={() => { setShowModal(null); setFormData({}); }} width={560}>
          <FInput label="Ragione Sociale *" value={formData.ragione_sociale || ''} onChange={v => setForm('ragione_sociale', v)} />
          <FInput label="Email *" value={formData.email || ''} onChange={v => setForm('email', v)} />
          <FInput label="Telefono" value={formData.telefono || ''} onChange={v => setForm('telefono', v)} />
          <FInput label="P.IVA" value={formData.p_iva || ''} onChange={v => setForm('p_iva', v)} />
          <FInput label="Specializzazione" value={formData.specializzazione || ''} onChange={v => setForm('specializzazione', v)} />
          <FInput label="Password *" value={formData.password || ''} onChange={v => setForm('password', v)} />
          <Btn label="Crea Fornitore" onPress={createFornitore} />
        </DeskModal>
      )}

      {/* New Collaboratore */}
      {showModal === 'newCollab' && (
        <DeskModal visible title="Nuovo Collaboratore" onClose={() => { setShowModal(null); setFormData({}); }}>
          <FInput label="Nome *" value={formData.nome || ''} onChange={v => setForm('nome', v)} />
          <FInput label="Cognome *" value={formData.cognome || ''} onChange={v => setForm('cognome', v)} />
          <FInput label="Email *" value={formData.email || ''} onChange={v => setForm('email', v)} />
          <FInput label="Password *" value={formData.password || ''} onChange={v => setForm('password', v)} />
          <Btn label="Crea Collaboratore" onPress={async () => {
            try {
              const c = await api.createCollaboratore(token!, formData);
              setCollaboratori(p => [...p, c]);
              setShowModal(null); setFormData({});
              Alert.alert('Creato', 'Collaboratore aggiunto');
            } catch (e: any) { Alert.alert('Errore', e.message); }
          }} />
        </DeskModal>
      )}

      {/* New Avviso */}
      {showModal === 'newAvviso' && (
        <DeskModal visible title="Nuovo Avviso" onClose={() => { setShowModal(null); setFormData({}); }} width={560}>
          <FInput label="Titolo *" value={formData.titolo || ''} onChange={v => setForm('titolo', v)} />
          <FInput label="Testo *" value={formData.testo || ''} onChange={v => setForm('testo', v)} multiline />
          <View style={{ marginBottom: 14 }}>
            <Text style={fi.label}>Categoria</Text>
            {['Avviso generico', 'Convocazione assemblea', 'Lavori in corso', 'Comunicazione urgente'].map(cat => (
              <TouchableOpacity key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }} onPress={() => setForm('categoria', cat)}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.navy, backgroundColor: formData.categoria === cat ? Colors.navy : 'transparent', marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: Colors.textMain }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Btn label="Pubblica Avviso" onPress={createAvviso} />
        </DeskModal>
      )}

      {/* New Segnalazione */}
      {showModal === 'newSeg' && (
        <DeskModal visible title="Nuova Segnalazione" onClose={() => { setShowModal(null); setFormData({}); }} width={560}>
          <View style={{ marginBottom: 14 }}>
            <Text style={fi.label}>Condominio *</Text>
            {condomini.map(c => (
              <TouchableOpacity key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }} onPress={() => setForm('condominio_id', c.id)}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.navy, backgroundColor: formData.condominio_id === c.id ? Colors.navy : 'transparent', marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: Colors.textMain }}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FInput label="Tipologia *" value={formData.tipologia || ''} onChange={v => setForm('tipologia', v)} placeholder="Es. Guasto idraulico" />
          <FInput label="Descrizione *" value={formData.descrizione || ''} onChange={v => setForm('descrizione', v)} multiline />
          <View style={{ marginBottom: 14 }}>
            <Text style={fi.label}>Urgenza</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Bassa', 'Media', 'Alta', 'Urgente'].map(u => (
                <TouchableOpacity key={u} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: formData.urgenza === u ? Colors.navy : Colors.bg, borderWidth: 1, borderColor: formData.urgenza === u ? Colors.navy : Colors.border }} onPress={() => setForm('urgenza', u)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: formData.urgenza === u ? Colors.white : Colors.textSec }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Btn label="Crea Segnalazione" onPress={async () => {
            if (!formData.condominio_id || !formData.tipologia || !formData.descrizione) { Alert.alert('Attenzione', 'Compila tutti i campi obbligatori'); return; }
            try {
              const seg = await api.createAdminSegnalazione(token!, formData);
              setSegnalazioni(p => [seg, ...p]);
              setShowModal(null); setFormData({});
            } catch (e: any) { Alert.alert('Errore', e.message); }
          }} />
        </DeskModal>
      )}

      {/* Detail Segnalazione — Full Featured */}
      {showModal === 'detailSeg' && selected && (
        <SegnalazioneDetailModal
          seg={selected}
          token={token!}
          condomini={condomini}
          fornitori={fornitori}
          onClose={() => { setShowModal(null); setSelected(null); }}
          onUpdate={(updated) => {
            setSegnalazioni(p => p.map(x => x.id === updated.id ? { ...x, ...updated } : x));
          }}
          onRefreshAll={loadAll}
        />
      )}

      {/* Detail Avviso */}
      {showModal === 'detailAvviso' && selected && (
        <DeskModal visible title={selected.titolo} onClose={() => { setShowModal(null); setSelected(null); }}>
          <Text style={{ fontSize: 14, color: Colors.textSec, marginBottom: 8 }}>{selected.categoria} · {fmtDate(selected.created_at)}</Text>
          <Text style={{ fontSize: 15, color: Colors.textMain, lineHeight: 22 }}>{selected.testo}</Text>
        </DeskModal>
      )}

      {/* Sopralluogo Detail Modal */}
      {showModal === 'detailSop' && selectedSopId && token && (
        <DeskModal
          visible
          title="Dettaglio Sopralluogo"
          onClose={() => { setShowModal(null); setSelectedSopId(null); }}
          width={820}
        >
          <SopralluogoDetail
            sopralluogoId={selectedSopId}
            token={token}
            condominiMap={Object.fromEntries(condomini.map(c => [c.id, c.nome]))}
            collaboratoriMap={Object.fromEntries(collaboratori.map(c => [c.id, `${c.nome} ${c.cognome || ''}`]))}
          />
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
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.navy,
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
  navBadge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  navBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 12, flexDirection: 'row', alignItems: 'center',
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  userAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.navy,
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
    flex: 1, minWidth: 200, backgroundColor: Colors.white,
    borderRadius: 14, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: '800', color: Colors.navy },
  statLabel: { fontSize: 13, color: Colors.textSec, marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.navy, marginBottom: 12 },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  configField: { width: '47%' },
});
