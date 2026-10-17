import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/lib/hooks';

export default function NotFoundScreen() {
  const { colors, tokens } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Page not found
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          The page you're looking for doesn't exist.
        </Text>
        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          Go back home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    fontWeight: '500',
  },
});
