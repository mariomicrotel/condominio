import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/theme';
import { api } from '../src/services/api';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Desktop only on web + wide screen (tablet/desktop)
  const isDesktop = Platform.OS === 'web' && Dimensions.get('window').width >= 768;

  useEffect(() => {
    api.seed().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      if (isDesktop) {
        if (user) {
          if (user.ruolo === 'admin') {
            router.replace('/desktop/admin');
          } else if (user.ruolo === 'collaboratore') {
            router.replace('/desktop/collaboratore');
          } else {
            router.replace('/desktop/login');
          }
        } else {
          router.replace('/desktop/login');
        }
      } else {
        if (user) {
          if (user.ruolo === 'fornitore') {
            router.replace('/fornitore-dashboard');
          } else {
            router.replace('/home');
          }
        } else {
          router.replace('/login');
        }
      }
    }
  }, [user, loading]);

  return (
    <View style={s.container}>
      <ActivityIndicator testID="loading-indicator" size="large" color={Colors.navy} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
});
