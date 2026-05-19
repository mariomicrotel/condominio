import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerSelect, PrimaryButton } from '../SharedComponents';
import { s } from './styles';
import api from '../../services/api';

interface Props {
  token: string;
  avvisi: any[];
  setAvvisi: (fn: (p: any[]) => any[]) => void;
  condomini: any[];
  showNewAvviso: boolean;
  setShowNewAvviso: (v: boolean) => void;
}

export default function AvvisiTab({ token, avvisi, setAvvisi, condomini, showNewAvviso, setShowNewAvviso }: Props) {
  const [newAvviso, setNewAvviso] = useState({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });

  const createAvviso = async () => {
    if (!newAvviso.titolo.trim() || !newAvviso.testo.trim()) { Alert.alert('Attenzione', 'Inserisci titolo e testo'); return; }
    try {
      const a = await api.createAdminAvviso(token, { ...newAvviso, condominio_id: newAvviso.condominio_id || null });
      setAvvisi(p => [a, ...p]);
      setShowNewAvviso(false);
      setNewAvviso({ titolo: '', testo: '', categoria: 'Avviso generico', condominio_id: '' });
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteAvviso = (id: string) => {
    Alert.alert('Elimina', 'Eliminare questo avviso?', [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await api.deleteAdminAvviso(token, id); setAvvisi(p => p.filter(a => a.id !== id));
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity testID="admin-new-avviso-btn" style={s.addBtn} onPress={() => setShowNewAvviso(true)}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={s.addBtnText}>Nuovo Avviso</Text>
      </TouchableOpacity>
      <FlatList data={avvisi} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={<Text style={s.emptyText}>Nessun avviso</Text>}
        renderItem={({ item }) => (
          <View style={s.listCard}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: '#CCFBF1' }]}>
                <Ionicons name="megaphone" size={18} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.titolo}</Text>
                <Text style={s.listSub2} numberOfLines={2}>{item.testo}</Text>
                <Text style={s.listMeta}>{item.categoria} • {new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
              </View>
              <TouchableOpacity testID={`admin-del-avviso-${item.id}`} onPress={() => deleteAvviso(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )} />

      <Modal visible={showNewAvviso} transparent animationType="slide" onRequestClose={() => setShowNewAvviso(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Avviso</Text>
            <TextInput testID="avviso-titolo-input" style={s.input} placeholder="Titolo *" value={newAvviso.titolo} onChangeText={v => setNewAvviso(p => ({ ...p, titolo: v }))} placeholderTextColor="#9CA3AF" />
            <TextInput testID="avviso-testo-input" style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Testo *" value={newAvviso.testo} onChangeText={v => setNewAvviso(p => ({ ...p, testo: v }))} multiline placeholderTextColor="#9CA3AF" />
            <PickerSelect label="Categoria" value={newAvviso.categoria} options={['Avviso generico', 'Convocazione assemblea', 'Lavori in corso', 'Scadenza pagamento', 'Comunicazione urgente']} onSelect={v => setNewAvviso(p => ({ ...p, categoria: v }))} testID="avviso-cat-picker" />
            <PickerSelect label="Condominio (vuoto = tutti)" value={condomini.find(c => c.id === newAvviso.condominio_id)?.nome || 'Tutti i condomini'} options={['Tutti i condomini', ...condomini.map(c => c.nome)]} onSelect={v => { const c = condomini.find(c2 => c2.nome === v); setNewAvviso(p => ({ ...p, condominio_id: c?.id || '' })); }} testID="avviso-cond-picker" />
            <PrimaryButton title="Pubblica Avviso" onPress={createAvviso} testID="avviso-publish-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewAvviso(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
