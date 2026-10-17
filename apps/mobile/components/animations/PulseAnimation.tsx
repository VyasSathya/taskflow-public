import React, { useEffect, ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface PulseAnimationProps {
  children: ReactNode;
  scale?: number;
  duration?: number;
  active?: boolean;
  style?: ViewStyle;
}

export function PulseAnimation({
  children,
  scale = 1.05,
  duration = 1000,
  active = true,
  style,
}: PulseAnimationProps) {
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scaleValue.value = withRepeat(
        withSequence(
          withTiming(scale, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      scaleValue.value = withTiming(1, { duration: 200 });
    }
  }, [active, scale, duration, scaleValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
}
