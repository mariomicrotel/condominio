import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-60));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      Animated.spring(slideAnim, {
        toValue: offline ? 0 : -60,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      accessibilityRole="alert"
      accessibilityLabel="Connessione assente. Alcune funzionalità non saranno disponibili."
    >
      <Ionicons name="cloud-offline-outline" size={18} color="#FFF" />
      <Text style={styles.text}>Nessuna connessione internet</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#DC2626',
    paddingVertical: 10, paddingHorizontal: 16,
  },
  text: {
    fontSize: 13, fontWeight: '600', color: '#FFF',
  },
});
