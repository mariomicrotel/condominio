import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerSelect, PrimaryButton } from '../SharedComponents';
import { s, cs2 } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';

const TIPO_COND_OPT = ['Condominio', 'Palazzo', 'Edificio', 'Complesso residenziale', 'Villaggio', 'Altro'];

function CondominioFormFields({ form, onChange }: { form: any; onChange: (key: string, value: string) => void }) {
  const inp = (placeholder: string, key: string, opts?: { multiline?: boolean; keyboard?: any; testID?: string }) => (
    <TextInput
      testID={opts?.testID || `cond-${key}-input`}
      style={[cfStyles.input, opts?.multiline && { height: 72, textAlignVertical: 'top' }]}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      value={form[key] || ''}
      onChangeText={v => onChange(key, v)}
      keyboardType={opts?.keyboard}
      multiline={opts?.multiline}
    />
  );
  return (
    <>
      <Text style={cfStyles.sectionHeader}>Anagrafica</Text>
      <PickerSelect label="Tipo *" value={form.tipo || 'Condominio'} options={TIPO_COND_OPT} onSelect={v => onChange('tipo', v)} testID="cond-tipo-picker" />
      {inp('Nome condominio *', 'nome', { testID: 'cond-nome-input' })}
      {inp('Codice Fiscale', 'codice_fiscale', { testID: 'cond-cf-input' })}
      <Text style={cfStyles.sectionHeader}>Indirizzo</Text>
      {inp('Via / Piazza *', 'indirizzo', { testID: 'cond-indirizzo-input' })}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 100 }}>{inp('CAP', 'cap', { keyboard: 'number-pad' })}</View>
        <View style={{ flex: 1 }}>{inp('Città', 'citta')}</View>
        <View style={{ width: 60 }}>{inp('Prov.', 'provincia')}</View>
      </View>
      <Text style={cfStyles.sectionHeader}>Date gestionali</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{inp('Data apertura esercizio (gg/mm/aaaa)', 'data_apertura_esercizio')}</View>
        <View style={{ flex: 1 }}>{inp('Data costruzione', 'data_costruzione')}</View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{inp('Inizio incarico (gg/mm/aaaa)', 'data_inizio_incarico')}</View>
        <View style={{ flex: 1 }}>{inp('Fine incarico (gg/mm/aaaa)', 'data_fine_incarico')}</View>
      </View>
      <Text style={cfStyles.sectionHeader}>Dati bancari</Text>
      {inp('Banca', 'banca')}
      {inp('IBAN', 'iban')}
      {inp('SWIFT / BIC', 'swift')}
      <Text style={cfStyles.sectionHeader}>Dati catastali</Text>
      {inp('Dati catastali', 'dati_catastali', { multiline: true })}
      <Text style={cfStyles.sectionHeader}>Note</Text>
      {inp('Note interne', 'note', { multiline: true, testID: 'cond-note-input' })}
    </>
  );
}
import { StyleSheet } from 'react-native';
const cfStyles = StyleSheet.create({
  sectionHeader: { fontSize: 12, fontWeight: '700', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 14, marginBottom: 10, fontSize: 15, color: Colors.textMain },
});

const EMPTY_COND = {
  tipo: 'Condominio', nome: '', indirizzo: '', cap: '', citta: '', provincia: '',
  codice_fiscale: '', data_apertura_esercizio: '', data_costruzione: '',
  data_inizio_incarico: '', data_fine_incarico: '',
  banca: '', iban: '', swift: '', dati_catastali: '', note: ''
};

interface Props {
  token: string;
  condomini: any[];
  setCondomini: (fn: (p: any[]) => any[]) => void;
  onRefresh: () => void;
}

