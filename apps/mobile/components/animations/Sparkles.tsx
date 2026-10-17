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
} from 'react-native-reanimated';

// Default sparkle colors - customize for your brand
const DEFAULT_COLORS = [
  '#FFFFFF',
  '#FFE66D',
  '#6366F1',
  '#10B981',
  '#F59E0B',
];

interface SparkleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

function Sparkle({ x, y, size, color, delay }: SparkleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Twinkle animation
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: 400 }),
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        false
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1.3, { duration: 300 }),
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 100 })
        ),
        -1,
        false
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(180, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    >
      {/* 4-point star shape */}
      <View style={[styles.sparklePoint, styles.sparkleVertical, { backgroundColor: color }]} />
      <View style={[styles.sparklePoint, styles.sparkleHorizontal, { backgroundColor: color }]} />
    </Animated.View>
  );
}

interface SparklesProps {
  count?: number;
  width?: number;
  height?: number;
  minSize?: number;
  maxSize?: number;
  colors?: string[];
}

export function Sparkles({
  count = 8,
  width = 200,
  height = 200,
  minSize = 8,
  maxSize = 16,
  colors = DEFAULT_COLORS,
}: SparklesProps) {
  const sparkles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * (width - maxSize),
      y: Math.random() * (height - maxSize),
      size: minSize + Math.random() * (maxSize - minSize),
      color: colors[i % colors.length],
      delay: i * 150, // Stagger the animations
    }));
  }, [count, width, height, minSize, maxSize, colors]);

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} {...sparkle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklePoint: {
    position: 'absolute',
    borderRadius: 2,
  },
  sparkleVertical: {
    width: 2,
    height: '100%',
  },
  sparkleHorizontal: {
    width: '100%',
    height: 2,
  },
});
