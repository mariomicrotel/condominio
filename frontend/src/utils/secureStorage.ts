/**
 * Secure Token Storage
 * Uses expo-secure-store on native (encrypted), falls back to AsyncStorage on web
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: any = null;

// Only import SecureStore on native platforms
if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch {
    // SecureStore not available, will fall back to AsyncStorage
  }
}

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';
const TOKEN_EXPIRY_KEY = 'token_expiry';

export const secureStorage = {
  async setToken(token: string): Promise<void> {
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },

  async getToken(): Promise<string | null> {
    if (Platform.OS !== 'web' && SecureStore) {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  async setRole(role: string): Promise<void> {
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    } else {
      await AsyncStorage.setItem(ROLE_KEY, role);
    }
  },

  async getRole(): Promise<string | null> {
    if (Platform.OS !== 'web' && SecureStore) {
      return await SecureStore.getItemAsync(ROLE_KEY);
    }
    return await AsyncStorage.getItem(ROLE_KEY);
  },

  async removeRole(): Promise<void> {
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.deleteItemAsync(ROLE_KEY);
    } else {
      await AsyncStorage.removeItem(ROLE_KEY);
    }
  },

  async setTokenExpiry(expiryTimestamp: number): Promise<void> {
    const val = expiryTimestamp.toString();
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, val);
    } else {
      await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, val);
    }
  },

  async getTokenExpiry(): Promise<number | null> {
    let val: string | null;
    if (Platform.OS !== 'web' && SecureStore) {
      val = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    } else {
      val = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    }
    return val ? parseInt(val, 10) : null;
  },

  async removeTokenExpiry(): Promise<void> {
    if (Platform.OS !== 'web' && SecureStore) {
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
    } else {
      await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      this.removeRole(),
      this.removeTokenExpiry(),
    ]);
  },

  /** Check if token is expired or will expire within the given minutes */
  async isTokenExpired(withinMinutes: number = 0): Promise<boolean> {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return true; // No expiry stored → assume expired
    const now = Date.now();
    const bufferMs = withinMinutes * 60 * 1000;
    return now + bufferMs >= expiry;
  },
};
