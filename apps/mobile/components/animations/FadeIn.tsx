import React, { ReactNode } from 'react';
import Animated, { FadeIn as ReanimatedFadeIn, FadeOut } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  style,
}: FadeInProps) {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.delay(delay).duration(duration)}
      exiting={FadeOut.duration(duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Fade variants
export function FadeInUp({
  children,
  delay = 0,
  duration = 300,
  distance = 20,
  style,
}: FadeInProps & { distance?: number }) {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.delay(delay)
        .duration(duration)
        .withInitialValues({ opacity: 0, transform: [{ translateY: distance }] })}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function FadeInDown({
  children,
  delay = 0,
  duration = 300,
  distance = 20,
  style,
}: FadeInProps & { distance?: number }) {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.delay(delay)
        .duration(duration)
        .withInitialValues({ opacity: 0, transform: [{ translateY: -distance }] })}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
