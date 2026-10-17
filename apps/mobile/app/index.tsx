import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/stores';

export default function Index() {
  const { isAuthenticated, hasCompletedSetup, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasCompletedSetup) {
    return <Redirect href="/setup-wizard" />;
  }

  return <Redirect href="/(tabs)" />;
}
