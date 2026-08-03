import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { secureStorage } from '../utils/secureStorage';
import { setOnTokenExpired } from '../services/api';

// Complete any pending auth sessions (required for mobile)
WebBrowser.maybeCompleteAuthSession();

// Session expiry: 7 days (matches backend)
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
// Warn user 30 minutes before expiry
const EXPIRY_WARNING_MS = 30 * 60 * 1000;

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const EMERGENT_AUTH_URL = 'https://auth.emergentagent.com/';

interface AuthContextType {
  token: string | null;
  userRole: string | null;
  user: any;
  loading: boolean;
  gdprUpdateRequired: boolean;
  gdprUpdateInfo: { versione: string; note: string; data: string } | null;
  login: (token: string, role: string, user?: any) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  loginWithGoogle: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  confirmGdprUpdate: () => {},
});

// Track processed session IDs to prevent double-processing
const processedSessionIds = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gdprUpdateRequired, setGdprUpdateRequired] = useState(false);
  const [gdprUpdateInfo, setGdprUpdateInfo] = useState<{ versione: string; note: string; data: string } | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUrlRef = useRef<string | null>(null);

  // Extract session_id from URL (check both hash and query)
  const extractSessionId = (url: string): string | null => {
    // Try hash fragment first (#session_id=...)
    const hashMatch = url.match(/[#&?]session_id=([^&#]+)/);
    if (hashMatch) return hashMatch[1];
    
    // Try query string (?session_id=...)
    const queryMatch = url.match(/[?&]session_id=([^&#]+)/);
    if (queryMatch) return queryMatch[1];
    
    return null;
  };

  // Exchange session_id for session_token
  const exchangeSessionId = useCallback(async (sessionId: string) => {
    // Guard against duplicate processing
    if (processedSessionIds.has(sessionId)) {
      console.log('Session ID already processed, skipping');
      return;
    }
    processedSessionIds.add(sessionId);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to authenticate');
      }

      const data = await response.json();
      const { session_token, user: userData } = data;

      // Store session token
      const expiryTimestamp = Date.now() + SESSION_EXPIRY_MS;
      await secureStorage.setToken(session_token);
      await secureStorage.setRole(userData?.ruolo || 'condomino');
      await secureStorage.setTokenExpiry(expiryTimestamp);

      setToken(session_token);
      setUserRole(userData?.ruolo || 'condomino');
      setUser(userData);

      // Clean URL on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(window.history.state, '', cleanUrl);
      }

      console.log('Google OAuth login successful');
    } catch (error) {
      console.error('Session exchange failed:', error);
      Alert.alert('Errore', 'Autenticazione Google fallita. Riprova.');
      // Remove from processed so user can retry
      processedSessionIds.delete(sessionId);
    }
  }, []);

  // Handle incoming URL (for deep links)
  const handleUrl = useCallback(async (url: string) => {
    const sessionId = extractSessionId(url);
    if (sessionId) {
      await exchangeSessionId(sessionId);
    }
  }, [exchangeSessionId]);

  // Google OAuth login
  const loginWithGoogle = useCallback(async () => {
    try {
      // Determine redirect URL based on platform
      let redirectUrl: string;
      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/';
      } else {
        redirectUrl = Linking.createURL('');
      }

      const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        // On web, redirect directly
        window.location.href = authUrl;
      } else {
        // On mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        // Check result.url first
        if (result.type === 'success' && result.url) {
          await handleUrl(result.url);
        } else if (result.type === 'dismiss' || result.type === 'cancel') {
          // On Android, the URL might come via deep link instead
          // Check if we captured it via the listener
          if (pendingUrlRef.current) {
            await handleUrl(pendingUrlRef.current);
            pendingUrlRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Errore', 'Impossibile avviare il login con Google.');
    }
  }, [handleUrl]);

  // Fetch user profile using session token
  const refreshProfile = useCallback(async () => {
    const currentToken = await secureStorage.getToken();
    if (!currentToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
      } else if (res.status === 401) {
        // Session expired or invalid
        await performLogout();
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, []);

  // Check GDPR consent
  const checkGdprConsent = useCallback(async (authToken: string) => {
    try {
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
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    const expiry = await secureStorage.getTokenExpiry();
    if (!expiry) return;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    if (timeUntilExpiry <= 0) {
      await performLogout();
      Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
      return;
    }

    const warningTime = timeUntilExpiry - EXPIRY_WARNING_MS;
    if (warningTime > 0) {
      expiryTimerRef.current = setTimeout(() => {
        Alert.alert(
          'Sessione in scadenza',
          'La tua sessione scadrà tra 30 minuti. Salva il tuo lavoro.',
          [{ text: 'OK' }]
        );
        expiryTimerRef.current = setTimeout(async () => {
          await performLogout();
          Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
        }, EXPIRY_WARNING_MS);
      }, warningTime);
    } else {
      expiryTimerRef.current = setTimeout(async () => {
        await performLogout();
        Alert.alert('Sessione scaduta', 'La tua sessione è scaduta. Effettua nuovamente il login.');
      }, timeUntilExpiry);
    }
  }, []);

  const performLogout = async () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    
    // Call backend logout endpoint
    const currentToken = await secureStorage.getToken();
    if (currentToken) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {}
    }
    
    await secureStorage.clearAll();
    setToken(null);
    setUserRole(null);
    setUser(null);
    setGdprUpdateRequired(false);
    setGdprUpdateInfo(null);
  };

  // Handle app state changes
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

  // Handle deep links (mobile)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Listen for incoming URLs
    const subscription = Linking.addEventListener('url', (event) => {
      pendingUrlRef.current = event.url;
      handleUrl(event.url);
    });

    // Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => subscription.remove();
  }, [handleUrl]);

  // Handle web URL on mount (check for session_id in URL)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const fullUrl = window.location.href;
      const sessionId = extractSessionId(fullUrl);
      if (sessionId) {
        exchangeSessionId(sessionId);
        return; // Don't check stored token if we have session_id
      }
    }
    
    // Initialize: restore token from secure storage
    (async () => {
      try {
        const storedToken = await secureStorage.getToken();
        const storedRole = await secureStorage.getRole();

        if (storedToken) {
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
  }, [exchangeSessionId, refreshProfile, checkGdprConsent, setupExpiryTimer]);

  // Standard login (email/password)
  const login = async (newToken: string, role: string, userData?: any) => {
    const expiryTimestamp = Date.now() + SESSION_EXPIRY_MS;
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
    <AuthContext.Provider value={{ 
      token, userRole, user, loading, 
      gdprUpdateRequired, gdprUpdateInfo, 
      login, loginWithGoogle, logout, refreshProfile, confirmGdprUpdate 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
