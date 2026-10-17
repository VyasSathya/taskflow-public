import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { SafeAreaWrapper } from '@/components/common';
import { FadeIn, ScaleIn } from '@/components/animations';
import { useTheme, useToast, useHaptics } from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores';
import { tokens } from '@/lib/theme';

// Detect if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-loaded Apple button component - only works in dev builds
const AppleSignInButton = ({ onPress, style }: { onPress: () => void; style: any }) => {
  const [AppleAuth, setAppleAuth] = useState<typeof import('expo-apple-authentication') | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios' && !isExpoGo) {
      try {
        const module = require('expo-apple-authentication');
        setAppleAuth(module);
      } catch (error) {
        console.warn('Apple Authentication not available');
      }
    }
  }, []);

  if (!AppleAuth) return null;

  return (
    <AppleAuth.AppleAuthenticationButton
      buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={16}
      style={style}
      onPress={onPress}
    />
  );
};

export default function LoginScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const {
    signInWithApple,
    signInWithGoogle,
    checkAppleAvailability,
    isLoading,
    error,
  } = useAuthStore();

  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    checkAppleAvailability().then(setAppleAvailable);
  }, []);

  const handleAppleSignIn = async () => {
    haptics.medium();
    try {
      await signInWithApple();
      toast.success('Welcome!');
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown error';
      if (errorMsg.includes('canceled')) {
        return;
      }
      toast.error('Sign in failed', errorMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    haptics.medium();
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error('Sign in failed', error || 'Please try again');
    }
  };

  return (
    <SafeAreaWrapper>
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={styles.container}
      >
        {/* Logo & Branding */}
        <FadeIn delay={100}>
          <View style={styles.header}>
            <LinearGradient
              colors={[colors.primary, colors.accent || colors.primary]}
              style={styles.logoContainer}
            >
              <Ionicons name="rocket" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              AppName
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Your app tagline here
            </Text>
          </View>
        </FadeIn>

        {/* Auth Buttons */}
        <View style={styles.authContainer}>
          {/* Apple Sign In - iOS only */}
          {appleAvailable && (
            <ScaleIn delay={200}>
              <AppleSignInButton
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </ScaleIn>
          )}

          {/* Google Sign In */}
          <ScaleIn delay={300}>
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                styles.googleButton,
                { backgroundColor: '#fff', borderColor: colors.border },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </ScaleIn>
        </View>

        {/* Footer */}
        <FadeIn delay={400}>
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </FadeIn>
      </LinearGradient>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xxl * 2,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.lg,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: tokens.spacing.sm,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  authContainer: {
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xxl,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    gap: tokens.spacing.md,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#4285F4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  googleText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
