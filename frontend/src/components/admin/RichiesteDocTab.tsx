import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../SharedComponents';
import { s } from './styles';
import api from '../../services/api';

interface Props {
  token: string;
  richiesteDoc: any[];
  setRichiesteDoc: (fn: (p: any[]) => any[]) => void;
}

export default function RichiesteDocTab({ token, richiesteDoc, setRichiesteDoc }: Props) {
  return (
    <FlatList data={richiesteDoc} keyExtractor={i => i.id} contentContainerStyle={s.content}
      ListEmptyComponent={<Text style={s.emptyText}>Nessuna richiesta documenti ricevuta</Text>}
      renderItem={({ item }) => (
        <View style={s.listCard}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="document-text" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.listTitle}>{item.tipo_documento}</Text>
              <Text style={s.listSub2}>{item.user_nome}</Text>
              <Text style={s.listMeta}>{new Date(item.created_at).toLocaleDateString('it-IT')}</Text>
              {item.note ? <Text style={[s.listMeta, { marginTop: 2, fontStyle: 'italic' }]}>Note: {item.note}</Text> : null}
            </View>
            <StatusBadge status={item.stato} />
          </View>
          <View style={s.actionRow}>
            {['In lavorazione', 'Pronto', 'Consegnato'].map(stato => (
              item.stato !== stato ? (
                <TouchableOpacity key={stato} style={[s.miniBtn, { backgroundColor: stato === 'Consegnato' ? '#DCFCE7' : stato === 'Pronto' ? '#DBEAFE' : '#FEF3C7' }]}
                  onPress={async () => {
                    try {
                      await api.updateAdminRichiesta(token, item.id, { stato });
                      setRichiesteDoc(p => p.map(x => x.id === item.id ? { ...x, stato } : x));
                    } catch (e: any) { Alert.alert('Errore', e.message); }
                  }}>
                  <Text style={[s.miniBtnText, { color: stato === 'Consegnato' ? '#16A34A' : stato === 'Pronto' ? '#2563EB' : '#D97706' }]}>{stato}</Text>
                </TouchableOpacity>
              ) : null
            ))}
          </View>
        </View>
      )} />
  );
}
