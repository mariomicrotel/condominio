import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerSelect, PrimaryButton, ConfigField } from '../SharedComponents';
import { s } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';

const QUALITA_OPT = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];

interface Props {
  token: string;
  utenti: any[];
  condomini: any[];
  collaboratori: any[];
  onRefresh: () => void;
}

export default function UtentiTab({ token, utenti, condomini, collaboratori, onRefresh }: Props) {
  const [utentiFilterCondo, setUtentiFilterCondo] = useState('');
  const [showAssocModal, setShowAssocModal] = useState<any>(null);
  const [assocForm, setAssocForm] = useState({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });
  const [showNewCollaboratore, setShowNewCollaboratore] = useState(false);
  const [collabForm, setCollabForm] = useState({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' });

  const associaUtente = async () => {
    if (!assocForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    try {
      await api.associaUtente(token, { user_id: showAssocModal.id, ...assocForm });
      setShowAssocModal(null);
      setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' });
      onRefresh();
      Alert.alert('Associato', 'Utente associato al condominio');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const disassociaUtente = (assocId: string, userName: string, condName: string) => {
    Alert.alert('Rimuovi associazione', `Rimuovere ${userName} da "${condName}"?`, [
      { text: 'Annulla' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try { await api.disassociaUtente(token, assocId); onRefresh(); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  const createCollaboratoreHandler = async () => {
    if (!collabForm.nome.trim() || !collabForm.cognome.trim() || !collabForm.email.trim() || !collabForm.password.trim()) {
      Alert.alert('Attenzione', 'Compila nome, cognome, email e password'); return;
    }
    try {
      await api.createCollaboratore(token, collabForm);
      setShowNewCollaboratore(false);
      setCollabForm({ nome: '', cognome: '', email: '', password: '', telefono: '', qualifica: '', stato: 'Attivo' });
      onRefresh();
      Alert.alert('Creato', 'Collaboratore aggiunto');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const deleteCollaboratoreHandler = (id: string, nome: string) => {
    Alert.alert('Elimina', `Eliminare "${nome}"?`, [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try { await api.deleteCollaboratore(token, id); onRefresh(); }
        catch (e: any) { Alert.alert('Errore', e.message); }
      }},
    ]);
  };

  const filteredUtenti = utentiFilterCondo
    ? utenti.filter(u => u.associazioni?.some((a: any) => a.condominio_id === utentiFilterCondo))
    : utenti;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <PickerSelect label="" value={utentiFilterCondo ? condomini.find(c => c.id === utentiFilterCondo)?.nome || '' : 'Tutti i condomini'}
            options={['Tutti i condomini', ...condomini.map(c => c.nome)]}
            onSelect={v => { if (v === 'Tutti i condomini') setUtentiFilterCondo(''); else { const condo = condomini.find(c => c.nome === v); setUtentiFilterCondo(condo?.id || ''); } }}
            testID="utenti-filter-condo" />
        </View>
        <TouchableOpacity testID="admin-new-collab-btn-utenti" style={[s.addBtn, { backgroundColor: '#6366F1', paddingHorizontal: 14, marginTop: 0 }]} onPress={() => setShowNewCollaboratore(true)}>
          <Ionicons name="person-add" size={20} color={Colors.white} />
          <Text style={[s.addBtnText, { fontSize: 12 }]}>Collaboratore</Text>
        </TouchableOpacity>
      </View>

      {collaboratori.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Text style={s.secTitle}>Collaboratori Studio ({collaboratori.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            {collaboratori.map(c => (
              <View key={c.id} style={{ backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginRight: 10, minWidth: 150, borderWidth: 1, borderColor: Colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="person" size={18} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textMain }}>{c.nome} {c.cognome}</Text>
                    <Text style={{ fontSize: 11, color: Colors.textMuted }}>{c.qualifica || 'Collaboratore'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="search-outline" size={12} color={Colors.textMuted} />
                    <Text style={{ fontSize: 10, color: Colors.textMuted }}>{c.sopralluoghi_count || 0} sopralluoghi</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteCollaboratoreHandler(c.id, `${c.nome} ${c.cognome}`)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[s.secTitle, { marginLeft: 16, marginTop: 8 }]}>Utenti Condomini {utentiFilterCondo ? `(${condomini.find(c => c.id === utentiFilterCondo)?.nome})` : ''}</Text>
      <FlatList data={filteredUtenti} keyExtractor={i => i.id} contentContainerStyle={s.content}
        ListEmptyComponent={<Text style={s.emptyText}>{utentiFilterCondo ? 'Nessun utente in questo condominio' : 'Nessun utente registrato'}</Text>}
        renderItem={({ item }) => (
          <View testID={`admin-user-${item.id}`} style={s.listCard}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: item.abilitato ? '#DCFCE7' : '#FEF3C7' }]}>
                <Ionicons name="person" size={18} color={item.abilitato ? '#16A34A' : '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{item.nome} {item.cognome}</Text>
                <Text style={s.listSub2}>{item.email}</Text>
                {item.telefono ? <Text style={s.listMeta}>Tel: {item.telefono}</Text> : null}
              </View>
              <View style={[s.statusDot, { backgroundColor: item.abilitato ? '#10B981' : '#F59E0B' }]} />
            </View>
            {item.associazioni && item.associazioni.length > 0 && (
              <View style={s.assocSection}>
                <Text style={s.assocTitle}>Condomini associati:</Text>
                {item.associazioni.map((a: any) => (
                  <View key={a.assoc_id} style={s.assocRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.assocName}>{a.condominio_nome}</Text>
                      <Text style={s.assocInfo}>{a.unita_immobiliare} {a.qualita ? `• ${a.qualita}` : ''}</Text>
                    </View>
                    <TouchableOpacity testID={`disassocia-${a.assoc_id}`} onPress={() => disassociaUtente(a.assoc_id, `${item.nome} ${item.cognome}`, a.condominio_nome)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {!item.abilitato && <View style={s.notAbilitato}><Ionicons name="time-outline" size={14} color="#D97706" /><Text style={s.notAbilitatoText}>In attesa di abilitazione</Text></View>}
            <TouchableOpacity testID={`associa-btn-${item.id}`} style={s.assocBtn} onPress={() => { setShowAssocModal(item); setAssocForm({ condominio_id: '', unita_immobiliare: '', qualita: 'Proprietario' }); }}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.sky} />
              <Text style={s.assocBtnText}>Associa a condominio</Text>
            </TouchableOpacity>
          </View>
        )} />

      {/* Modal: Associa Utente */}
      <Modal visible={!!showAssocModal} transparent animationType="slide" onRequestClose={() => setShowAssocModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Associa a Condominio</Text>
            <Text style={s.modalSub}>{showAssocModal?.nome} {showAssocModal?.cognome} ({showAssocModal?.email})</Text>
            <PickerSelect label="Condominio *" value={condomini.find(c => c.id === assocForm.condominio_id)?.nome || ''}
              options={condomini.map(c => c.nome)}
              onSelect={v => { const c = condomini.find(c2 => c2.nome === v); if (c) setAssocForm(p => ({ ...p, condominio_id: c.id })); }}
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

      {/* Modal: Nuovo Collaboratore */}
      <Modal visible={showNewCollaboratore} transparent animationType="slide" onRequestClose={() => setShowNewCollaboratore(false)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Nuovo Collaboratore</Text>
            <ConfigField testID="collab-nome" label="Nome *" value={collabForm.nome} placeholder="Mario" onChange={(v: string) => setCollabForm(p => ({ ...p, nome: v }))} />
            <ConfigField testID="collab-cognome" label="Cognome *" value={collabForm.cognome} placeholder="Rossi" onChange={(v: string) => setCollabForm(p => ({ ...p, cognome: v }))} />
            <ConfigField testID="collab-email" label="Email *" value={collabForm.email} placeholder="mario@studio.it" onChange={(v: string) => setCollabForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <ConfigField testID="collab-password" label="Password *" value={collabForm.password} placeholder="••••••••" onChange={(v: string) => setCollabForm(p => ({ ...p, password: v }))} />
            <ConfigField testID="collab-telefono" label="Telefono" value={collabForm.telefono} placeholder="+39 333 1234567" onChange={(v: string) => setCollabForm(p => ({ ...p, telefono: v }))} />
            <ConfigField testID="collab-qualifica" label="Qualifica" value={collabForm.qualifica} placeholder="Geometra, Tecnico, etc." onChange={(v: string) => setCollabForm(p => ({ ...p, qualifica: v }))} />
            <PrimaryButton title="Crea Collaboratore" onPress={createCollaboratoreHandler} testID="collab-create-btn" style={{ backgroundColor: '#6366F1' }} />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowNewCollaboratore(false)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
