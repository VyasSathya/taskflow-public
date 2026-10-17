/**
 * Social Authentication Service
 * Handles Google Sign In and Apple Sign In with native SDKs
 *
 * NOTE: Google Sign In requires a native build (EAS). It won't work in Expo Go.
 * Apple Sign In works in Expo Go on iOS.
 */
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithIdToken } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

// TODO: Replace these with your Google OAuth Client IDs from Google Cloud Console
// Get these from: https://console.cloud.google.com/apis/credentials
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

// Lazy-loaded Google Sign In module (to avoid crash in Expo Go)
let GoogleSigninModule: any = null;
let googleSignInConfigured = false;
let googleSignInAvailable = false;

// Try to load Google Sign In module (will fail gracefully in Expo Go)
const loadGoogleSignIn = () => {
  if (GoogleSigninModule !== null) return GoogleSigninModule;

  try {
    // Dynamic require to avoid crash at module load time
    GoogleSigninModule = require('@react-native-google-signin/google-signin');
    googleSignInAvailable = true;
    console.log('[GoogleSignIn] Native module loaded successfully');
    return GoogleSigninModule;
  } catch (e) {
    console.log('[GoogleSignIn] Native module not available (Expo Go?):', e);
    GoogleSigninModule = false; // Mark as attempted but failed
    googleSignInAvailable = false;
    return null;
  }
};

const configureGoogleSignIn = () => {
  if (googleSignInConfigured) return googleSignInAvailable;

  const module = loadGoogleSignIn();
  if (!module || !module.GoogleSignin) {
    googleSignInConfigured = true;
    return false;
  }

  try {
    console.log('Configuring Google Sign In for platform:', Platform.OS);

    module.GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });

    googleSignInConfigured = true;
    console.log('Google Sign In configured successfully');
    return true;
  } catch (e) {
    console.log('Google Sign In configuration failed:', e);
    googleSignInConfigured = true;
    googleSignInAvailable = false;
    return false;
  }
};

// Try to configure on first import (won't crash if unavailable)
configureGoogleSignIn();

/**
 * Check if Google Sign In is available
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  try {
    const module = loadGoogleSignIn();
    if (!module || !module.GoogleSignin) {
      console.log('[GoogleSignIn] Native module not available (use development build)');
      return false;
    }

    const { GoogleSignin } = module;

    // Check if the native module exists first
    if (typeof GoogleSignin.hasPlayServices !== 'function') {
      console.log('[GoogleSignIn] Native module not available');
      return false;
    }

    // On Android, actually check for Play Services
    // On iOS, just check if module exists (Play Services not needed)
    if (Platform.OS === 'android') {
      const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      console.log('[GoogleSignIn] Android Play Services available:', hasPlayServices);
      return hasPlayServices;
    }

    // iOS - module exists so it's available
    console.log('[GoogleSignIn] iOS - module available');
    return true;
  } catch (e) {
    console.log('[GoogleSignIn] Not available:', e);
    return false;
  }
}

/**
 * Sign in with Google using native SDK
 */
export async function signInWithGoogle() {
  try {
    const module = loadGoogleSignIn();
    if (!module || !module.GoogleSignin) {
      throw new Error('Google Sign In requires a development build. Please install from TestFlight or Google Play.');
    }

    const { GoogleSignin, isSuccessResponse } = module;

    // Ensure Google Sign In is configured before attempting sign in
    configureGoogleSignIn();

    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse(response)) {
      const { idToken } = response.data;

      if (!idToken) {
        throw new Error('No ID token returned from Google');
      }

      // Sign in with Supabase using the Google ID token
      const { data, error } = await signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      return data;
    }

    // User cancelled
    return null;
  } catch (error: any) {
    const module = loadGoogleSignIn();
    if (module && module.isErrorWithCode && module.isErrorWithCode(error)) {
      const { statusCodes } = module;
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          // User cancelled - not an error
          return null;
        case statusCodes.IN_PROGRESS:
          throw new Error('Sign in already in progress');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services not available');
        default:
          throw error;
      }
    }
    console.error('Google Sign In error:', error);
    throw error;
  }
}

/**
 * Sign out from Google (clears cached credentials)
 */
export async function signOutGoogle() {
  try {
    const module = loadGoogleSignIn();
    if (module && module.GoogleSignin) {
      await module.GoogleSignin.signOut();
    }
  } catch {
    // Ignore errors - user might not have been signed in with Google
  }
}

/**
 * Check if Apple Sign In is available
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

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

/**
 * Sign in with Apple
 */
export async function signInWithApple() {
  try {
    // Check if Apple Sign In is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device');
    }

    // Generate cryptographically secure nonce
    const rawNonce = await generateNonce();
    const hashedNonce = await sha256(rawNonce);

    // Request credentials from Apple
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    // Sign in with Supabase using the Apple ID token
    if (credential.identityToken) {
      const { data, error } = await signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;

      return data;
    }

    throw new Error('No identity token returned from Apple');
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      // User cancelled - not an error
      return null;
    }
    console.error('Apple Sign In error:', error);
    throw error;
  }
}