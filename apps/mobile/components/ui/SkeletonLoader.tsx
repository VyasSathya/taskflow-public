import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

interface SkeletonLoaderProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  shimmer?: boolean;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = tokens.borderRadius.md,
  shimmer = true,
  style,
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    if (shimmer) {
      animatedValue.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        false
      );
    }
  }, [animatedValue, shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!shimmer) return {};

    const opacity = interpolate(animatedValue.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);

    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.backgroundTertiary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Common skeleton patterns
export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  gap = 8,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={lineHeight}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <SkeletonLoader
      width={size}
      height={size}
      borderRadius={size / 2}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={40} />
        <View style={styles.cardHeaderText}>
          <SkeletonLoader width={120} height={14} />
          <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  cardHeaderText: {
    marginLeft: tokens.spacing.sm,
  },
});
