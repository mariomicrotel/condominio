import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/theme';

export default function DesktopLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inDesktop = segments[0] === 'desktop';
    if (!inDesktop) return;
    const onLogin = segments[1] === 'login';
    if (!user && !onLogin) {
      router.replace('/desktop/login');
    }
  }, [user, loading, segments]);

  return (
    <View style={s.container}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
});
