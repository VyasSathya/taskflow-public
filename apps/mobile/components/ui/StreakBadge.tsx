/**
 * StreakBadge - Gamification Streak Display
 * Shows streak counts with fire animation and milestone celebrations
 *
 * Use for:
 * - Daily streaks
 * - Achievement displays
 * - Progress milestones
 * - Engagement metrics
 *
 * Features:
 * - Fire animation at high streaks
 * - Milestone indicators
 * - Animated counting
 * - Customizable thresholds
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/lib/theme';
import { FireAnimation } from '../animations/FireAnimation';

interface StreakBadgeProps {
  /** Current streak count */
  streak: number;
  /** Label to show (default: 'day streak') */
  label?: string;
  /** Threshold to show fire animation (default: 3) */
  fireThreshold?: number;
  /** Milestone values to celebrate */
  milestones?: number[];
  /** Primary color */
  primaryColor?: string;
  /** Fire intensity multiplier based on streak */
  intensityScaling?: boolean;
  /** Additional styles */
  style?: ViewStyle;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show background glow */
  showGlow?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    container: { paddingHorizontal: 10, paddingVertical: 6 },
    number: { fontSize: 16 },
    label: { fontSize: 10 },
    fireSize: 16,
    iconSize: 12,
  },
  md: {
    container: { paddingHorizontal: 14, paddingVertical: 8 },
    number: { fontSize: 22 },
    label: { fontSize: 12 },
    fireSize: 20,
    iconSize: 14,
  },
  lg: {
    container: { paddingHorizontal: 18, paddingVertical: 12 },
    number: { fontSize: 32 },
    label: { fontSize: 14 },
    fireSize: 28,
    iconSize: 18,
  },
};

export function StreakBadge({
  streak,
  label = 'day streak',
  fireThreshold = 3,
  milestones = [7, 30, 100, 365],
  primaryColor = '#FF9500',
  intensityScaling = true,
  style,
  size = 'md',
  showGlow = true,
}: StreakBadgeProps) {
  const config = SIZE_CONFIG[size];
  const showFire = streak >= fireThreshold;
  const isMilestone = milestones.includes(streak);

  // Calculate fire intensity based on streak
  const fireIntensity = intensityScaling
    ? streak >= 30 ? 3 : streak >= 7 ? 2 : 1
    : 2;

  // Animation for milestone celebration
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    if (isMilestone) {
      // Celebration bounce
      scale.value = withSequence(
        withSpring(1.2, { damping: 4, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
    }
  }, [streak, isMilestone]);

  useEffect(() => {
    if (showGlow && showFire) {
      glow.value = withSequence(
        withTiming(0.6, { duration: 500 }),
        withTiming(0.3, { duration: 500 })
      );
    }
  }, [showFire, showGlow]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        config.container,
        { borderColor: `${primaryColor}50` },
        isMilestone && styles.milestoneContainer,
        isMilestone && { borderColor: primaryColor },
        containerStyle,
        style,
      ]}
    >
      {/* Background glow */}
      {showGlow && showFire && (
        <Animated.View
          style={[
            styles.glowBackground,
            glowStyle,
            { backgroundColor: primaryColor },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Fire or regular icon */}
      <View style={styles.iconContainer}>
        {showFire ? (
          <FireAnimation size={config.fireSize} intensity={fireIntensity} />
        ) : (
          <Ionicons
            name="flame-outline"
            size={config.iconSize}
            color="rgba(255,255,255,0.4)"
          />
        )}
      </View>

      {/* Streak number */}
      <Text
        style={[
          styles.streakNumber,
          config.number,
          { color: showFire ? primaryColor : 'rgba(255,255,255,0.6)' },
        ]}
      >
        {streak}
      </Text>

      {/* Label */}
      <Text style={[styles.label, config.label]}>
        {label}
      </Text>

      {/* Milestone indicator */}
      {isMilestone && (
        <View style={[styles.milestoneBadge, { backgroundColor: primaryColor }]}>
          <Ionicons name="star" size={10} color="#fff" />
        </View>
      )}
    </Animated.View>
  );
}

/**
 * MiniStreak - Compact inline streak indicator
 */
export function MiniStreak({
  streak,
  primaryColor = '#FF9500',
  showFire = true,
}: {
  streak: number;
  primaryColor?: string;
  showFire?: boolean;
}) {
  const hasFire = showFire && streak >= 3;

  return (
    <View style={styles.miniContainer}>
      {hasFire ? (
        <FireAnimation size={14} intensity={1} />
      ) : (
        <Ionicons name="flame-outline" size={12} color={primaryColor} />
      )}
      <Text style={[styles.miniNumber, { color: primaryColor }]}>
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  milestoneContainer: {
    backgroundColor: 'rgba(255,150,0,0.1)',
  },
  glowBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.borderRadius.full,
  },
  iconContainer: {
    marginRight: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontWeight: '700',
    marginRight: tokens.spacing.xs,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  milestoneBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default StreakBadge;
