import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { ENV, SESSION_CONFIG } from '@/config/constants';

// Detect if running in Expo Go (no native modules available)
const isExpoGo = Constants.appOwnership === 'expo';

// Native modules - only loaded in dev builds, not Expo Go
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;

// Cryptographically secure nonce generation
const generateNonce = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

// Proper SHA-256 hash using expo-crypto
const sha256 = async (message: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );
};

const loadAppleAuth = async (): Promise<boolean> => {
  if (isExpoGo || Platform.OS !== 'ios') {
    return false;
  }

  try {
    if (!AppleAuthentication) {
      AppleAuthentication = require('expo-apple-authentication');
    }
    return true;
  } catch (error) {
    console.warn('Failed to load Apple Authentication:', error);
    return false;
  }
};

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);

// Secure storage adapter for Supabase auth
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// Create Supabase client only if configured
const createSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    console.warn(
      '⚠️ Supabase not configured. Create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
    return null;
  }

  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
};

export const supabase = createSupabaseClient();

// Ensure fresh session - refresh if token expires within threshold
export const ensureFreshSession = async (): Promise<Session | null> => {
  if (!supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    const expiresAt = session.expires_at;
    if (!expiresAt) return session;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    // Refresh if token expires within threshold
    if (timeUntilExpiry < SESSION_CONFIG.refreshThreshold) {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return session;
      }
      return newSession;
    }

    return session;
  } catch (error) {
    console.error('ensureFreshSession error:', error);
    return null;
  }
};

// Auto-refresh session when app comes to foreground
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export const setupSessionRefresh = (): void => {
  if (!supabase || appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      await ensureFreshSession();
    }
  });
};

export const cleanupSessionRefresh = (): void => {
  appStateSubscription?.remove();
  appStateSubscription = null;
};

// Auth helpers
export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Sign in with ID token (for social auth - Apple, Google)
export const signInWithIdToken = async (params: { provider: 'apple' | 'google'; token: string; nonce?: string }) => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithIdToken(params);
};

// ===========================================
// OAuth Sign In (Apple + Google)
// ===========================================

// Apple Sign In - only works in dev builds, not Expo Go
export const signInWithApple = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const loaded = await loadAppleAuth();
  if (!loaded || !AppleAuthentication) {
    throw new Error('Apple Sign In not available. Please use a development build, not Expo Go.');
  }

  // Generate cryptographically secure nonce
  const rawNonce = await generateNonce();
  const hashedNonce = await sha256(rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token from Apple');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;
  return data;
};

// Check if Apple Sign In is available
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || isExpoGo) return false;

  try {
    const loaded = await loadAppleAuth();
    if (!loaded || !AppleAuthentication) return false;
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};

// Google Sign In (using Supabase OAuth with WebBrowser)
export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  // Dynamically import expo-web-browser
  const WebBrowser = await import('expo-web-browser');

  // Warm up browser for faster OAuth (Android only)
  if (Platform.OS === 'android') {
    await WebBrowser.warmUpAsync();
  }

  const redirectTo = 'taskflow://auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  // Open browser for OAuth flow
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // Clean up browser session (Android)
  if (Platform.OS === 'android') {
    await WebBrowser.coolDownAsync();
  }

  if (result.type === 'success' && result.url) {
    // Extract the tokens from the URL
    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.substring(1)); // Remove # prefix

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      // Set the session using the tokens from the URL
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) throw sessionError;
      return sessionData;
    }
  }

  if (result.type === 'cancel') {
    throw new Error('User cancelled sign in');
  }

  throw new Error('Sign in failed');
};
