import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

type User = {
  id: string; email: string; nome: string; cognome: string;
  telefono: string; indirizzo: string; codice_fiscale: string;
  ruolo: string; condomini?: any[];
};

type AuthContextType = {
  user: User | null; token: string | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        if (stored) {
          const profile = await api.getProfile(stored);
          setToken(stored);
          setUser(profile);
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
    return data.user;
  }, []);

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
    await AsyncStorage.removeItem('token');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (token) {
      const profile = await api.getProfile(token);
      setUser(profile);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
