import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Attenzione', 'Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
      const user = result.user;
      await login(result.token, user.ruolo);
      if (user.ruolo === 'admin') {
        router.replace('/admin');
      } else if (user.ruolo === 'fornitore') {
        router.replace('/fornitore-dashboard');
      } else {
        router.replace('/home');
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // Navigation will happen automatically after successful auth
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Login con Google fallito');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Image source={require('../assets/images/logo_building.png')} style={s.logoImg} accessibilityLabel="Logo Studio Tardugno & Bonifacio" />
            <Text style={s.brand}>Studio Tardugno</Text>
            <Text style={s.brandSub}>& Bonifacio</Text>
            <Text style={s.subtitle}>Consulenza contabile, fiscale e condominiale</Text>
          </View>

          <View style={s.form}>
            <Text style={s.formTitle}>Accedi</Text>

            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
              <TextInput testID="login-email-input" style={s.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
              <TextInput testID="login-password-input" style={s.input} placeholder="Password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
              <TouchableOpacity testID="toggle-password-btn" onPress={() => setShowPw(!showPw)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity testID="login-submit-btn" style={s.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.loginBtnText}>Accedi</Text>}
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>oppure</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity testID="google-login-btn" style={s.googleBtn} onPress={handleGoogleLogin} disabled={googleLoading} activeOpacity={0.8}>
              {googleLoading ? (
                <ActivityIndicator color={Colors.textMain} />
              ) : (
                <>
                  <Image source={require('../assets/images/google-icon.png')} style={s.googleIcon} />
                  <Text style={s.googleBtnText}>Accedi con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity testID="go-register-btn" style={s.regBtn} onPress={() => router.push('/register')}>
              <Text style={s.regText}>Non hai un account? <Text style={s.regLink}>Registrati</Text></Text>
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>Salerno — Dal 1984</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoImg: { width: 88, height: 88, marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: '700', color: Colors.navy },
  brandSub: { fontSize: 22, fontWeight: '600', color: Colors.sky },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
  form: { backgroundColor: Colors.white, borderRadius: 16, padding: 24},
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.navy, marginBottom: 24, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 14, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.textMain },
  loginBtn: { height: 56, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginBtnText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 16, color: Colors.textMuted, fontSize: 14 },
  googleBtn: { height: 56, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: Colors.textMain },
  regBtn: { marginTop: 20, alignItems: 'center' },
  regText: { fontSize: 14, color: Colors.textSec },
  regLink: { color: Colors.sky, fontWeight: '600' },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginTop: 32 },
});
