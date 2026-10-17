/**
 * AnimatedProgressBar - Premium Progress Bar with Effects
 * Beautiful progress bar with shimmer, glow, and sparkle effects
 *
 * Features:
 * - Smooth spring-based fill animation
 * - Shimmer overlay effect
 * - Pulsing neon glow
 * - Particle sparkles at progress edge
 * - Indeterminate mode for unknown duration
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { tokens } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedProgressBarProps {
  /** Progress value 0-100 */
  progress: number;
  /** Primary gradient color */
  primaryColor?: string;
  /** Secondary gradient color */
  secondaryColor?: string;
  /** Glow color (defaults to primaryColor) */
  glowColor?: string;
  /** Bar height in pixels */
  height?: number;
  /** Show glow effect underneath */
  showGlow?: boolean;
  /** Show shimmer sweep effect */
  showShimmer?: boolean;
  /** Show sparkle at progress edge */
  showSparkle?: boolean;
  /** Indeterminate loading mode */
  indeterminate?: boolean;
  /** Spring animation config */
  springConfig?: {
    damping?: number;
    stiffness?: number;
  };
}

/**
 * Shimmer overlay that sweeps across the progress bar
 */
function ShimmerOverlay({ width }: { width: number }) {
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(width + 100, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [width]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255,255,255,0.3)',
          'rgba(255,255,255,0.5)',
          'rgba(255,255,255,0.3)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
}

/**
 * Sparkle particle at the leading edge of progress
 */
function SparkleParticle({
  progress,
  color,
  maxWidth,
}: {
  progress: SharedValue<number>;
  color: string;
  maxWidth: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 400, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.5, { duration: 300 })
      ),
      -1,
      true
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => {
    const x = (progress.value / 100) * maxWidth;
    return {
      transform: [
        { translateX: x - 6 },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.sparkle, sparkleStyle]}>
      <View style={[styles.sparkleInner, { backgroundColor: color }]} />
      <View style={[styles.sparkleGlow, { backgroundColor: color, shadowColor: color }]} />
    </Animated.View>
  );
}

/**
 * Glow effect underneath the progress bar
 */
function GlowEffect({
  progress,
  color,
}: {
  progress: SharedValue<number>;
  color: string;
  maxWidth: number;
}) {
  const glowPulse = useSharedValue(0.6);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
    opacity: glowPulse.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glowContainer,
        glowStyle,
        {
          backgroundColor: color,
          shadowColor: color,
        },
      ]}
    />
  );
}

/**
 * Indeterminate loading animation
 */
function IndeterminateBar({
  primaryColor,
  secondaryColor,
}: {
  primaryColor: string;
  secondaryColor: string;
  maxWidth: number;
}) {
  const position = useSharedValue(0);
  const width = useSharedValue(30);

  useEffect(() => {
    position.value = withRepeat(
      withSequence(
        withTiming(100, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    width.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 500 }),
        withTiming(30, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    left: `${position.value - width.value / 2}%`,
    width: `${width.value}%`,
  }));

  return (
    <Animated.View style={[styles.indeterminateBar, barStyle]}>
      <LinearGradient
        colors={[primaryColor, secondaryColor, primaryColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function AnimatedProgressBar({
  progress,
  primaryColor = '#8B5CF6',
  secondaryColor = '#FF006E',
  glowColor,
  height = 8,
  showGlow = true,
  showShimmer = true,
  showSparkle = true,
  indeterminate = false,
  springConfig = { damping: 15, stiffness: 100 },
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const effectiveGlowColor = glowColor || primaryColor;
  const barWidth = SCREEN_WIDTH - tokens.spacing.lg * 2;

  useEffect(() => {
    animatedProgress.value = withSpring(progress, springConfig);
  }, [progress, springConfig.damping, springConfig.stiffness]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(animatedProgress.value, 0), 100)}%`,
  }));

  return (
    <View style={styles.container}>
      {showGlow && !indeterminate && (
        <GlowEffect
          progress={animatedProgress}
          color={effectiveGlowColor}
          maxWidth={barWidth}
        />
      )}

      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: 'rgba(255,255,255,0.1)',
          },
        ]}
      >
        {indeterminate ? (
          <IndeterminateBar
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            maxWidth={barWidth}
          />
        ) : (
          <>
            <Animated.View
              style={[
                styles.progressFill,
                progressStyle,
                {
                  height,
                  borderRadius: height / 2,
                },
              ]}
            >
              <LinearGradient
                colors={[primaryColor, secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
              />

              {showShimmer && progress > 0 && progress < 100 && (
                <ShimmerOverlay width={barWidth} />
              )}
            </Animated.View>

            {showSparkle && progress > 5 && progress < 100 && (
              <SparkleParticle
                progress={animatedProgress}
                color={secondaryColor}
                maxWidth={barWidth}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  shimmerGradient: {
    flex: 1,
  },
  sparkle: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sparkleGlow: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  glowContainer: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  indeterminateBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default AnimatedProgressBar;
