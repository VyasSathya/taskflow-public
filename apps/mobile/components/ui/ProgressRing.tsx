import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/lib/hooks';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  color?: string;
  trackColor?: string;
  animated?: boolean;
  showPercentage?: boolean;
  label?: string;
  strokeWidth?: number;
}

const SIZE_CONFIG = {
  small: { radius: 30, strokeWidth: 6, fontSize: 12 },
  medium: { radius: 50, strokeWidth: 8, fontSize: 16 },
  large: { radius: 70, strokeWidth: 10, fontSize: 20 },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  progress,
  size = 'medium',
  color,
  trackColor,
  animated = true,
  showPercentage = true,
  label,
  strokeWidth: customStrokeWidth,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const config = SIZE_CONFIG[size];
  const radius = config.radius;
  const strokeWidth = customStrokeWidth ?? config.strokeWidth;
  const fontSize = config.fontSize;
  const circumference = 2 * Math.PI * radius;

  const ringColor = color ?? colors.primary;
  const bgColor = trackColor ?? colors.surfaceElevated;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: Math.min(progress, 100),
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Glow animation when 100%
      if (progress >= 100) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      animatedProgress.setValue(Math.min(progress, 100));
    }
  }, [progress, animated]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const containerSize = radius * 2 + strokeWidth * 2 + 20;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      <Svg width={containerSize} height={containerSize}>
        <G rotation="-90" origin={`${containerSize / 2}, ${containerSize / 2}`}>
          {/* Background circle */}
          <Circle
            cx={containerSize / 2}
            cy={containerSize / 2}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={containerSize / 2}
            cy={containerSize / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
          {/* Glow effect when 100% */}
          {progress >= 100 && (
            <AnimatedCircle
              cx={containerSize / 2}
              cy={containerSize / 2}
              r={radius + strokeWidth / 2}
              stroke={ringColor}
              strokeWidth={2}
              fill="none"
              opacity={glowOpacity}
            />
          )}
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {showPercentage && (
          <Text style={[styles.percentage, { fontSize, color: ringColor }]}>
            {Math.round(progress)}%
          </Text>
        )}
        {label && (
          <Text style={[styles.label, { fontSize: fontSize * 0.6, color: colors.textSecondary }]}>
            {label}
          </Text>
        )}
      </View>

      {/* Completion indicator */}
      {progress >= 100 && (
        <View style={[styles.completionBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.completionIcon}>✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
    marginTop: 2,
  },
  completionBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