export default function CondominiiTab({ token, condomini, setCondomini, onRefresh }: Props) {
  const [showNewCond, setShowNewCond] = useState(false);
  const [newCond, setNewCond] = useState({ ...EMPTY_COND });
  const [editCond, setEditCond] = useState<any>(null);
  const [condSearch, setCondSearch] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);

  const createCond = async () => {
    if (!newCond.nome.trim() || !newCond.indirizzo.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo sono obbligatori'); return; }
    try {
      const c = await api.createCondominio(token, newCond);
      setCondomini(p => [...p, c]);
      setShowNewCond(false);
      setNewCond({ ...EMPTY_COND });
      Alert.alert('Creato', 'Condominio aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const updateCond = async () => {
    if (!editCond || !editCond.nome.trim() || !editCond.indirizzo.trim()) { Alert.alert('Attenzione', 'Nome e indirizzo sono obbligatori'); return; }
    try {
      const updated = await api.updateCondominio(token, editCond.id, editCond);
      setCondomini(p => p.map(c => c.id === editCond.id ? updated : c));
      setEditCond(null);
      Alert.alert('Salvato', 'Condominio aggiornato');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteCond = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteCondominio(token, id);
        setCondomini(p => p.filter(c => c.id !== id));
      }},
    ]);
  };

  const handleImportCsv = async () => {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel', 'text/csv', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImportingCsv(true);
    try {
      const file = { uri: asset.uri, name: asset.name || 'import.xls', type: asset.mimeType || 'application/octet-stream' };
      const res = await api.importCondominiFile(token, file);
      Alert.alert('Import completato', `${res.creati} creati, ${res.aggiornati} aggiornati su ${res.righe_elaborate} righe.`);
      onRefresh();
    } catch (e: any) { Alert.alert('Errore', e.message || "Errore durante l'import"); }
    finally { setImportingCsv(false); }
  };

  const filteredCondomini = (() => {
    if (!condSearch.trim()) return condomini;
    const q = condSearch.toLowerCase();
    return condomini.filter(c =>
      c.nome?.toLowerCase().includes(q) || c.indirizzo?.toLowerCase().includes(q) ||
      c.citta?.toLowerCase().includes(q) || c.cap?.includes(q) ||
      c.codice_fiscale?.toLowerCase().includes(q) || c.iban?.toLowerCase().includes(q) ||
      c.dati_catastali?.toLowerCase().includes(q)
    );
  })();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
        <TouchableOpacity testID="admin-new-cond-btn" style={[s.addBtn, { flex: 1, marginTop: 0 }]} onPress={() => setShowNewCond(true)}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={s.addBtnText}>Nuovo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { flex: 1, marginTop: 0, backgroundColor: importingCsv ? Colors.textMuted : '#7C3AED' }]} onPress={handleImportCsv} disabled={importingCsv}>
          {importingCsv ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />}
          <Text style={s.addBtnText}>{importingCsv ? 'Import...' : 'Importa XLS/CSV'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginVertical: 8, paddingHorizontal: 12, height: 44 }}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={{ flex: 1, fontSize: 15, color: Colors.textMain }} placeholder="Cerca per nome, indirizzo, città, CF…" placeholderTextColor={Colors.textMuted} value={condSearch} onChangeText={setCondSearch} clearButtonMode="while-editing" returnKeyType="search" />
        {condSearch.length > 0 && <TouchableOpacity onPress={() => setCondSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity>}
      </View>
      {condSearch.length > 0 && (
        <Text style={{ fontSize: 12, color: Colors.textSec, marginHorizontal: 20, marginBottom: 4 }}>
          {filteredCondomini.length} {filteredCondomini.length === 1 ? 'risultato' : 'risultati'} per "{condSearch}"
        </Text>
      )}
      <FlatList data={filteredCondomini} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            {condSearch.length > 0
              ? <><Ionicons name="search-outline" size={40} color={Colors.textMuted} /><Text style={[s.emptyText, { marginTop: 10 }]}>Nessun condominio trovato per "{condSearch}"</Text></>
              : <Text style={s.emptyText}>Nessun condominio. Usa "Importa XLS/CSV" per caricare i dati dal gestionale.</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View testID={`admin-cond-${item.id}`} style={s.listCard}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}><Ionicons name="business" size={18} color="#16A34A" /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.listTitle}>{item.nome}</Text>
                  {item.tipo && item.tipo !== 'Condominio' && <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}><Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '600' }}>{item.tipo}</Text></View>}
                </View>
                <Text style={s.listSub2}>{[item.indirizzo, item.cap, item.citta, item.provincia].filter(Boolean).join(' – ')}</Text>
                {item.codice_fiscale ? <Text style={s.listMeta}>CF: {item.codice_fiscale}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setEditCond({ ...item })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="create-outline" size={20} color={Colors.sky} /></TouchableOpacity>
                <TouchableOpacity testID={`admin-del-cond-${item.id}`} onPress={() => deleteCond(item.id, item.nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="trash-outline" size={20} color={Colors.error} /></TouchableOpacity>
              </View>
            </View>
            {(item.iban || item.banca || item.data_inizio_incarico || item.dati_catastali) && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
                {item.banca || item.iban ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  {item.banca ? <View style={cs2.pill}><Ionicons name="card-outline" size={12} color={Colors.textSec} /><Text style={cs2.pillText}>{item.banca}</Text></View> : null}
                  {item.iban ? <View style={cs2.pill}><Text style={cs2.pillText}>{item.iban}</Text></View> : null}
                </View> : null}
                {item.data_inizio_incarico || item.data_apertura_esercizio ? <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
                  {item.data_inizio_incarico ? <Text style={cs2.metaText}>Incarico dal {item.data_inizio_incarico}{item.data_fine_incarico ? ` al ${item.data_fine_incarico}` : ''}</Text> : null}
                  {item.data_apertura_esercizio ? <Text style={cs2.metaText}>Esercizio: {item.data_apertura_esercizio}</Text> : null}
                </View> : null}
                {item.dati_catastali ? <Text style={[cs2.metaText, { marginTop: 2 }]}>Catasto: {item.dati_catastali}</Text> : null}
              </View>
            )}
          </View>
        )} />

      {/* Modal: Nuovo Condominio */}
      <Modal visible={showNewCond} transparent animationType="slide" onRequestClose={() => setShowNewCond(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={s.modalTitle}>Nuovo Condominio</Text>
              <TouchableOpacity onPress={() => setShowNewCond(false)}><Ionicons name="close" size={24} color={Colors.navy} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <CondominioFormFields form={newCond} onChange={(k, v) => setNewCond((p: any) => ({ ...p, [k]: v }))} />
              <PrimaryButton title="Crea Condominio" onPress={createCond} testID="cond-create-btn" />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Modifica Condominio */}
      <Modal visible={!!editCond} transparent animationType="slide" onRequestClose={() => setEditCond(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={s.modalTitle}>Modifica Condominio</Text>
              <TouchableOpacity onPress={() => setEditCond(null)}><Ionicons name="close" size={24} color={Colors.navy} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {editCond && <CondominioFormFields form={editCond} onChange={(k, v) => setEditCond((p: any) => ({ ...p, [k]: v }))} />}
              <PrimaryButton title="Salva Modifiche" onPress={updateCond} testID="cond-update-btn" />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
