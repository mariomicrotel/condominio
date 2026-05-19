import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../SharedComponents';
import { s } from './styles';
import api from '../../services/api';

interface Props {
  token: string;
  trasmissioni: any[];
  setTrasmissioni: (fn: (p: any[]) => any[]) => void;
}

export default function TrasmissioniTab({ token, trasmissioni, setTrasmissioni }: Props) {
  const updateTrasmStato = async (id: string, stato: string) => {
    try {
      await api.updateAdminTrasmissione(token, id, stato);
      setTrasmissioni(p => p.map(t => t.id === id ? { ...t, stato } : t));
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  return (
    <FlatList data={trasmissioni} keyExtractor={i => i.id} contentContainerStyle={s.content}
      ListEmptyComponent={<Text style={s.emptyText}>Nessuna trasmissione ricevuta</Text>}
      renderItem={({ item }) => (
        <View style={s.listCard}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="documents" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.listTitle}>{item.oggetto}</Text>
              <Text style={s.listSub2}>{item.user_nome}</Text>
              <Text style={s.listMeta}>{new Date(item.created_at).toLocaleDateString('it-IT')} • File: {item.files?.length || 0}</Text>
              {item.note ? <Text style={[s.listMeta, { marginTop: 2, fontStyle: 'italic' }]}>Note: {item.note}</Text> : null}
            </View>
            <StatusBadge status={item.stato} />
          </View>
          {item.stato === 'Inviato' && (
            <View style={s.actionRow}>
              <TouchableOpacity style={[s.miniBtn, { backgroundColor: '#DCFCE7' }]} onPress={() => updateTrasmStato(item.id, 'Ricevuto')}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                <Text style={[s.miniBtnText, { color: '#16A34A' }]}>Ricevuto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.miniBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => updateTrasmStato(item.id, 'Visionato')}>
                <Ionicons name="eye-outline" size={16} color="#4F46E5" />
                <Text style={[s.miniBtnText, { color: '#4F46E5' }]}>Visionato</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )} />
  );
}
