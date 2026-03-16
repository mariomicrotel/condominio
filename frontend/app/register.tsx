import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';

function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [policyText, setPolicyText] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && !policyText) {
      setLoading(true);
      api.getInformativaAttiva()
        .then(inf => setPolicyText(inf.testo_completo || ''))
        .catch(() => setPolicyText('Impossibile caricare il testo dell\'informativa. Visita www.tardugnobonifacio.it per consultarla.'))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        {/* Header */}
        <View style={pm.header}>
          <Text style={pm.headerTitle}>Informativa Privacy</Text>
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.navy} />
          </TouchableOpacity>
        </View>
        {loading
          ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.navy} />
              <Text style={{ marginTop: 12, color: Colors.textSec }}>Caricamento...</Text>
            </View>
          : <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={pm.policyText}>{policyText}</Text>
              <View style={{ height: 32 }} />
            </ScrollView>
        }
        <View style={pm.footer}>
          <TouchableOpacity style={pm.closeFullBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={pm.closeFullText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', password: '',
    telefono: '', indirizzo: '', codice_fiscale: '',
  });
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [consensoMarketing, setConsensoMarketing] = useState(false);
  const [consensoNoteVocali, setConsensoNoteVocali] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleRegister = async () => {
    if (!form.nome.trim() || !form.cognome.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Attenzione', 'La password deve avere almeno 6 caratteri');
      return;
    }
    if (!consensoPrivacy) {
      Alert.alert('Attenzione', 'Devi accettare l\'informativa sulla privacy per registrarti');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      // Save consents immediately after registration
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        try {
          await api.salvaConsensiRegistrazione(storedToken, {
            consenso_privacy: consensoPrivacy,
            consenso_marketing: consensoMarketing,
            consenso_note_vocali: consensoNoteVocali,
          });
        } catch {
          // Non-critical: silently ignore consent saving errors
        }
      }
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const CheckboxRow = ({
    checked, onPress, label, required = false, onLinkPress, linkLabel
  }: {
    checked: boolean; onPress: () => void; label: string;
    required?: boolean; onLinkPress?: () => void; linkLabel?: string;
  }) => (
    <TouchableOpacity style={s.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.checkbox, checked && s.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={13} color={Colors.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.checkLabel}>
          {label}
          {required && <Text style={{ color: '#DC2626' }}> *</Text>}
        </Text>
        {onLinkPress && linkLabel && (
          <TouchableOpacity onPress={onLinkPress}>
            <Text style={s.checkLink}>{linkLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.navy} />
          </TouchableOpacity>

          <Text style={s.title}>Registrazione</Text>
          <Text style={s.subtitle}>Crea il tuo account. Lo studio ti abiliterà associandoti al tuo condominio.</Text>

          {/* Info box */}
          <View style={s.infoBox}>
            <Ionicons name="information-circle" size={20} color="#0369A1" />
            <Text style={s.infoText}>Dopo la registrazione, lo studio verificherà i tuoi dati e ti assocerà al condominio di appartenenza.</Text>
          </View>

          <View style={s.form}>
            <View style={s.row}>
              <View style={[s.inputWrap, { flex: 1, marginRight: 8 }]}>
                <TextInput testID="register-nome-input" style={s.input} placeholder="Nome *" placeholderTextColor={Colors.textMuted} value={form.nome} onChangeText={v => update('nome', v)} />
              </View>
              <View style={[s.inputWrap, { flex: 1, marginLeft: 8 }]}>
                <TextInput testID="register-cognome-input" style={s.input} placeholder="Cognome *" placeholderTextColor={Colors.textMuted} value={form.cognome} onChangeText={v => update('cognome', v)} />
              </View>
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={s.icon} />
              <TextInput testID="register-email-input" style={s.input} placeholder="Email *" placeholderTextColor={Colors.textMuted} value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={s.icon} />
              <TextInput testID="register-password-input" style={s.input} placeholder="Password * (min. 6 caratteri)" placeholderTextColor={Colors.textMuted} value={form.password} onChangeText={v => update('password', v)} secureTextEntry />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={s.icon} />
              <TextInput testID="register-telefono-input" style={s.input} placeholder="Telefono" placeholderTextColor={Colors.textMuted} value={form.telefono} onChangeText={v => update('telefono', v)} keyboardType="phone-pad" />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={20} color={Colors.textMuted} style={s.icon} />
              <TextInput testID="register-indirizzo-input" style={s.input} placeholder="Indirizzo" placeholderTextColor={Colors.textMuted} value={form.indirizzo} onChangeText={v => update('indirizzo', v)} />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="card-outline" size={20} color={Colors.textMuted} style={s.icon} />
              <TextInput testID="register-cf-input" style={s.input} placeholder="Codice Fiscale" placeholderTextColor={Colors.textMuted} value={form.codice_fiscale} onChangeText={v => update('codice_fiscale', v)} autoCapitalize="characters" />
            </View>

            {/* Consent Section */}
            <View style={s.consentSection}>
              <Text style={s.consentTitle}>Consensi e Privacy</Text>

              <CheckboxRow
                checked={consensoPrivacy}
                onPress={() => setConsensoPrivacy(!consensoPrivacy)}
                label="Accetto l'informativa sul trattamento dei dati personali"
                required
                onLinkPress={() => setShowPrivacyModal(true)}
                linkLabel="Leggi l'informativa completa"
              />

              <View style={s.separator} />

              <CheckboxRow
                checked={consensoMarketing}
                onPress={() => setConsensoMarketing(!consensoMarketing)}
                label="Acconsento alla ricezione di comunicazioni informative e aggiornamenti normativi via email (facoltativo)"
              />

              <View style={s.separator} />

              <CheckboxRow
                checked={consensoNoteVocali}
                onPress={() => setConsensoNoteVocali(!consensoNoteVocali)}
                label="Acconsento alla registrazione e conservazione di note vocali nell'ambito delle segnalazioni e sopralluoghi (facoltativo)"
              />
            </View>

            <TouchableOpacity testID="register-submit-btn" style={[s.submitBtn, !consensoPrivacy && s.submitBtnDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.submitText}>Registrati</Text>}
            </TouchableOpacity>

            <TouchableOpacity testID="go-login-btn" style={s.loginBtn} onPress={() => router.back()}>
              <Text style={s.loginText}>Hai già un account? <Text style={s.loginLink}>Accedi</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PrivacyPolicyModal visible={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.navy, marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.textSec, marginTop: 6, marginBottom: 16 },
  infoBox: { flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 10, padding: 12, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#0284C7' },
  infoText: { fontSize: 13, color: '#0369A1', marginLeft: 10, flex: 1, lineHeight: 19 },
  form: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  row: { flexDirection: 'row' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 14, marginBottom: 14 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.textMain },
  // Consent section
  consentSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, marginTop: 4, marginBottom: 8 },
  consentTitle: { fontSize: 15, fontWeight: '600', color: Colors.navy, marginBottom: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.navy,
    justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  checkLabel: { fontSize: 13, color: Colors.textSec, flex: 1, lineHeight: 19 },
  checkLink: { fontSize: 13, color: Colors.sky, fontWeight: '600', marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  submitBtn: { height: 56, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { backgroundColor: Colors.textMuted },
  submitText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  loginBtn: { marginTop: 20, alignItems: 'center' },
  loginText: { fontSize: 14, color: Colors.textSec },
  loginLink: { color: Colors.sky, fontWeight: '600' },
});

const pm = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.navy },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  policyText: { fontSize: 13, color: Colors.textMain, lineHeight: 21 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  closeFullBtn: { height: 52, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  closeFullText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
