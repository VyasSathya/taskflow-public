import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/lib/stores';
import { useTheme } from '@/lib/hooks';

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const { isAuthenticated, isLoading, hasCompletedSetup } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated) {
      // User is signed in
      if (!hasCompletedSetup) {
        // Redirect to setup wizard
        router.replace('/setup-wizard');
      } else if (inAuthGroup) {
        // Redirect to main app
        router.replace('/(tabs)');
      }
    } else {
      // User is not signed in
      if (!inAuthGroup) {
        // Redirect to login
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading, hasCompletedSetup, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
