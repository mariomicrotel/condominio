import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function DesktopIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/desktop/login'); return; }
    if (user.ruolo === 'admin') { router.replace('/desktop/admin'); return; }
    if (user.ruolo === 'collaboratore') { router.replace('/desktop/collaboratore'); return; }
    router.replace('/desktop/login');
  }, [user, loading]);

  return null;
}
