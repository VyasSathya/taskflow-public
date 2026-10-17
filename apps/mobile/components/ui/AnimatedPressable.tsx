import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
  };
  children: React.ReactNode;
}

export function AnimatedPressable({
  style,
  scaleValue = 0.97,
  springConfig = { damping: 15, stiffness: 400 },
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback((e: any) => {
    scale.value = withSpring(scaleValue, springConfig);
    onPressIn?.(e);
  }, [scale, scaleValue, springConfig, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    scale.value = withSpring(1, springConfig);
    onPressOut?.(e);
  }, [scale, springConfig, onPressOut]);

  return (
    <AnimatedPressableBase
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}
