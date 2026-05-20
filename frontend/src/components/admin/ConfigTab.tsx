import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerSelect, PrimaryButton, ConfigField } from '../SharedComponents';
import { s } from './styles';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Modal } from 'react-native';

interface Props {
  token: string;
  utenti: any[];
  condomini: any[];
}

export default function ConfigTab({ token, utenti, condomini }: Props) {
  const [config, setConfig] = useState({ google_maps_api_key: '', firebase_key: '', studio_telefono: '', studio_email: '', studio_pec: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const [showECModal, setShowECModal] = useState<any>(null);
  const [ecForm, setEcForm] = useState({ condominio_id: '', periodo: '', quote_versate: '', quote_da_versare: '', scadenza: '', saldo: '', note: '' });

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.getConfig(token);
      setConfig({ google_maps_api_key: cfg.google_maps_api_key || '', firebase_key: cfg.firebase_key || '', studio_telefono: cfg.studio_telefono || '', studio_email: cfg.studio_email || '', studio_pec: cfg.studio_pec || '' });
    } catch {}
  }, [token]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async () => {
    setConfigLoading(true);
    try { await api.updateConfig(token, config); Alert.alert('Salvato', 'Configurazione aggiornata'); }
    catch (e: any) { Alert.alert('Errore', e.message); }
    finally { setConfigLoading(false); }
  };

  const exportCSV = (type: string) => {
    const url = api.getExportUrl(type);
    Linking.openURL(url).catch(() => Alert.alert('Errore', 'Impossibile aprire il link'));
  };

  const saveEstrattoConto = async () => {
    if (!ecForm.condominio_id) { Alert.alert('Attenzione', 'Seleziona un condominio'); return; }
    try {
      await api.upsertEstrattoConto(token, { user_id: showECModal.id, condominio_id: ecForm.condominio_id, periodo: ecForm.periodo, quote_versate: parseFloat(ecForm.quote_versate) || 0, quote_da_versare: parseFloat(ecForm.quote_da_versare) || 0, scadenza: ecForm.scadenza, saldo: parseFloat(ecForm.saldo) || 0, note: ecForm.note });
      setShowECModal(null); Alert.alert('Salvato', 'Estratto conto aggiornato');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  return (
    <>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.secTitle}>Impostazioni</Text>
        <View style={s.configSection}>
          <View style={s.configSectionHeader}><Ionicons name="business-outline" size={20} color={Colors.navy} /><Text style={s.configSectionTitle}>Informazioni Studio</Text></View>
          <ConfigField testID="config-telefono" label="Telefono" value={config.studio_telefono} placeholder="+39 089 123456" onChange={(v: string) => setConfig(p => ({ ...p, studio_telefono: v }))} />
          <ConfigField testID="config-email" label="Email" value={config.studio_email} placeholder="info@studio.it" onChange={(v: string) => setConfig(p => ({ ...p, studio_email: v }))} keyboardType="email-address" />
          <ConfigField testID="config-pec" label="PEC" value={config.studio_pec} placeholder="studio@pec.it" onChange={(v: string) => setConfig(p => ({ ...p, studio_pec: v }))} keyboardType="email-address" />
        </View>
        <View style={s.configSection}>
          <View style={s.configSectionHeader}><Ionicons name="key-outline" size={20} color={Colors.navy} /><Text style={s.configSectionTitle}>Chiavi API</Text></View>
          <ConfigField testID="config-gmaps" label="Google Maps API Key" value={config.google_maps_api_key} placeholder="Inserisci la chiave API" onChange={(v: string) => setConfig(p => ({ ...p, google_maps_api_key: v }))} />
          <ConfigField testID="config-firebase" label="Firebase Key" value={config.firebase_key} placeholder="Inserisci la chiave Firebase" onChange={(v: string) => setConfig(p => ({ ...p, firebase_key: v }))} />
        </View>
        <PrimaryButton title="Salva Configurazione" onPress={saveConfig} loading={configLoading} testID="config-save-btn" style={{ marginBottom: 20 }} />
        <View style={s.configSection}>
          <View style={s.configSectionHeader}><Ionicons name="download-outline" size={20} color={Colors.navy} /><Text style={s.configSectionTitle}>Esporta Dati (CSV)</Text></View>
          {[{ type: 'segnalazioni', label: 'Esporta Segnalazioni', icon: 'warning-outline' }, { type: 'appuntamenti', label: 'Esporta Appuntamenti', icon: 'calendar-outline' }, { type: 'utenti', label: 'Esporta Utenti', icon: 'people-outline' }].map((exp) => (
            <TouchableOpacity key={exp.type} testID={`export-${exp.type}`} style={s.exportBtn} onPress={() => exportCSV(exp.type)}>
              <Ionicons name={exp.icon as any} size={18} color={Colors.sky} /><Text style={s.exportBtnText}>{exp.label}</Text><Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.configSection}>
          <View style={s.configSectionHeader}><Ionicons name="cash-outline" size={20} color={Colors.navy} /><Text style={s.configSectionTitle}>Gestione Estratti Conto</Text></View>
          <Text style={s.configHint}>Seleziona un utente per inserire o aggiornare l'estratto conto.</Text>
          {utenti.filter(u => u.abilitato).map(u => (
            <TouchableOpacity key={u.id} testID={`ec-user-${u.id}`} style={s.ecUserBtn} onPress={() => { setShowECModal(u); const cond = u.associazioni?.[0]; setEcForm({ condominio_id: cond?.condominio_id || '', periodo: '', quote_versate: '', quote_da_versare: '', scadenza: '', saldo: '', note: '' }); }}>
              <View style={[s.iconCircle, { backgroundColor: '#E0F2FE', marginRight: 10 }]}><Ionicons name="person" size={16} color={Colors.sky} /></View>
              <View style={{ flex: 1 }}><Text style={s.ecUserName}>{u.nome} {u.cognome}</Text><Text style={s.ecUserCond}>{u.condomini_nomi?.join(', ') || 'N/A'}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
          {utenti.filter(u => u.abilitato).length === 0 && <Text style={s.emptyText}>Nessun utente abilitato</Text>}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal: Estratto Conto */}
      <Modal visible={!!showECModal} transparent animationType="slide" onRequestClose={() => setShowECModal(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Estratto Conto</Text>
            <Text style={s.modalSub}>{showECModal?.nome} {showECModal?.cognome}</Text>
            {showECModal?.associazioni?.length > 0 && (
              <PickerSelect label="Condominio *" value={condomini.find(c => c.id === ecForm.condominio_id)?.nome || ''}
                options={showECModal.associazioni.map((a: any) => a.condominio_nome)}
                onSelect={v => { const a = showECModal.associazioni.find((aa: any) => aa.condominio_nome === v); if (a) setEcForm(p => ({ ...p, condominio_id: a.condominio_id })); }}
                testID="ec-cond-picker" />
            )}
            <ConfigField testID="ec-periodo" label="Periodo" value={ecForm.periodo} placeholder="Es: Gen - Giu 2026" onChange={(v: string) => setEcForm(p => ({ ...p, periodo: v }))} />
            <ConfigField testID="ec-versate" label="Quote Versate (€)" value={ecForm.quote_versate} placeholder="0.00" onChange={(v: string) => setEcForm(p => ({ ...p, quote_versate: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-da-versare" label="Quote da Versare (€)" value={ecForm.quote_da_versare} placeholder="0.00" onChange={(v: string) => setEcForm(p => ({ ...p, quote_da_versare: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-saldo" label="Saldo (€)" value={ecForm.saldo} placeholder="0.00" onChange={(v: string) => setEcForm(p => ({ ...p, saldo: v }))} keyboardType="decimal-pad" />
            <ConfigField testID="ec-scadenza" label="Scadenza" value={ecForm.scadenza} placeholder="Es: 30/06/2026" onChange={(v: string) => setEcForm(p => ({ ...p, scadenza: v }))} />
            <ConfigField testID="ec-note" label="Note" value={ecForm.note} placeholder="Note aggiuntive..." onChange={(v: string) => setEcForm(p => ({ ...p, note: v }))} multiline />
            <PrimaryButton title="Salva Estratto Conto" onPress={saveEstrattoConto} testID="ec-save-btn" />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowECModal(null)}><Text style={s.closeBtnText}>Annulla</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
