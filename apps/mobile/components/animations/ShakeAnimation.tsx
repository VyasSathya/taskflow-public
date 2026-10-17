import React, { useEffect, ReactNode, useImperativeHandle, forwardRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface ShakeAnimationProps {
  children: ReactNode;
  trigger?: boolean;
  intensity?: number;
  duration?: number;
  style?: ViewStyle;
}

export interface ShakeAnimationRef {
  shake: () => void;
}

export const ShakeAnimation = forwardRef<ShakeAnimationRef, ShakeAnimationProps>(
  ({ children, trigger, intensity = 10, duration = 50, style }, ref) => {
    const translateX = useSharedValue(0);

    const shake = () => {
      translateX.value = withSequence(
        withTiming(-intensity, { duration }),
        withTiming(intensity, { duration }),
        withTiming(-intensity, { duration }),
        withTiming(intensity, { duration }),
        withSpring(0, { damping: 10, stiffness: 400 })
      );
    };

    useImperativeHandle(ref, () => ({
      shake,
    }));

    useEffect(() => {
      if (trigger) {
        shake();
      }
    }, [trigger]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    return (
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    );
  }
);

ShakeAnimation.displayName = 'ShakeAnimation';
