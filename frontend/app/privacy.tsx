import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Switch, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader } from '../src/components/SharedComponents';

// ─── Types ───────────────────────────────────────────────────────────────────

type Consenso = { prestato: boolean; versione_informativa: string; prestato_il: string | null; revocato_il: string | null };
type Consensi = { privacy_policy: Consenso; marketing: Consenso; note_vocali: Consenso };
type MieiDati = { profilo: any; condomini_associati: any[]; consensi: any[]; segnalazioni: any[]; richieste_documenti: any[]; trasmissioni: any[]; appuntamenti: any[] };
type RichiestaPrivacy = { id: string; protocollo: string; tipo: string; stato: string; created_at: string; scadenza: string; motivazione_rifiuto?: string; note_admin?: string };

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const TIPO_LABELS: Record<string, string> = {
  privacy_policy: 'Informativa Privacy',
  marketing: 'Comunicazioni informative',
  note_vocali: 'Registrazioni vocali',
};

const RICHIESTA_LABELS: Record<string, string> = {
  cancellazione: 'Cancellazione account',
  limitazione: 'Limitazione trattamento',
  accesso: 'Accesso ai dati',
  portabilita: 'Portabilità dati',
  opposizione: 'Opposizione',
};

const STATO_COLORS: Record<string, { bg: string; text: string }> = {
  ricevuta: { bg: '#DBEAFE', text: '#1D4ED8' },
  in_lavorazione: { bg: '#FEF9C3', text: '#A16207' },
  evasa: { bg: '#DCFCE7', text: '#15803D' },
  rifiutata: { bg: '#FEE2E2', text: '#DC2626' },
};

// ─── Collapsible Section Card ─────────────────────────────────────────────────

