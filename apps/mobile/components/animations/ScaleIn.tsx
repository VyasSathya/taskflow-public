import React, { ReactNode } from 'react';
import Animated, {
  ZoomIn,
  ZoomOut,
  BounceIn,
  BounceOut,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface ScaleInProps {
  children: ReactNode;
  from?: number;
  delay?: number;
  duration?: number;
  bounce?: boolean;
  style?: ViewStyle;
}

export function ScaleIn({
  children,
  from = 0.8,
  delay = 0,
  duration = 300,
  bounce = false,
  style,
}: ScaleInProps) {
  if (bounce) {
    return (
      <Animated.View
        entering={BounceIn.delay(delay).duration(duration)}
        exiting={BounceOut.duration(duration)}
        style={style}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={ZoomIn.delay(delay)
        .duration(duration)
        .withInitialValues({ transform: [{ scale: from }] })}
      exiting={ZoomOut.duration(duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
