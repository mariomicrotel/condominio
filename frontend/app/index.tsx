import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/theme';
import { api } from '../src/services/api';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    api.seed().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/home');
      } else {
        router.replace('/login');
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
