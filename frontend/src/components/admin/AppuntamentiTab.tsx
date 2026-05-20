import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../SharedComponents';
import { s } from './styles';
import { api } from '../../services/api';

interface Props {
  token: string;
  appuntamenti: any[];
  condomini: any[];
  onRefresh: () => void;
}

export default function AppuntamentiTab({ token, appuntamenti, condomini, onRefresh }: Props) {
  const [modalApp, setModalApp] = useState<any>(null);

  const updateApp = async (id: string, stato: string) => {
    try {
      await api.updateAdminApp(token, id, { stato });
      setModalApp(null);
      onRefresh();
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  return (
    <>
      <FlatList data={appuntamenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={<Text style={s.emptyText}>Nessun appuntamento</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity testID={`admin-app-${item.id}`} style={s.listCard} onPress={() => setModalApp(item)}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="calendar" size={18} color="#EC4899" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.motivo}</Text>
                <Text style={s.listSub2}>{item.user_nome} • {new Date(item.data_richiesta).toLocaleDateString('it-IT')}</Text>
                <Text style={s.listMeta}>{item.fascia_oraria}</Text>
              </View>
              <StatusBadge status={item.stato} />
            </View>
          </TouchableOpacity>
        )} />

      <Modal visible={!!modalApp} transparent animationType="slide" onRequestClose={() => setModalApp(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Gestisci Appuntamento</Text>
            <Text style={s.modalSub}>{modalApp?.motivo} — {modalApp?.user_nome}</Text>
            <Text style={s.modalDesc}>Data: {modalApp?.data_richiesta ? new Date(modalApp.data_richiesta).toLocaleDateString('it-IT') : ''} • {modalApp?.fascia_oraria}</Text>
            {['Confermato', 'Completato', 'Annullato'].map(st => (
              <TouchableOpacity key={st} testID={`app-status-${st}`} style={[s.statusBtn, modalApp?.stato === st && { backgroundColor: '#E0F2FE' }]} onPress={() => updateApp(modalApp.id, st)}>
                <Text style={s.statusBtnText}>{st}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalApp(null)}><Text style={s.closeBtnText}>Chiudi</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
