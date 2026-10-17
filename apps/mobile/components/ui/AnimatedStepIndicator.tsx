/**
 * AnimatedStepIndicator - Multi-step Progress Component
 * Beautiful animated step indicators for wizards and multi-step processes
 *
 * Features:
 * - Spring-based step transitions
 * - Connecting line animation
 * - Pulsing active state
 * - Success checkmark animation
 * - Staggered entrance animations
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeInLeft,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/lib/theme';

type StepStatus = 'pending' | 'active' | 'done';

interface Step {
  id: string;
  label: string;
  /** Optional label to show when step is active */
  activeLabel?: string;
  status: StepStatus;
}

interface AnimatedStepIndicatorProps {
  steps: Step[];
  /** Primary color for active state */
  primaryColor?: string;
  /** Color for completed steps */
  successColor?: string;
  /** Color for pending steps */
  pendingColor?: string;
  /** Show connector lines between steps */
  showConnectors?: boolean;
  /** Compact mode with smaller spacing */
  compact?: boolean;
}

function AnimatedCheckmark({ color }: { color: string }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(-45);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    rotation.value = withSpring(0, { damping: 12, stiffness: 150 });
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={checkStyle}>
      <Ionicons name="checkmark" size={16} color={color} />
    </Animated.View>
  );
}

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View
        style={[
          styles.pulsingGlow,
          glowStyle,
          { borderColor: color, shadowColor: color },
        ]}
      />
      <Animated.View
        style={[
          styles.pulsingCore,
          pulseStyle,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

function StepConnector({
  isCompleted,
  isActive,
  primaryColor,
  pendingColor,
}: {
  isCompleted: boolean;
  isActive: boolean;
  primaryColor: string;
  pendingColor: string;
}) {
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    if (isCompleted) {
      fillProgress.value = withTiming(1, { duration: 400 });
    } else if (isActive) {
      fillProgress.value = withTiming(0.5, { duration: 300 });
    } else {
      fillProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isCompleted, isActive]);

  const lineStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  return (
    <View style={styles.connectorContainer}>
      <View style={[styles.connectorLine, { backgroundColor: pendingColor }]} />
      <Animated.View
        style={[
          styles.connectorFill,
          lineStyle,
          { backgroundColor: primaryColor },
        ]}
      />
    </View>
  );
}

function StepItem({
  step,
  index,
  isLast,
  primaryColor,
  successColor,
  pendingColor,
  nextStepActive,
  showConnectors,
  compact,
}: {
  step: Step;
  index: number;
  isLast: boolean;
  primaryColor: string;
  successColor: string;
  pendingColor: string;
  nextStepActive: boolean;
  showConnectors: boolean;
  compact: boolean;
}) {
  const iconBgColor =
    step.status === 'done'
      ? `${successColor}20`
      : step.status === 'active'
      ? `${primaryColor}20`
      : `${pendingColor}20`;

  const textColor =
    step.status === 'done'
      ? successColor
      : step.status === 'active'
      ? '#fff'
      : pendingColor;

  const label = step.status === 'active' && step.activeLabel
    ? step.activeLabel
    : step.label;

  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 100).springify()}
      style={[styles.stepRow, compact && styles.stepRowCompact]}
    >
      <View
        style={[
          styles.stepIconContainer,
          compact && styles.stepIconContainerCompact,
          { backgroundColor: iconBgColor },
        ]}
      >
        {step.status === 'done' ? (
          <AnimatedCheckmark color={successColor} />
        ) : step.status === 'active' ? (
          <PulsingDot color={primaryColor} />
        ) : (
          <View style={[styles.pendingDot, { backgroundColor: pendingColor }]} />
        )}
      </View>

      <View style={styles.stepLabelContainer}>
        <Text
          style={[
            styles.stepLabel,
            compact && styles.stepLabelCompact,
            { color: textColor },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {showConnectors && !isLast && (
        <View style={styles.connectorWrapper}>
          <StepConnector
            isCompleted={step.status === 'done'}
            isActive={nextStepActive}
            primaryColor={primaryColor}
            pendingColor={pendingColor}
          />
        </View>
      )}
    </Animated.View>
  );
}

export function AnimatedStepIndicator({
  steps,
  primaryColor = '#8B5CF6',
  successColor = '#00F5A0',
  pendingColor = 'rgba(255,255,255,0.3)',
  showConnectors = false,
  compact = false,
}: AnimatedStepIndicatorProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
          primaryColor={primaryColor}
          successColor={successColor}
          pendingColor={pendingColor}
          nextStepActive={steps[index + 1]?.status === 'active'}
          showConnectors={showConnectors}
          compact={compact}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  stepRowCompact: {
    paddingVertical: tokens.spacing.sm,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  stepIconContainerCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: tokens.spacing.sm,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulsingDotContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulsingGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  stepLabelContainer: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepLabelCompact: {
    fontSize: 13,
  },
  connectorWrapper: {
    position: 'absolute',
    left: 17,
    top: '100%',
    width: 2,
    height: tokens.spacing.md * 2,
  },
  connectorContainer: {
    flex: 1,
    height: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  connectorLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  connectorFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
  },
});

export default AnimatedStepIndicator;
