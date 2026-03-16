import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

type User = {
  id: string; email: string; nome: string; cognome: string;
  telefono: string; indirizzo: string; codice_fiscale: string;
  ruolo: string; condomini?: any[];
};

type GdprUpdateInfo = {
  versione_attiva: string;
  data_pubblicazione: string;
  note_versione: string;
  testo_completo: string;
};

type AuthContextType = {
  user: User | null; token: string | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  gdprUpdateRequired: boolean;
  gdprUpdateInfo: GdprUpdateInfo | null;
  confirmGdprUpdate: (versione: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gdprUpdateRequired, setGdprUpdateRequired] = useState(false);
  const [gdprUpdateInfo, setGdprUpdateInfo] = useState<GdprUpdateInfo | null>(null);

  const checkGdprUpdate = useCallback(async (tkn: string) => {
    try {
      const res = await api.verificaAggiornamentoInformativa(tkn);
      if (res.aggiornamento_richiesto) {
        setGdprUpdateRequired(true);
        setGdprUpdateInfo({
          versione_attiva: res.versione_attiva,
          data_pubblicazione: res.data_pubblicazione,
          note_versione: res.note_versione,
          testo_completo: res.testo_completo,
        });
      } else {
        setGdprUpdateRequired(false);
        setGdprUpdateInfo(null);
      }
    } catch {
      // Silently ignore GDPR check errors
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        if (stored) {
          const profile = await api.getProfile(stored);
          setToken(stored);
          setUser(profile);
          // Only check GDPR for condomino/fornitore roles (not admin/collaboratore)
          if (profile.ruolo === 'condomino') {
            await checkGdprUpdate(stored);
          }
        }
      } catch {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem('token', data.token);
    // Check GDPR update after login (only for condomino)
    if (data.user.ruolo === 'condomino') {
      await checkGdprUpdate(data.token);
    }
    return data.user;
  }, [checkGdprUpdate]);

  const register = useCallback(async (userData: any) => {
    const data = await api.register(userData);
    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem('token', data.token);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setGdprUpdateRequired(false);
    setGdprUpdateInfo(null);
    await AsyncStorage.removeItem('token');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (token) {
      const profile = await api.getProfile(token);
      setUser(profile);
    }
  }, [token]);

  const confirmGdprUpdate = useCallback(async (versione: string) => {
    if (!token) return;
    await api.confermaAggiornamentoInformativa(token, versione);
    setGdprUpdateRequired(false);
    setGdprUpdateInfo(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile, gdprUpdateRequired, gdprUpdateInfo, confirmGdprUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
