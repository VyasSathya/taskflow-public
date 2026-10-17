/**
 * FireAnimation - Gamification Fire/Streak Effect
 * Use for streaks, achievements, hot items, trending indicators
 *
 * Features:
 * - Rising flame particles
 * - Flicker effect for realism
 * - Configurable intensity (1-3)
 * - Performance optimized
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

// Fire colors from hot to cool
const FIRE_COLORS = [
  '#FFEB3B', // Yellow (hottest)
  '#FF9800', // Orange
  '#FF5722', // Deep orange
  '#F44336', // Red
  '#E91E63', // Pink-red (tip)
];

interface FlameProps {
  x: number;
  baseY: number;
  size: number;
  color: string;
  delay: number;
  speed: number;
}

function Flame({ x, baseY, size, color, delay, speed }: FlameProps) {
  const progress = useSharedValue(0);
  const flicker = useSharedValue(1);

  useEffect(() => {
    // Rising flame animation
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: speed, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    // Flicker effect
    flicker.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 100 }),
          withTiming(1, { duration: 100 }),
          withTiming(0.8, { duration: 80 }),
          withTiming(1, { duration: 120 })
        ),
        -1,
        false
      )
    );
  }, [delay, speed]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -size * 1.5]);
    const opacity = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 1, 0.8, 0]);
    const scale = interpolate(progress.value, [0, 0.3, 1], [0.5, 1, 0.3]);

    return {
      opacity: opacity * flicker.value,
      transform: [
        { translateY },
        { scale: scale * flicker.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.flame,
        {
          left: x,
          bottom: baseY,
          width: size,
          height: size * 1.5,
          backgroundColor: color,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

interface FireAnimationProps {
  /** Size of the fire container (default: 24) */
  size?: number;
  /** Intensity 1-3, affects number of flames (default: 2) */
  intensity?: number;
  /** Custom colors array (optional) */
  colors?: string[];
}

export function FireAnimation({
  size = 24,
  intensity = 2,
  colors = FIRE_COLORS,
}: FireAnimationProps) {
  const flameCount = intensity * 3;

  const flames = useMemo(() => {
    return Array.from({ length: flameCount }, (_, i) => {
      const spread = size * 0.6;
      const centerX = size / 2 - 3;

      return {
        id: i,
        x: centerX + (Math.random() - 0.5) * spread,
        baseY: Math.random() * 4,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: i * 80,
        speed: 400 + Math.random() * 200,
      };
    });
  }, [flameCount, size, colors]);

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {flames.map((flame) => (
        <Flame key={flame.id} {...flame} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  flame: {
    position: 'absolute',
  },
});

export default FireAnimation;
