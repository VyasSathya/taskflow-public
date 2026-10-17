/**
 * EmptyState - Animated Empty State Component
 * Shows helpful empty states with icons and CTAs
 *
 * Use for:
 * - No search results
 * - Empty lists
 * - No connections
 * - Loading states
 *
 * Features:
 * - Multiple preset types
 * - Custom icons and messages
 * - Optional CTA button
 * - Animated entrance
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { useTheme, useHaptics } from '@/lib/hooks';

type EmptyStateType =
  | 'no-results'
  | 'no-data'
  | 'no-connections'
  | 'no-notifications'
  | 'error'
  | 'offline'
  | 'empty-inbox'
  | 'custom';

interface EmptyStateProps {
  /** Preset type for quick configuration */
  type?: EmptyStateType;
  /** Main title text */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Icon name (Ionicons) */
  icon?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button handler */
  onCtaPress?: () => void;
  /** Icon size */
  iconSize?: number;
  /** Primary color */
  primaryColor?: string;
  /** Whether to animate entrance */
  animate?: boolean;
}

// Preset configurations
const PRESETS: Record<EmptyStateType, {
  icon: string;
  title: string;
  subtitle: string;
}> = {
  'no-results': {
    icon: 'search-outline',
    title: 'No Results Found',
    subtitle: 'Try adjusting your search or filters',
  },
  'no-data': {
    icon: 'file-tray-outline',
    title: 'No Data Yet',
    subtitle: 'Content will appear here once available',
  },
  'no-connections': {
    icon: 'people-outline',
    title: 'No Connections',
    subtitle: 'Start connecting with others',
  },
  'no-notifications': {
    icon: 'notifications-outline',
    title: 'All Caught Up',
    subtitle: "You don't have any new notifications",
  },
  'error': {
    icon: 'alert-circle-outline',
    title: 'Something Went Wrong',
    subtitle: 'Please try again later',
  },
  'offline': {
    icon: 'cloud-offline-outline',
    title: "You're Offline",
    subtitle: 'Check your internet connection',
  },
  'empty-inbox': {
    icon: 'mail-outline',
    title: 'Inbox Empty',
    subtitle: 'No messages to display',
  },
  'custom': {
    icon: 'help-circle-outline',
    title: '',
    subtitle: '',
  },
};

export function EmptyState({
  type = 'no-data',
  title,
  subtitle,
  icon,
  ctaText,
  onCtaPress,
  iconSize = 64,
  primaryColor,
  animate = true,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const preset = PRESETS[type];

  const displayIcon = icon || preset.icon;
  const displayTitle = title || preset.title;
  const displaySubtitle = subtitle || preset.subtitle;
  // Use semantic colors for specific types
  const displayColor = type === 'error' 
    ? semanticColors.error 
    : (primaryColor || colors.primary);

  const handleCtaPress = () => {
    haptics.light();
    onCtaPress?.();
  };

  const Container = animate ? Animated.View : View;
  const enteringAnimation = animate ? FadeInUp.duration(400).springify() : undefined;

  return (
    <Container
      entering={enteringAnimation}
      style={styles.container}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${displayColor}15` }]}>
        <Ionicons
          name={displayIcon as any}
          size={iconSize}
          color={displayColor}
        />
      </View>

      {/* Title */}
      {displayTitle && (
        <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
      )}

      {/* Subtitle */}
      {displaySubtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{displaySubtitle}</Text>
      )}

      {/* CTA Button */}
      {ctaText && onCtaPress && (
        <TouchableOpacity
          onPress={handleCtaPress}
          style={[styles.ctaButton, { backgroundColor: displayColor }]}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{ctaText}</Text>
        </TouchableOpacity>
      )}
    </Container>
  );
}

/**
 * Compact empty state for inline use
 */
export function EmptyStateCompact({
  message,
  icon = 'information-circle-outline',
}: {
  message: string;
  icon?: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.compactContainer}>
      <Ionicons
        name={icon as any}
        size={20}
        color={colors.textTertiary}
        style={styles.compactIcon}
      />
      <Text style={[styles.compactMessage, { color: colors.textTertiary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: tokens.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.lg,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  compactIcon: {
    marginRight: tokens.spacing.sm,
  },
  compactMessage: {
    fontSize: 14,
  },
});

export default EmptyState;
