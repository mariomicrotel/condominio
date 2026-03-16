import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader } from '../src/components/SharedComponents';

type Consenso = {
  prestato: boolean;
  versione_informativa: string;
  prestato_il: string | null;
  revocato_il: string | null;
};

type Consensi = {
  privacy_policy: Consenso;
  marketing: Consenso;
  note_vocali: Consenso;
};

function PolicyTextModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [versioni, setVersioni] = useState<any[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (visible) {
      setLoading(true);
      Promise.all([
        api.getInformativaAttiva(),
        token ? api.getInformativaVersioni(token) : Promise.resolve([]),
      ])
        .then(([inf, vers]) => {
          setText(inf.testo_completo || '');
          setVersioni(Array.isArray(vers) ? vers : []);
        })
        .catch(() => setText('Impossibile caricare l\'informativa.'))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={pm.header}>
          <Text style={pm.headerTitle}>Informativa Privacy</Text>
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.navy} />
          </TouchableOpacity>
        </View>
        {loading
          ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.navy} />
            </View>
          : <ScrollView contentContainerStyle={{ padding: 20 }}>
              {versioni.length > 1 && (
                <View style={pm.versionBox}>
                  <Text style={pm.versionTitle}>Cronologia versioni</Text>
                  {versioni.map((v: any) => (
                    <View key={v.versione || v.id} style={pm.versionItem}>
                      <Text style={pm.versionLabel}>
                        v{v.versione} {v.attiva ? '(Attiva)' : ''}
                      </Text>
                      <Text style={pm.versionDate}>
                        {v.data_pubblicazione ? new Date(v.data_pubblicazione).toLocaleDateString('it-IT') : ''}
                      </Text>
                      {v.note_versione ? <Text style={pm.versionNote}>{v.note_versione}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
              <Text style={pm.policyText}>{text}</Text>
              <View style={{ height: 40 }} />
            </ScrollView>
        }
        <View style={pm.footer}>
          <TouchableOpacity style={pm.closeFullBtn} onPress={onClose}>
            <Text style={pm.closeFullText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [consensi, setConsensi] = useState<Consensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const loadConsensi = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getMieiConsensi(token);
      setConsensi(data);
    } catch {
      Alert.alert('Errore', 'Impossibile caricare i consensi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadConsensi(); }, [loadConsensi]);

  const handleToggle = async (tipo: string, currentValue: boolean) => {
    if (!token) return;
    if (tipo === 'privacy_policy') {
      Alert.alert('Informazione', 'Non è possibile revocare il consenso alla privacy policy tramite l\'app. Per maggiori informazioni contatta lo studio a privacy@tardugnobonifacio.it');
      return;
    }

    const action = currentValue ? 'revocare' : 'riattivare';
    const nomeConsenso = tipo === 'marketing'
      ? 'consenso alle comunicazioni informative'
      : 'consenso alle registrazioni vocali';

    Alert.alert(
      `${currentValue ? 'Revocare' : 'Riattivare'} consenso`,
      `Vuoi ${action} il ${nomeConsenso}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: currentValue ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(tipo);
            try {
              if (currentValue) {
                await api.revocaConsenso(token, tipo);
              } else {
                await api.riativaConsenso(token, tipo);
              }
              await loadConsensi();
            } catch (e: any) {
              Alert.alert('Errore', e.message || 'Impossibile aggiornare il consenso');
            } finally {
              setToggling(null);
            }
          }
        }
      ]
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const ConsensoCard = ({
    tipo, titolo, descrizione, readonly = false
  }: {
    tipo: keyof Consensi; titolo: string; descrizione: string; readonly?: boolean;
  }) => {
    const c = consensi?.[tipo];
    const isActive = c?.prestato ?? false;
    const isLoading = toggling === tipo;

    return (
      <View style={cs.card}>
        <View style={cs.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={cs.titleRow}>
              <Text style={cs.cardTitle}>{titolo}</Text>
              {readonly && (
                <View style={cs.requiredBadge}>
                  <Text style={cs.requiredText}>Obbligatorio</Text>
                </View>
              )}
            </View>
            <Text style={cs.cardDesc}>{descrizione}</Text>
          </View>
          {isLoading
            ? <ActivityIndicator size="small" color={Colors.navy} style={{ marginLeft: 10 }} />
            : <Switch
                value={isActive}
                onValueChange={() => handleToggle(tipo, isActive)}
                trackColor={{ false: '#E5E7EB', true: Colors.navy }}
                thumbColor={Colors.white}
                disabled={readonly}
              />
          }
        </View>
        <View style={cs.dateRow}>
          {isActive
            ? <Text style={cs.dateText}>
                <Ionicons name="checkmark-circle" size={13} color="#16A34A" /> Prestato il {formatDate(c?.prestato_il ?? null)}
              </Text>
            : c?.revocato_il
              ? <Text style={cs.dateTextRevoked}>
                  <Ionicons name="close-circle" size={13} color="#DC2626" /> Revocato il {formatDate(c.revocato_il)}
                </Text>
              : <Text style={cs.dateText}>Non prestato</Text>
          }
          <Text style={cs.versionText}>v{c?.versione_informativa || '1.0'}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ScreenHeader title="Privacy e Dati Personali" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Privacy e Dati Personali" />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Info Banner */}
        <View style={s.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#0369A1" />
          <Text style={s.infoText}>
            Gestisci i tuoi consensi e consulta l'informativa sul trattamento dei dati personali.
          </Text>
        </View>

        {/* Consensi Section */}
        <Text style={s.sectionTitle}>I miei consensi</Text>

        <ConsensoCard
          tipo="privacy_policy"
          titolo="Informativa Privacy"
          descrizione="Accettazione dell'informativa sul trattamento dei dati personali ai sensi del GDPR (art. 13). Necessaria per l'utilizzo dell'app."
          readonly
        />

        <ConsensoCard
          tipo="marketing"
          titolo="Comunicazioni informative"
          descrizione="Ricezione di aggiornamenti normativi e comunicazioni informative non operative via email. Facoltativo."
        />

        <ConsensoCard
          tipo="note_vocali"
          titolo="Registrazioni vocali"
          descrizione="Registrazione e conservazione di note audio nell'ambito delle segnalazioni e dei sopralluoghi. Facoltativo."
        />

        {/* Informativa Section */}
        <Text style={s.sectionTitle}>Informativa Privacy</Text>

        <TouchableOpacity style={s.actionCard} onPress={() => setShowPolicyModal(true)} activeOpacity={0.7}>
          <View style={s.actionIconWrap}>
            <Ionicons name="document-text-outline" size={22} color={Colors.sky} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Consulta l'informativa completa</Text>
            <Text style={s.actionSub}>Leggi il testo integrale e la cronologia delle versioni</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Esercita i tuoi diritti Section */}
        <Text style={s.sectionTitle}>Esercita i tuoi diritti (GDPR)</Text>

        <View style={s.rightsCard}>
          <Text style={s.rightsText}>
            Ai sensi degli artt. 15–22 del GDPR, hai il diritto di accedere, rettificare, cancellare, limitare il trattamento e portare i tuoi dati.
          </Text>
          <Text style={[s.rightsText, { marginTop: 8 }]}>
            Per esercitare questi diritti, contatta lo studio:
          </Text>
          <View style={s.contactItem}>
            <Ionicons name="mail-outline" size={16} color={Colors.sky} />
            <Text style={s.contactText}>privacy@tardugnobonifacio.it</Text>
          </View>
          <View style={s.contactItem}>
            <Ionicons name="location-outline" size={16} color={Colors.sky} />
            <Text style={s.contactText}>Via Raffaele Ricci 37, 84129 Salerno (SA)</Text>
          </View>
          <Text style={[s.rightsText, { marginTop: 12, fontSize: 12, color: Colors.textMuted }]}>
            Riceverai risposta entro 30 giorni dalla richiesta.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PolicyTextModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  infoBanner: {
    flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 10,
    padding: 12, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#0284C7',
    alignItems: 'flex-start',
  },
  infoText: { fontSize: 13, color: '#0369A1', marginLeft: 10, flex: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: 10, marginTop: 4 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12, padding: 16,
    marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.skyLight, justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain },
  actionSub: { fontSize: 13, color: Colors.textSec, marginTop: 2 },
  rightsCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  rightsText: { fontSize: 13, color: Colors.textSec, lineHeight: 19 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  contactText: { fontSize: 13, color: Colors.sky, marginLeft: 8, fontWeight: '500' },
});

const cs = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, flex: 1 },
  requiredBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  requiredText: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: Colors.textSec, lineHeight: 18 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  dateText: { fontSize: 12, color: '#16A34A' },
  dateTextRevoked: { fontSize: 12, color: '#DC2626' },
  versionText: { fontSize: 12, color: Colors.textMuted },
});

const pm = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  versionBox: {
    backgroundColor: '#F0F9FF', borderRadius: 10, padding: 14, marginBottom: 20,
    borderLeftWidth: 3, borderLeftColor: Colors.sky,
  },
  versionTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  versionItem: { marginBottom: 8 },
  versionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  versionDate: { fontSize: 12, color: Colors.textSec },
  versionNote: { fontSize: 12, color: Colors.textSec, fontStyle: 'italic', marginTop: 2 },
  policyText: { fontSize: 13, color: Colors.textMain, lineHeight: 21 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  closeFullBtn: { height: 52, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  closeFullText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