function SectionCard({ icon, title, iconBg, children, defaultOpen = false }: {
  icon: string; title: string; iconBg: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={sec.card}>
      <TouchableOpacity style={sec.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={[sec.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={20} color={Colors.navy} />
        </View>
        <Text style={sec.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
      </TouchableOpacity>
      {open && <View style={sec.body}>{children}</View>}
    </View>
  );
}

// ─── Policy Text Modal ───────────────────────────────────────────────────────

function PolicyTextModal({ visible, versione, onClose }: { visible: boolean; versione?: any; onClose: () => void }) {
  const [text, setText] = useState('');
  const [versioni, setVersioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersione, setSelectedVersione] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    if (versione) {
      setText(versione.testo_completo || '');
      setLoading(false);
    } else {
      Promise.all([
        api.getInformativaAttiva(),
        token ? api.getInformativaVersioni(token) : Promise.resolve([]),
      ]).then(([inf, vers]) => {
        setText(inf.testo_completo || '');
        setVersioni(Array.isArray(vers) ? vers : []);
      }).catch(() => setText('Impossibile caricare l\'informativa.')).finally(() => setLoading(false));
    }
  }, [visible, versione]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={pm.header}>
          <Text style={pm.headerTitle}>{versione ? `Informativa v${versione.versione}` : 'Informativa Privacy'}</Text>
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.navy} />
          </TouchableOpacity>
        </View>
        {loading
          ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.navy} />
            </View>
          : <ScrollView contentContainerStyle={{ padding: 20 }}>
              {versioni.length > 1 && !versione && (
                <View style={pm.vBox}>
                  <Text style={pm.vTitle}>Cronologia versioni</Text>
                  {versioni.map((v: any) => (
                    <View key={v.versione} style={pm.vItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={pm.vLabel}>v{v.versione} {v.attiva ? '(Attiva)' : ''}</Text>
                        <Text style={pm.vDate}>{fmtDate(v.data_pubblicazione)}</Text>
                        {v.note_versione ? <Text style={pm.vNote}>{v.note_versione}</Text> : null}
                      </View>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Data states
  const [mieiDati, setMieiDati] = useState<MieiDati | null>(null);
  const [consensi, setConsensi] = useState<Consensi | null>(null);
  const [richieste, setRichieste] = useState<RichiestaPrivacy[]>([]);
  const [versioni, setVersioni] = useState<any[]>([]);

  // UI states
  const [loadingDati, setLoadingDati] = useState(false);
  const [loadingConsensi, setLoadingConsensi] = useState(true);
  const [loadingRichieste, setLoadingRichieste] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState<string | null>(null);

  // Modal states
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedVersione, setSelectedVersione] = useState<any>(null);

  // ── Load data ──

  const loadConsensi = useCallback(async () => {
    if (!token) return;
    setLoadingConsensi(true);
    try {
      const data = await api.getMieiConsensi(token);
      setConsensi(data);
    } catch { /* silent */ }
    finally { setLoadingConsensi(false); }
  }, [token]);

  const loadMieiDati = useCallback(async () => {
    if (!token) return;
    setLoadingDati(true);
    try {
      const data = await api.getMieiDatiPrivacy(token);
      setMieiDati(data);
    } catch (e: any) { Alert.alert('Errore', e.message || 'Impossibile caricare i dati'); }
    finally { setLoadingDati(false); }
  }, [token]);

  const loadRichieste = useCallback(async () => {
    if (!token) return;
    setLoadingRichieste(true);
    try {
      const data = await api.getMieRichiestePrivacy(token);
      setRichieste(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoadingRichieste(false); }
  }, [token]);

  const loadVersioni = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getInformativaVersioni(token);
      setVersioni(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    loadConsensi();
    loadMieiDati();
    loadRichieste();
    loadVersioni();
  }, []);

  // ── Consent toggle ──

  const handleConsensoToggle = (tipo: string, currentValue: boolean) => {
    if (tipo === 'privacy_policy') {
      Alert.alert('Informazione', 'Non è possibile revocare il consenso alla privacy policy tramite l\'app. Per maggiori informazioni contatta lo studio a privacy@tardugnobonifacio.it');
      return;
    }
    const nomeConsenso = TIPO_LABELS[tipo] || tipo;
    Alert.alert(
      currentValue ? 'Revocare consenso' : 'Riattivare consenso',
      currentValue
        ? `Vuoi revocare il consenso per "${nomeConsenso}"? La funzionalità collegata verrà disattivata.`
        : `Vuoi riattivare il consenso per "${nomeConsenso}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: currentValue ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(tipo);
            try {
              if (currentValue) {
                await api.revocaConsenso(token!, tipo);
              } else {
                await api.riativaConsenso(token!, tipo);
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

  // ── Export data ──

  const handleExport = async () => {
    if (!token) return;
    Alert.alert(
      'Scarica i miei dati',
      'Verrà generato un file JSON con tutti i tuoi dati personali (esclusi allegati binari).',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Scarica',
          onPress: async () => {
            setExporting(true);
            try {
              const jsonText = await api.exportMieiDati(token);
              const filename = `miei_dati_${new Date().toISOString().slice(0, 10)}.json`;
              const fileUri = `${FileSystem.documentDirectory}${filename}`;
              await FileSystem.writeAsStringAsync(fileUri, jsonText, { encoding: FileSystem.EncodingType.UTF8 });
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Salva o condividi i tuoi dati' });
              } else {
                Alert.alert('Download completato', `File salvato in: ${fileUri}`);
              }
            } catch (e: any) {
              Alert.alert('Errore', e.message || 'Impossibile esportare i dati');
            } finally {
              setExporting(false);
            }
          }
        }
      ]
    );
  };

  // ── Privacy request ──

  const handleRichiesta = (tipo: string, titolo: string, descrizione: string) => {
    Alert.alert(
      titolo,
      descrizione,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma richiesta',
          style: tipo === 'cancellazione' ? 'destructive' : 'default',
          onPress: async () => {
            setCreatingRequest(tipo);
            try {
              const result = await api.creaRichiestaPrivacy(token!, tipo);
              Alert.alert(
                '✅ Richiesta inviata',
                `La tua richiesta è stata registrata.\n\nProtocollo: ${result.protocollo}\nScadenza: ${fmtDate(result.scadenza)}\n\nRiceverai risposta entro 30 giorni.`
              );
              await loadRichieste();
            } catch (e: any) {
              Alert.alert('Errore', e.message || 'Impossibile inviare la richiesta');
            } finally {
              setCreatingRequest(null);
            }
          }
        }
      ]
    );
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const ConsensoCard = ({ tipo }: { tipo: keyof Consensi }) => {
    const c = consensi?.[tipo];
    const isActive = c?.prestato ?? false;
    const isLoading = toggling === tipo;
    const isReadonly = tipo === 'privacy_policy';

    return (
      <View style={cs.card}>
        <View style={cs.cardRow}>
          <View style={[cs.dot, { backgroundColor: isActive ? '#16A34A' : '#94A3B8' }]} />
          <View style={{ flex: 1 }}>
            <Text style={cs.cardTitle}>{TIPO_LABELS[tipo]}</Text>
            {isReadonly && (
              <View style={cs.readonlyBadge}>
                <Text style={cs.readonlyText}>Obbligatorio</Text>
              </View>
            )}
            <Text style={cs.cardDate}>
              {isActive
                ? `Attivo dal ${fmtDate(c?.prestato_il ?? null)}`
                : c?.revocato_il
                  ? `Revocato il ${fmtDate(c.revocato_il)}`
                  : 'Non prestato'
              }
              {c?.versione_informativa ? ` · v${c.versione_informativa}` : ''}
            </Text>
          </View>
          {isLoading
            ? <ActivityIndicator size="small" color={Colors.navy} style={{ marginLeft: 8 }} />
            : <Switch
                value={isActive}
                onValueChange={() => handleConsensoToggle(tipo, isActive)}
                trackColor={{ false: '#E5E7EB', true: Colors.navy }}
                thumbColor={Colors.white}
                disabled={isReadonly}
              />
          }
        </View>
      </View>
    );
  };

  const RichiestaCard = ({ r }: { r: RichiestaPrivacy }) => {
    const stato = STATO_COLORS[r.stato] || { bg: '#F3F4F6', text: '#374151' };
    const isPending = r.stato === 'ricevuta' || r.stato === 'in_lavorazione';

    let scadGiorni: number | null = null;
    try {
      const d = new Date(r.scadenza);
      scadGiorni = Math.ceil((d.getTime() - Date.now()) / 86400000);
    } catch { /* */ }

    return (
      <View style={rcs.card}>
        <View style={rcs.row}>
          <View style={{ flex: 1 }}>
            <Text style={rcs.tipo}>{RICHIESTA_LABELS[r.tipo] || r.tipo}</Text>
            <Text style={rcs.proto}>{r.protocollo}</Text>
            <Text style={rcs.date}>Inviata il {fmtDate(r.created_at)}</Text>
          </View>
          <View style={[rcs.badge, { backgroundColor: stato.bg }]}>
            <Text style={[rcs.badgeText, { color: stato.text }]}>{r.stato}</Text>
          </View>
        </View>
        {isPending && scadGiorni !== null && (
          <View style={[rcs.scadRow, scadGiorni <= 5 && rcs.scadRowRed]}>
            <Ionicons name="time-outline" size={14} color={scadGiorni <= 5 ? '#DC2626' : Colors.textSec} />
            <Text style={[rcs.scadText, scadGiorni <= 5 && rcs.scadTextRed]}>
              Scadenza: {fmtDate(r.scadenza)} {scadGiorni <= 5 ? `(${scadGiorni}g)` : ''}
            </Text>
          </View>
        )}
        {r.motivazione_rifiuto && (
          <Text style={rcs.rifiuto}>Motivazione: {r.motivazione_rifiuto}</Text>
        )}
      </View>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Privacy e Dati Personali" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* INFO BANNER */}
        <View style={s.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#0369A1" />
          <Text style={s.infoText}>
            Gestisci i tuoi consensi, consulta i dati trattati ed esercita i diritti GDPR (artt. 15–22).
          </Text>
        </View>

        {/* ── SEZIONE 1: I MIEI DATI ── */}
        <SectionCard icon="person-outline" title="I miei dati" iconBg="#E0F2FE" defaultOpen>
          {loadingDati
            ? <ActivityIndicator size="small" color={Colors.navy} style={{ margin: 16 }} />
            : mieiDati
              ? <>
                  {/* Dati personali */}
                  <View style={d.groupHeader}>
                    <Ionicons name="person-circle-outline" size={16} color={Colors.navy} />
                    <Text style={d.groupTitle}>Dati personali</Text>
                  </View>
                  {[
                    { label: 'Nome', val: `${mieiDati.profilo.nome} ${mieiDati.profilo.cognome}`.trim() },
                    { label: 'Email', val: mieiDati.profilo.email },
                    { label: 'Telefono', val: mieiDati.profilo.telefono || '—' },
                    { label: 'Indirizzo', val: mieiDati.profilo.indirizzo || '—' },
                    { label: 'Codice fiscale', val: mieiDati.profilo.codice_fiscale || '—' },
                    { label: 'Registrato il', val: fmtDate(mieiDati.profilo.data_registrazione) },
                  ].map(({ label, val }) => (
                    <View key={label} style={d.row}>
                      <Text style={d.label}>{label}</Text>
                      <Text style={d.val}>{val}</Text>
                    </View>
                  ))}

                  <TouchableOpacity style={d.editBtn} onPress={() => router.push('/profilo')} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={16} color={Colors.sky} />
                    <Text style={d.editBtnText}>Modifica i miei dati</Text>
                  </TouchableOpacity>

                  {/* Condomini */}
                  {mieiDati.condomini_associati.length > 0 && <>
                    <View style={[d.groupHeader, { marginTop: 16 }]}>
                      <Ionicons name="business-outline" size={16} color={Colors.navy} />
                      <Text style={d.groupTitle}>Condomini associati</Text>
                    </View>
                    {mieiDati.condomini_associati.map((c: any, i: number) => (
                      <View key={i} style={d.condCard}>
                        <Text style={d.condNome}>{c.nome_condominio}</Text>
                        <Text style={d.condInfo}>{c.indirizzo} · {c.unita_immobiliare} · {c.qualita}</Text>
                      </View>
                    ))}
                  </>}

                  {/* Riepilogo attività */}
                  <View style={[d.groupHeader, { marginTop: 16 }]}>
                    <Ionicons name="bar-chart-outline" size={16} color={Colors.navy} />
                    <Text style={d.groupTitle}>Riepilogo attività</Text>
                  </View>
                  <View style={d.statsGrid}>
                    {[
                      { label: 'Segnalazioni', count: mieiDati.segnalazioni.length, icon: 'warning-outline', color: '#DC2626' },
                      { label: 'Richieste doc.', count: mieiDati.richieste_documenti.length, icon: 'document-outline', color: '#2563EB' },
                      { label: 'Trasmissioni', count: mieiDati.trasmissioni.length, icon: 'cloud-upload-outline', color: '#7C3AED' },
                      { label: 'Appuntamenti', count: mieiDati.appuntamenti.length, icon: 'calendar-outline', color: '#D97706' },
                    ].map(({ label, count, icon, color }) => (
                      <View key={label} style={d.statCard}>
                        <Ionicons name={icon as any} size={20} color={color} />
                        <Text style={d.statCount}>{count}</Text>
                        <Text style={d.statLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              : <Text style={d.emptyText}>Impossibile caricare i dati</Text>
          }
        </SectionCard>

        {/* ── SEZIONE 2: I MIEI CONSENSI ── */}
        <SectionCard icon="checkmark-circle-outline" title="I miei consensi" iconBg="#DCFCE7" defaultOpen>
          {loadingConsensi
            ? <ActivityIndicator size="small" color={Colors.navy} style={{ margin: 16 }} />
            : consensi
              ? <>
                  <ConsensoCard tipo="privacy_policy" />
                  <ConsensoCard tipo="marketing" />
                  <ConsensoCard tipo="note_vocali" />
                  <Text style={cs.helpText}>
                    I consensi facoltativi (comunicazioni e note vocali) possono essere modificati in qualsiasi momento senza conseguenze sui servizi essenziali.
                  </Text>
                </>
              : <Text style={cs.helpText}>Impossibile caricare i consensi</Text>
          }
        </SectionCard>

        {/* ── SEZIONE 3: DIRITTI GDPR ── */}
        <SectionCard icon="scale-outline" title="Esercita i tuoi diritti" iconBg="#FEF3C7">
          {/* Download dati */}
          <TouchableOpacity style={dr.actionCard} onPress={handleExport} activeOpacity={0.7} disabled={exporting}>
            <View style={[dr.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              {exporting
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <Ionicons name="download-outline" size={22} color="#2563EB" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dr.actionTitle}>Scarica i miei dati</Text>
              <Text style={dr.actionDesc}>Copia di tutti i dati personali in formato JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Richiesta cancellazione */}
          <TouchableOpacity
            style={[dr.actionCard, dr.dangerCard]}
            onPress={() => handleRichiesta(
              'cancellazione',
              'Richiedi cancellazione account',
              'La cancellazione comporterà l\'eliminazione dei tuoi dati personali. Alcuni dati potrebbero essere conservati per obblighi di legge (dati fiscali: 10 anni, documenti condominiali: 10 anni).\n\nLa richiesta sarà evasa entro 30 giorni.'
            )}
            activeOpacity={0.7}
            disabled={!!creatingRequest}
          >
            <View style={[dr.actionIcon, { backgroundColor: '#FEE2E2' }]}>
              {creatingRequest === 'cancellazione'
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <Ionicons name="trash-outline" size={22} color="#DC2626" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[dr.actionTitle, { color: '#DC2626' }]}>Richiedi cancellazione account</Text>
              <Text style={dr.actionDesc}>Anonimizzazione dei dati personali entro 30 giorni</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Limitazione */}
          <TouchableOpacity
            style={dr.actionCard}
            onPress={() => handleRichiesta(
              'limitazione',
              'Richiedi limitazione del trattamento',
              'La limitazione del trattamento impedirà l\'elaborazione dei tuoi dati per scopi non essenziali, mantenendo solo i trattamenti strettamente necessari.\n\nLa richiesta sarà evasa entro 30 giorni.'
            )}
            activeOpacity={0.7}
            disabled={!!creatingRequest}
          >
            <View style={[dr.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              {creatingRequest === 'limitazione'
                ? <ActivityIndicator size="small" color="#D97706" />
                : <Ionicons name="pause-circle-outline" size={22} color="#D97706" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dr.actionTitle}>Richiedi limitazione del trattamento</Text>
              <Text style={dr.actionDesc}>Limitazione trattamento dati non essenziali (art. 18)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Mie richieste */}
          <View style={dr.listHeader}>
            <Text style={dr.listTitle}>Le mie richieste privacy</Text>
            <TouchableOpacity onPress={loadRichieste}>
              <Ionicons name="refresh" size={18} color={Colors.sky} />
            </TouchableOpacity>
          </View>

          {loadingRichieste
            ? <ActivityIndicator size="small" color={Colors.navy} style={{ margin: 8 }} />
            : richieste.length === 0
              ? <Text style={dr.emptyText}>Nessuna richiesta inviata</Text>
              : richieste.map(r => <RichiestaCard key={r.id} r={r} />)
          }

          <View style={dr.contactBox}>
            <Text style={dr.contactTitle}>Contatto referente privacy</Text>
            <Text style={dr.contactText}>privacy@tardugnobonifacio.it</Text>
            <Text style={dr.contactText}>Via Raffaele Ricci 37, 84129 Salerno (SA)</Text>
            <Text style={dr.contactNote}>Riscontro entro 30 giorni dalla richiesta</Text>
          </View>
        </SectionCard>

        {/* ── SEZIONE 4: INFORMATIVA PRIVACY ── */}
        <SectionCard icon="document-text-outline" title="Informativa Privacy" iconBg="#F3E8FF">
          <TouchableOpacity style={inf.linkCard} onPress={() => { setSelectedVersione(null); setShowPolicyModal(true); }} activeOpacity={0.7}>
            <Ionicons name="open-outline" size={20} color={Colors.sky} />
            <Text style={inf.linkText}>Leggi l'informativa completa</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {versioni.length > 0 && <>
            <Text style={inf.versioniTitle}>Storico versioni</Text>
            {versioni.map((v: any) => (
              <TouchableOpacity
                key={v.versione}
                style={inf.versionCard}
                onPress={() => { setSelectedVersione(v); setShowPolicyModal(true); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={inf.versionRow}>
                    <Text style={inf.versionLabel}>Versione {v.versione}</Text>
                    {v.attiva && <View style={inf.activeBadge}><Text style={inf.activeBadgeText}>Attiva</Text></View>}
                  </View>
                  <Text style={inf.versionDate}>{fmtDate(v.data_pubblicazione)}</Text>
                  {v.note_versione && <Text style={inf.versionNote}>{v.note_versione}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>}

          <View style={inf.grantBox}>
            <Text style={inf.grantTitle}>Autorità di controllo</Text>
            <Text style={inf.grantText}>Garante per la Protezione dei Dati Personali</Text>
            <Text style={inf.grantText}>www.garanteprivacy.it — garante@gpdp.it</Text>
          </View>
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PolicyTextModal
        visible={showPolicyModal}
        versione={selectedVersione}
        onClose={() => { setShowPolicyModal(false); setSelectedVersione(null); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  infoBanner: {
    flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0284C7', alignItems: 'flex-start',
  },
  infoText: { fontSize: 13, color: '#0369A1', marginLeft: 10, flex: 1, lineHeight: 18 },
});

const sec = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.navy, flex: 1 },
  body: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Colors.border },
});

const d = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 13, color: Colors.textSec, width: 120 },
  val: { fontSize: 13, color: Colors.textMain, flex: 1, fontWeight: '500' },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8 },
  editBtnText: { fontSize: 14, color: Colors.sky, fontWeight: '600', marginLeft: 6 },
  condCard: { backgroundColor: Colors.bg, borderRadius: 8, padding: 10, marginBottom: 6 },
  condNome: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  condInfo: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.bg, borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  statCount: { fontSize: 22, fontWeight: '700', color: Colors.navy, marginTop: 4 },
  statLabel: { fontSize: 11, color: Colors.textSec, marginTop: 2, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSec, padding: 12 },
});

const cs = StyleSheet.create({
  card: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 2, flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  readonlyBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  readonlyText: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  cardDate: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  helpText: { fontSize: 12, color: Colors.textSec, lineHeight: 17, marginTop: 12, fontStyle: 'italic' },
});

const dr = StyleSheet.create({
  actionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  dangerCard: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  actionDesc: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  emptyText: { fontSize: 13, color: Colors.textSec, fontStyle: 'italic', marginBottom: 12 },
  contactBox: {
    backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginTop: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.sky,
  },
  contactTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  contactText: { fontSize: 13, color: Colors.sky, fontWeight: '500' },
  contactNote: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});

const rcs = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  tipo: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  proto: { fontSize: 12, color: Colors.sky, fontWeight: '500', marginTop: 1 },
  date: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  scadRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scadRowRed: {},
  scadText: { fontSize: 12, color: Colors.textSec, marginLeft: 4 },
  scadTextRed: { color: '#DC2626', fontWeight: '600' },
  rifiuto: { fontSize: 12, color: '#DC2626', marginTop: 6, fontStyle: 'italic' },
});

const inf = StyleSheet.create({
  linkCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  linkText: { fontSize: 14, fontWeight: '600', color: Colors.sky, flex: 1, marginLeft: 10 },
  versioniTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  versionCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  versionRow: { flexDirection: 'row', alignItems: 'center' },
  versionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMain },
  activeBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 8 },
  activeBadgeText: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  versionDate: { fontSize: 12, color: Colors.textSec, marginTop: 2 },
  versionNote: { fontSize: 12, color: Colors.textSec, fontStyle: 'italic', marginTop: 1 },
  grantBox: { backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginTop: 14 },
  grantTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  grantText: { fontSize: 12, color: Colors.textSec },
});

const pm = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.navy },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  vBox: { backgroundColor: '#F0F9FF', borderRadius: 10, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: Colors.sky },
  vTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  vItem: { flexDirection: 'row', marginBottom: 8 },
  vLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  vDate: { fontSize: 12, color: Colors.textSec },
  vNote: { fontSize: 12, color: Colors.textSec, fontStyle: 'italic' },
  policyText: { fontSize: 13, color: Colors.textMain, lineHeight: 21 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  closeFullBtn: { height: 52, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  closeFullText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
