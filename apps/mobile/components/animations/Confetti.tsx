import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Celebration colors - customize for your brand
const DEFAULT_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
];

interface ConfettiPieceProps {
  index: number;
  color: string;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
}

function ConfettiPiece({ index, color, startX, startY, size, duration, delay }: ConfettiPieceProps) {
  const translateY = useSharedValue(startY);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Scale in
    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));

    // Fall down with some horizontal drift
    const endX = startX + (Math.random() - 0.5) * 100;
    const endY = SCREEN_HEIGHT + 50;

    translateY.value = withDelay(
      delay,
      withTiming(endY, { duration, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(endX, { duration, easing: Easing.inOut(Easing.sin) })
    );

    // Rotate while falling
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1) * 3, { duration })
    );

    // Fade out near the end
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  // Random shape - circle, square, or diamond
  const shapeStyle = useMemo(() => {
    const shapeType = index % 3;
    if (shapeType === 0) {
      return { borderRadius: size / 2 }; // Circle
    } else if (shapeType === 1) {
      return { borderRadius: 2 }; // Square
    } else {
      return { borderRadius: size / 4, transform: [{ rotate: '45deg' }] }; // Diamond
    }
  }, [index, size]);

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          width: size,
          height: size,
          backgroundColor: color,
          ...shapeStyle,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiProps {
  count?: number;
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

export function Confetti({
  count = 50,
  duration = 2500,
  colors = DEFAULT_COLORS,
  onComplete
}: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      startX: Math.random() * SCREEN_WIDTH,
      startY: -20 - Math.random() * 100,
      size: 8 + Math.random() * 8,
      duration: duration + Math.random() * 500,
      delay: Math.random() * 300,
    }));
  }, [count, duration, colors]);

  useEffect(() => {
    if (onComplete) {
      const timeout = setTimeout(onComplete, duration + 800);
      return () => clearTimeout(timeout);
    }
  }, [duration, onComplete]);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          index={piece.id}
          color={piece.color}
          startX={piece.startX}
          startY={piece.startY}
          size={piece.size}
          duration={piece.duration}
          delay={piece.delay}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
  },
});
