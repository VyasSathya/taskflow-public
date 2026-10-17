/**
 * HolographicShimmer - Premium Card Shimmer Effect
 * Creates a photocard/holographic shimmer effect for premium UI elements
 *
 * Use on:
 * - Profile cards
 * - Achievement badges
 * - Premium content
 * - Collectible items
 *
 * Features:
 * - Rotating gradient shimmer
 * - Configurable intensity
 * - Wraps children with effect overlay
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import type { DimensionValue } from 'react-native';

interface HolographicShimmerProps {
  /** Width of container */
  width?: DimensionValue;
  /** Height of container */
  height?: DimensionValue;
  /** Border radius */
  borderRadius?: number;
  /** Child content to wrap */
  children?: React.ReactNode;
  /** Additional styles */
  style?: ViewStyle;
  /** Shimmer intensity: subtle, medium, or intense */
  intensity?: 'subtle' | 'medium' | 'intense';
  /** Animation duration in ms (default: 3000) */
  speed?: number;
  /** Custom gradient colors */
  colors?: string[];
}

// Default holographic gradient colors (photocard aesthetic)
const DEFAULT_HOLO_COLORS = [
  'rgba(247, 202, 201, 0.3)', // Pink
  'rgba(146, 168, 209, 0.3)', // Blue
  'rgba(197, 180, 227, 0.3)', // Purple
  'rgba(247, 202, 201, 0.3)', // Pink (loop)
];

const INTENSITY_MAP = {
  subtle: 0.15,
  medium: 0.25,
  intense: 0.4,
};

export function HolographicShimmer({
  width = '100%',
  height = '100%',
  borderRadius = 16,
  children,
  style,
  intensity = 'medium',
  speed = 3000,
  colors,
}: HolographicShimmerProps) {
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: speed, easing: Easing.linear }),
      -1,
      false
    );
  }, [speed]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [0, 1],
      [-200, 200]
    );
    const rotate = interpolate(
      shimmerPosition.value,
      [0, 1],
      [-15, 15]
    );

    return {
      transform: [
        { translateX },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const opacityValue = INTENSITY_MAP[intensity];
  const baseColors = colors || DEFAULT_HOLO_COLORS;
  const dynamicColors = baseColors.map(color =>
    color.replace(/[\d.]+\)$/, `${opacityValue})`)
  ) as [string, string, ...string[]];

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      {children}
      <View style={[styles.shimmerContainer, { borderRadius }]} pointerEvents="none">
        <Animated.View style={[styles.shimmerGradient, animatedStyle]}>
          <LinearGradient
            colors={dynamicColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerGradient: {
    position: 'absolute',
    top: -50,
    left: -100,
    right: -100,
    bottom: -50,
  },
  gradient: {
    flex: 1,
  },
});

export default HolographicShimmer;
