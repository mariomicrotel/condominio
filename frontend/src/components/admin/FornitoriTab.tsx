import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ConfigField } from '../SharedComponents';
import { SETTORI } from './types';
import { s } from './styles';
import api from '../../services/api';

interface Props {
  token: string;
  fornitori: any[];
  onRefresh: () => void;
}

export default function FornitoriTab({ token, fornitori, onRefresh }: Props) {
  const [showNewForn, setShowNewForn] = useState(false);
  const [newForn, setNewForn] = useState({ ragione_sociale: '', partita_iva: '', codice_fiscale: '', settori: [] as string[], telefono: '', email: '', indirizzo: '', iban: '', stato: 'Attivo', password: '' });

  const createFornitoreHandler = async () => {
    if (!newForn.ragione_sociale.trim() || !newForn.email.trim()) { Alert.alert('Attenzione', 'Ragione sociale e email sono obbligatori'); return; }
    try {
      const result = await api.createFornitore(token, newForn);
      Alert.alert('Fornitore Creato', `Account creato per ${result.ragione_sociale}\n\nEmail: ${result.email}\nPassword temporanea: ${result.password_temp}\n\nComunicare le credenziali al fornitore.`);
      setShowNewForn(false);
      setNewForn({ ragione_sociale: '', partita_iva: '', codice_fiscale: '', settori: [], telefono: '', email: '', indirizzo: '', iban: '', stato: 'Attivo', password: '' });
      onRefresh();
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteFornitoreHandler = (id: string, nome: string) => {
    Alert.alert('Elimina Fornitore', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => { await api.deleteFornitore(token, id); onRefresh(); }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity testID="admin-new-forn-btn" style={[s.addBtn, { backgroundColor: '#EA580C' }]} onPress={() => setShowNewForn(true)}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={s.addBtnText}>Nuovo Fornitore</Text>
      </TouchableOpacity>
      <FlatList data={fornitori} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={<Text style={s.emptyText}>Nessun fornitore registrato</Text>}
        renderItem={({ item }) => (
          <View testID={`admin-forn-${item.id}`} style={s.listCard}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="construct" size={18} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.ragione_sociale}</Text>
                <Text style={s.listSub2}>{item.email} • {item.telefono || 'N/A'}</Text>
                {item.settori?.length > 0 && <Text style={s.listMeta}>{item.settori.join(', ')}</Text>}
                <Text style={s.listMeta}>Interventi: {item.interventi_count || 0} • {item.stato}</Text>
              </View>
              <TouchableOpacity testID={`del-forn-${item.id}`} onPress={() => deleteFornitoreHandler(item.id, item.ragione_sociale)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )} />

      <Modal visible={showNewForn} transparent animationType="slide" onRequestClose={() => setShowNewForn(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Fornitore</Text>
            <ConfigField testID="forn-rs" label="Ragione Sociale *" value={newForn.ragione_sociale} placeholder="Es: Idraulica Rossi" onChange={(v: string) => setNewForn(p => ({ ...p, ragione_sociale: v }))} />
            <ConfigField testID="forn-email" label="Email *" value={newForn.email} placeholder="fornitore@email.it" onChange={(v: string) => setNewForn(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <ConfigField testID="forn-pw" label="Password (auto se vuota)" value={newForn.password} placeholder="Lascia vuoto per auto-generare" onChange={(v: string) => setNewForn(p => ({ ...p, password: v }))} />
            <ConfigField testID="forn-tel" label="Telefono" value={newForn.telefono} placeholder="+39 333 1234567" onChange={(v: string) => setNewForn(p => ({ ...p, telefono: v }))} />
            <ConfigField testID="forn-piva" label="Partita IVA" value={newForn.partita_iva} placeholder="12345678901" onChange={(v: string) => setNewForn(p => ({ ...p, partita_iva: v }))} />
            <ConfigField testID="forn-cf" label="Codice Fiscale" value={newForn.codice_fiscale} placeholder="RSSMRA80A01H703K" onChange={(v: string) => setNewForn(p => ({ ...p, codice_fiscale: v }))} />
            <ConfigField testID="forn-addr" label="Indirizzo" value={newForn.indirizzo} placeholder="Via Roma 1, Salerno" onChange={(v: string) => setNewForn(p => ({ ...p, indirizzo: v }))} />
            <ConfigField testID="forn-iban" label="IBAN" value={newForn.iban} placeholder="IT60X0542811101000000123456" onChange={(v: string) => setNewForn(p => ({ ...p, iban: v }))} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4, marginTop: 8 }}>Settori di competenza</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SETTORI.map(sett => {
                const sel = newForn.settori.includes(sett);
                return (
                  <TouchableOpacity key={sett} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: sel ? '#EA580C' : '#F3F4F6', borderWidth: 1, borderColor: sel ? '#EA580C' : '#E5E7EB' }}
                    onPress={() => setNewForn(p => ({ ...p, settori: sel ? p.settori.filter(ss => ss !== sett) : [...p.settori, sett] }))}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: sel ? '#FFFFFF' : '#6B7280' }}>{sett}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <PrimaryButton title="Crea Fornitore" onPress={createFornitoreHandler} testID="forn-create-btn" style={{ backgroundColor: '#EA580C' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewForn(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
