import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

interface LoadingScreenProps {
  message?: string;
  /** Size of the loading indicator */
  size?: 'small' | 'large';
}

export function LoadingScreen({ message, size = 'large' }: LoadingScreenProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

/**
 * Inline loading indicator - for use within components
 */
export function LoadingIndicator({ 
  size = 'small',
  color,
}: { 
  size?: 'small' | 'large';
  color?: string;
}) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.primary} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  message: {
    marginTop: tokens.spacing.md,
    fontSize: 14,
    textAlign: 'center',
  },
});
