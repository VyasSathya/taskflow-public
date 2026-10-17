import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = (): { bg: string; text: string } => {
    switch (variant) {
      case 'success':
        return { bg: colors.success + '20', text: colors.success };
      case 'warning':
        return { bg: colors.warning + '20', text: colors.warning };
      case 'error':
        return { bg: colors.error + '20', text: colors.error };
      case 'info':
        return { bg: colors.info + '20', text: colors.info };
      default:
        return { bg: colors.primary + '20', text: colors.primary };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    if (size === 'sm') {
      return {
        container: {
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        text: {
          fontSize: 10,
        },
      };
    }
    return {
      container: {
        paddingHorizontal: 8,
        paddingVertical: 4,
      },
      text: {
        fontSize: 12,
      },
    };
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: variantStyles.bg },
        sizeStyles.container,
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: variantStyles.text }, sizeStyles.text]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
