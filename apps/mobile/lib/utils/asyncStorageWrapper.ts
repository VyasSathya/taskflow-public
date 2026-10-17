/**
 * AsyncStorage wrapper that works on web and native
 * Uses Platform detection to select the right implementation
 */

import { Platform } from 'react-native';
import NativeAsyncStorage from '@react-native-async-storage/async-storage';

interface AsyncStorageStatic {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  multiGet?(keys: string[]): Promise<readonly [string, string | null][]>;
  multiSet?(keyValuePairs: [string, string][]): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
}

// Web implementation using localStorage
const webStorage: AsyncStorageStatic = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      // Ignore errors (e.g., quota exceeded)
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
  async clear(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.clear();
    } catch {
      // Ignore errors
    }
  },
};

// Use native AsyncStorage on iOS/Android, localStorage on web
const AsyncStorage: AsyncStorageStatic = Platform.OS === 'web' ? webStorage : NativeAsyncStorage;

export default AsyncStorage;
