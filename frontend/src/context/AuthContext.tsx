import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import { setOnTokenExpired } from '../services/api';

// JWT expiry: 72 hours (must match backend JWT_EXP_HOURS)
const JWT_EXPIRY_MS = 72 * 60 * 60 * 1000;
// Warn user 30 minutes before expiry
const EXPIRY_WARNING_MS = 30 * 60 * 1000;

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface AuthContextType {
  token: string | null;
  userRole: string | null;
  user: any;
  loading: boolean;
  gdprUpdateRequired: boolean;
  gdprUpdateInfo: { versione: string; note: string; data: string } | null;
  login: (token: string, role: string, user?: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  confirmGdprUpdate: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  userRole: null,
  user: null,
  loading: true,
  gdprUpdateRequired: false,
  gdprUpdateInfo: null,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  confirmGdprUpdate: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gdprUpdateRequired, setGdprUpdateRequired] = useState(false);
  const [gdprUpdateInfo, setGdprUpdateInfo] = useState<{ versione: string; note: string; data: string } | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch user profile
  const refreshProfile = useCallback(async () => {
    const currentToken = await secureStorage.getToken();
    if (!currentToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
      }
    } catch {}
  }, []);

  // Check GDPR consent
  const checkGdprConsent = useCallback(async (authToken: string) => {
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/privacy/check-consent`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.update_required) {
          setGdprUpdateRequired(true);
          setGdprUpdateInfo({
            versione: data.nuova_versione || '',
            note: data.note_versione || '',
            data: data.data_pubblicazione || '',
          });
        }
      }
    } catch {}
  }, []);

  // Set up expiry timer
  const setupExpiryTimer = useCallback(async () => {
    // Clear any existing timer
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    const expiry = await secureStorage.getTokenExpiry();
    if (!expiry) return;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    if (timeUntilExpiry <= 0) {
      // Already expired
      await performLogout();
      Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
      return;
    }

    // Set warning timer (30 min before expiry)
    const warningTime = timeUntilExpiry - EXPIRY_WARNING_MS;
    if (warningTime > 0) {
      expiryTimerRef.current = setTimeout(() => {
        Alert.alert(
          'Sessione in scadenza',
          'La tua sessione scadrà tra 30 minuti. Salva il tuo lavoro.',
          [{ text: 'OK' }]
        );
        // Set final expiry timer
        expiryTimerRef.current = setTimeout(async () => {
          await performLogout();
          Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
        }, EXPIRY_WARNING_MS);
      }, warningTime);
    } else {
      // Less than 30 min remaining, set direct expiry timer
      expiryTimerRef.current = setTimeout(async () => {
        await performLogout();
        Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
      }, timeUntilExpiry);
    }
  }, []);

  // Handle app state changes (check expiry when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && token) {
        const expired = await secureStorage.isTokenExpired();
        if (expired) {
          await performLogout();
          Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
        }
      }
    });
    return () => subscription.remove();
  }, [token]);

  // Register API interceptor for expired tokens
  useEffect(() => {
    setOnTokenExpired(() => {
      performLogout();
    });
  }, []);

  // Initialize: restore token from secure storage
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await secureStorage.getToken();
        const storedRole = await secureStorage.getRole();

        if (storedToken) {
          // Check if token is expired
          const expired = await secureStorage.isTokenExpired();
          if (expired) {
            await secureStorage.clearAll();
          } else {
            setToken(storedToken);
            setUserRole(storedRole);
            await refreshProfile();
            await checkGdprConsent(storedToken);
            await setupExpiryTimer();
          }
        }
      } catch (e) {
        console.error('Error restoring auth:', e);
        await secureStorage.clearAll();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const performLogout = async () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    await secureStorage.clearAll();
    setToken(null);
    setUserRole(null);
    setUser(null);
    setGdprUpdateRequired(false);
    setGdprUpdateInfo(null);
  };

  const login = async (newToken: string, role: string, userData?: any) => {
    // Store token + role + expiry
    const expiryTimestamp = Date.now() + JWT_EXPIRY_MS;
    await secureStorage.setToken(newToken);
    await secureStorage.setRole(role);
    await secureStorage.setTokenExpiry(expiryTimestamp);
    setToken(newToken);
    setUserRole(role);
    if (userData) setUser(userData);
    await checkGdprConsent(newToken);
    await setupExpiryTimer();
  };

  const logout = async () => {
    await performLogout();
  };

  const confirmGdprUpdate = () => {
    setGdprUpdateRequired(false);
    setGdprUpdateInfo(null);
  };

  return (
    <AuthContext.Provider value={{ token, userRole, user, loading, gdprUpdateRequired, gdprUpdateInfo, login, logout, refreshProfile, confirmGdprUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
