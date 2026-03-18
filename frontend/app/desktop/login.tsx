import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/theme';

export default function DesktopLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert('Attenzione', 'Inserisci email e password'); return; }
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      if (u.ruolo === 'admin') router.replace('/desktop/admin');
      else if (u.ruolo === 'collaboratore') router.replace('/desktop/collaboratore');
      else Alert.alert('Accesso negato', 'Questa area è riservata ad Amministratori e Collaboratori.');
    } catch (e: any) { Alert.alert('Errore', e.message || 'Credenziali non valide'); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.page}>
      {/* Left panel - branding */}
      <View style={s.leftPanel}>
        <View style={s.brand}>
          <View style={s.logoCircle}>
            <Ionicons name="business" size={48} color={Colors.white} />
          </View>
          <Text style={s.brandTitle}>Studio Tardugno{`\n`}& Bonifacio</Text>
          <Text style={s.brandSub}>Gestione Condominiale</Text>
        </View>
        <View style={s.featureList}>
          {[
            { icon: 'business-outline', text: 'Gestione condomini e unità immobiliari' },
            { icon: 'people-outline', text: 'Amministrazione utenti e fornitori' },
            { icon: 'warning-outline', text: 'Segnalazioni e sopralluoghi' },
            { icon: 'shield-checkmark-outline', text: 'GDPR e privacy integrata' },
          ].map(f => (
            <View key={f.text} style={s.feature}>
              <Ionicons name={f.icon as any} size={18} color="rgba(255,255,255,0.8)" />
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Right panel - login form */}
      <View style={s.rightPanel}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Accesso Portale</Text>
          <Text style={s.cardSub}>Area riservata ad Amministratori e Collaboratori</Text>

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="admin@tardugno.it"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.loginBtnText}>Accedi al Portale</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.mobileLink} onPress={() => router.replace('/login')}>
            <Ionicons name="phone-portrait-outline" size={14} color={Colors.textMuted} />
            <Text style={s.mobileLinkText}>Vai all'app mobile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', backgroundColor: Colors.bg },
  leftPanel: {
    width: 420, backgroundColor: Colors.navy,
    padding: 48, justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  brandTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, textAlign: 'center', lineHeight: 34 },
  brandSub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  featureList: { width: '100%' },
  feature: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 14 },
  rightPanel: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: Colors.white, borderRadius: 20, padding: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  cardTitle: { fontSize: 28, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  cardSub: { fontSize: 14, color: Colors.textSec, marginBottom: 32 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textMain, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bg, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textMain, outlineStyle: 'none' } as any,
  eyeBtn: { padding: 4 },
  loginBtn: {
    height: 52, borderRadius: 12, backgroundColor: Colors.navy,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  mobileLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 },
  mobileLinkText: { fontSize: 13, color: Colors.textMuted },
});
