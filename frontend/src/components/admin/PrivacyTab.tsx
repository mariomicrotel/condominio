import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../SharedComponents';
import { s, pvs } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';

const PRIV_TIPO_LABELS: Record<string, string> = {
  cancellazione: 'Cancellazione account', limitazione: 'Limitazione trattamento',
  accesso: 'Accesso ai dati', portabilita: 'Portabilità dati', opposizione: 'Opposizione',
};
const PRIV_TIPO_COLORS: Record<string, string> = {
  cancellazione: '#FEE2E2', limitazione: '#FEF3C7', accesso: '#DBEAFE', portabilita: '#F3E8FF', opposizione: '#FCE7F3',
};
const PRIV_STATO_COLORS: Record<string, { bg: string; text: string }> = {
  ricevuta: { bg: '#DBEAFE', text: '#1D4ED8' }, in_lavorazione: { bg: '#FEF9C3', text: '#A16207' },
  evasa: { bg: '#DCFCE7', text: '#15803D' }, rifiutata: { bg: '#FEE2E2', text: '#DC2626' },
};

interface Props {
  token: string;
  privacyScadenzaCount: number;
  onScadenzaCountUpdate: (count: number) => void;
}

export default function PrivacyTab({ token, privacyScadenzaCount, onScadenzaCountUpdate }: Props) {
  const [richieste, setRichieste] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<{ stato?: string; tipo?: string; scadenza?: boolean }>({});
  const [showDetail, setShowDetail] = useState<any>(null);
  const [evadiForm, setEvadiForm] = useState({ azione: 'evasa', motivazione_rifiuto: '', note_admin: '' });
  const [evadiLoading, setEvadiLoading] = useState(false);

  const loadRichieste = useCallback(async (filters?: { stato?: string; tipo?: string; scadenza?: boolean }) => {
    setLoading(true);
    try {
      const data = await api.adminListRichiestePrivacy(token, { stato: filters?.stato, tipo: filters?.tipo, scadenza_imminente: filters?.scadenza });
      setRichieste(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  React.useEffect(() => { loadRichieste(filter); }, []);

  const fmtD = (iso: string) => iso ? new Date(iso).toLocaleDateString('it-IT') : '—';

  const onFilterChange = (f: any) => { setFilter(f); loadRichieste(f); };

  const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[pvs.chip, active && pvs.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[pvs.chipText, active && pvs.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const handleEvadi = async () => {
    if (evadiForm.azione === 'rifiutata' && !evadiForm.motivazione_rifiuto.trim()) { Alert.alert('Attenzione', 'Inserisci la motivazione del rifiuto'); return; }
    const doEvadi = async () => {
      setEvadiLoading(true);
      try {
        await api.adminEvadiRichiestaPrivacy(token, showDetail.id, evadiForm);
        Alert.alert('Successo', `Richiesta ${evadiForm.azione} con successo`);
        setShowDetail(null); loadRichieste(filter);
        api.adminCountScadenzaPrivacy(token).then((r: any) => onScadenzaCountUpdate(r.scadenza_imminente || 0)).catch(() => {});
      } catch (e: any) { Alert.alert('Errore', e.message); } finally { setEvadiLoading(false); }
    };
    if (showDetail.tipo === 'cancellazione' && evadiForm.azione === 'evasa') {
      Alert.alert('Conferma anonimizzazione', "Sei sicuro di voler anonimizzare definitivamente l'account? L'operazione non è reversibile.", [{ text: 'Annulla', style: 'cancel' }, { text: 'Conferma', style: 'destructive', onPress: doEvadi }]);
    } else { await doEvadi(); }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadRichieste(filter)} />}>
        {privacyScadenzaCount > 0 && <View style={pvs.alertBanner}><Ionicons name="alert-circle" size={18} color="#DC2626" /><Text style={pvs.alertText}>{privacyScadenzaCount} {privacyScadenzaCount === 1 ? 'richiesta scade' : 'richieste scadono'} entro 5 giorni!</Text><TouchableOpacity onPress={() => onFilterChange({ ...filter, scadenza: !filter.scadenza })} style={pvs.alertBtn}><Text style={pvs.alertBtnText}>{filter.scadenza ? 'Tutte' : 'Mostra'}</Text></TouchableOpacity></View>}
        <Text style={pvs.filterLabel}>Filtra per stato:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          <FilterChip label="Tutte" active={!filter.stato} onPress={() => onFilterChange({ ...filter, stato: undefined })} />
          {['ricevuta', 'in_lavorazione', 'evasa', 'rifiutata'].map(st => <FilterChip key={st} label={st.replace('_', ' ')} active={filter.stato === st} onPress={() => onFilterChange({ ...filter, stato: filter.stato === st ? undefined : st })} />)}
        </View></ScrollView>
        <Text style={pvs.filterLabel}>Filtra per tipo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}><View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          <FilterChip label="Tutti" active={!filter.tipo} onPress={() => onFilterChange({ ...filter, tipo: undefined })} />
          {Object.entries(PRIV_TIPO_LABELS).map(([k, v]) => <FilterChip key={k} label={v} active={filter.tipo === k} onPress={() => onFilterChange({ ...filter, tipo: filter.tipo === k ? undefined : k })} />)}
        </View></ScrollView>
        {loading ? <ActivityIndicator size="large" color={Colors.navy} style={{ marginTop: 32 }} />
          : richieste.length === 0 ? <View style={pvs.emptyBox}><Ionicons name="shield-checkmark-outline" size={48} color={Colors.textMuted} /><Text style={pvs.emptyText}>Nessuna richiesta privacy</Text><Text style={pvs.emptySubText}>Le richieste degli utenti appariranno qui</Text></View>
          : richieste.map(r => {
              const stato = PRIV_STATO_COLORS[r.stato] || { bg: '#F3F4F6', text: '#374151' };
              const isScadente = r.giorni_rimanenti !== null && r.giorni_rimanenti !== undefined && r.giorni_rimanenti <= 5 && (r.stato === 'ricevuta' || r.stato === 'in_lavorazione');
              return (
                <TouchableOpacity key={r.id} style={[pvs.card, isScadente && pvs.cardScadente]} onPress={() => { setShowDetail(r); setEvadiForm({ azione: 'evasa', motivazione_rifiuto: '', note_admin: '' }); }} activeOpacity={0.8}>
                  <View style={pvs.cardTop}><View style={[pvs.tipoBadge, { backgroundColor: PRIV_TIPO_COLORS[r.tipo] || '#F3F4F6' }]}><Text style={pvs.tipoBadgeText}>{PRIV_TIPO_LABELS[r.tipo] || r.tipo}</Text></View><View style={[pvs.statoBadge, { backgroundColor: stato.bg }]}><Text style={[pvs.statoBadgeText, { color: stato.text }]}>{r.stato}</Text></View></View>
                  <View style={pvs.cardRow}><View style={{ flex: 1 }}><Text style={pvs.cardNome}>{r.user_nome || r.user_email || 'Utente rimosso'}</Text><Text style={pvs.cardProto}>{r.protocollo}</Text><Text style={pvs.cardDate}>Ricevuta: {fmtD(r.created_at)}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}>{(r.stato === 'ricevuta' || r.stato === 'in_lavorazione') && <View style={[pvs.scadBadge, isScadente && pvs.scadBadgeRed]}><Ionicons name="time-outline" size={12} color={isScadente ? '#DC2626' : Colors.textSec} /><Text style={[pvs.scadText, isScadente && pvs.scadTextRed]}>{r.giorni_rimanenti !== null ? `${r.giorni_rimanenti}gg` : fmtD(r.scadenza)}</Text></View>}<Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginTop: 6 }} /></View>
                  </View>
                </TouchableOpacity>
              );
            })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Privacy Detail Modal */}
      <Modal visible={!!showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(null)}>
        <View style={s.modalOverlay}><ScrollView style={[s.modal, { maxHeight: '90%' }]} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text style={s.modalTitle}>Richiesta Privacy</Text><TouchableOpacity onPress={() => setShowDetail(null)}><Ionicons name="close" size={24} color={Colors.navy} /></TouchableOpacity></View>
          {showDetail && <>
            <View style={{ backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginBottom: 14 }}>
              {[{ label: 'Protocollo', val: showDetail.protocollo }, { label: 'Utente', val: showDetail.user_nome || showDetail.user_email || '—' }, { label: 'Tipo', val: PRIV_TIPO_LABELS[showDetail.tipo] || showDetail.tipo }, { label: 'Stato', val: showDetail.stato }, { label: 'Ricevuta il', val: showDetail.created_at ? new Date(showDetail.created_at).toLocaleDateString('it-IT') : '—' }, { label: 'Scadenza', val: showDetail.scadenza ? new Date(showDetail.scadenza).toLocaleDateString('it-IT') : '—' }, ...(showDetail.giorni_rimanenti !== null && showDetail.giorni_rimanenti !== undefined ? [{ label: 'Giorni rimasti', val: `${showDetail.giorni_rimanenti}` }] : []), ...(showDetail.evasa_il ? [{ label: 'Evasa il', val: new Date(showDetail.evasa_il).toLocaleDateString('it-IT') }] : []), ...(showDetail.motivazione_rifiuto ? [{ label: 'Motivazione rifiuto', val: showDetail.motivazione_rifiuto }] : [])].map(({ label, val }) => (
                <View key={label} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border }}><Text style={{ fontSize: 13, color: Colors.textSec, width: 130 }}>{label}</Text><Text style={{ fontSize: 13, color: Colors.textMain, fontWeight: '500', flex: 1 }}>{val}</Text></View>
              ))}
            </View>
            {(showDetail.stato === 'ricevuta' || showDetail.stato === 'in_lavorazione') && <>
              <Text style={s.modalLabel}>Azione:</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {(['evasa', 'rifiutata'] as const).map(az => <TouchableOpacity key={az} style={[{ flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2 }, evadiForm.azione === az ? { backgroundColor: az === 'evasa' ? '#DCFCE7' : '#FEE2E2', borderColor: az === 'evasa' ? '#16A34A' : '#DC2626' } : { backgroundColor: Colors.bg, borderColor: Colors.border }]} onPress={() => setEvadiForm(p => ({ ...p, azione: az }))}><Text style={{ fontSize: 14, fontWeight: '600', color: az === 'evasa' ? '#15803D' : '#DC2626' }}>{az === 'evasa' ? '✓ Evadi' : '✗ Rifiuta'}</Text></TouchableOpacity>)}
              </View>
              {evadiForm.azione === 'rifiutata' && <><Text style={s.modalLabel}>Motivazione rifiuto *</Text><TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]} multiline value={evadiForm.motivazione_rifiuto} onChangeText={v => setEvadiForm(p => ({ ...p, motivazione_rifiuto: v }))} placeholder="Inserisci la motivazione..." placeholderTextColor={Colors.textMuted} /></>}
              <Text style={s.modalLabel}>Note interne (facoltative)</Text>
              <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]} multiline value={evadiForm.note_admin} onChangeText={v => setEvadiForm(p => ({ ...p, note_admin: v }))} placeholder="Note di servizio..." placeholderTextColor={Colors.textMuted} />
              {showDetail.tipo === 'cancellazione' && evadiForm.azione === 'evasa' && <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#D97706' }}><Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>⚠️ Attenzione</Text><Text style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>Questa azione anonimizzerà permanentemente l'account dell'utente.</Text></View>}
              <TouchableOpacity style={[s.submitBtn, evadiLoading && { opacity: 0.7 }]} onPress={handleEvadi} disabled={evadiLoading} activeOpacity={0.8}>
                {evadiLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.submitBtnText}>Conferma azione</Text>}
              </TouchableOpacity>
            </>}
          </>}
        </ScrollView></View>
      </Modal>
    </>
  );
}
