import React, { ReactNode } from 'react';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideInDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

type Direction = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

const enteringMap = {
  left: SlideInLeft,
  right: SlideInRight,
  up: SlideInUp,
  down: SlideInDown,
};

const exitingMap = {
  left: SlideOutLeft,
  right: SlideOutRight,
  up: SlideOutUp,
  down: SlideOutDown,
};

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 300,
  style,
}: SlideInProps) {
  const EnteringAnimation = enteringMap[direction];
  const ExitingAnimation = exitingMap[direction];

  return (
    <Animated.View
      entering={EnteringAnimation.delay(delay).duration(duration).springify()}
      exiting={ExitingAnimation.duration(duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
