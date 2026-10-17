/**
 * StatCard - Metric Display Card
 * Shows statistics with trend indicators and icons
 *
 * Use for:
 * - Dashboard metrics
 * - Analytics displays
 * - Progress tracking
 * - KPI cards
 *
 * Features:
 * - Animated value counting
 * - Trend indicators (up/down/neutral)
 * - Icon support
 * - Customizable colors
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useDerivedValue,
  useAnimatedProps,
} from 'react-native-reanimated';

import { tokens, semanticColors } from '@/lib/theme';
import { GlassPanel } from './GlassCard';
import { useTheme } from '@/lib/hooks';

type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  /** Main value to display */
  value: string | number;
  /** Label/title for the stat */
  label: string;
  /** Icon name (Ionicons) */
  icon?: string;
  /** Trend direction */
  trend?: TrendDirection;
  /** Trend percentage or value */
  trendValue?: string;
  /** Primary color for accents */
  primaryColor?: string;
  /** Animate value counting */
  animateValue?: boolean;
  /** Suffix for value (e.g., '%', 'k') */
  suffix?: string;
  /** Prefix for value (e.g., '$') */
  prefix?: string;
  /** Additional styles */
  style?: ViewStyle;
  /** Compact mode */
  compact?: boolean;
}

const TREND_COLORS = {
  up: semanticColors.success,
  down: semanticColors.error,
  neutral: 'rgba(255,255,255,0.5)',
};

const TREND_ICONS = {
  up: 'trending-up',
  down: 'trending-down',
  neutral: 'remove',
};

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  primaryColor,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  primaryColor: string;
}) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const displayValue = useDerivedValue(() => {
    return Math.round(animatedValue.value);
  });

  // For animated text, we need to use a workaround since RN doesn't support animated text directly
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.statValue, { color: primaryColor }]}>
        {prefix}{Math.round(animatedValue.value)}{suffix}
      </Text>
    </Animated.View>
  );
}

export function StatCard({
  value,
  label,
  icon,
  trend,
  trendValue,
  primaryColor,
  animateValue = false,
  suffix = '',
  prefix = '',
  style,
  compact = false,
}: StatCardProps) {
  const { colors } = useTheme();
  const resolvedPrimaryColor = primaryColor || colors.primary;
  const isNumeric = typeof value === 'number';
  const trendColor = trend ? TREND_COLORS[trend] : undefined;
  const trendIcon = trend ? TREND_ICONS[trend] : undefined;

  return (
    <GlassPanel
      primaryColor={resolvedPrimaryColor}
      style={[styles.container, compact && styles.containerCompact, style]}
      padding={compact ? tokens.spacing.md : tokens.spacing.lg}
    >
      {/* Header with icon */}
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${resolvedPrimaryColor}20` }]}>
            <Ionicons name={icon as any} size={compact ? 16 : 20} color={resolvedPrimaryColor} />
          </View>
        )}
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Value */}
      <View style={styles.valueContainer}>
        {animateValue && isNumeric ? (
          <AnimatedNumber
            value={value as number}
            prefix={prefix}
            suffix={suffix}
            primaryColor={resolvedPrimaryColor}
          />
        ) : (
          <Text style={[styles.statValue, compact && styles.statValueCompact, { color: resolvedPrimaryColor }]}>
            {prefix}{value}{suffix}
          </Text>
        )}

        {/* Trend indicator */}
        {trend && trendValue && (
          <View style={[styles.trendContainer, { backgroundColor: `${trendColor}15` }]}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
            <Text style={[styles.trendValue, { color: trendColor }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
    </GlassPanel>
  );
}

/**
 * StatRow - Horizontal layout for multiple stats
 */
export function StatRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.statRow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 140,
  },
  containerCompact: {
    minWidth: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    flex: 1,
  },
  labelCompact: {
    fontSize: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statValueCompact: {
    fontSize: 22,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
    gap: 2,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
});

export default StatCard;
