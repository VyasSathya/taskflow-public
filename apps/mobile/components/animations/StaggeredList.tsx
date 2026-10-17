import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  ZoomIn,
  Layout,
} from 'react-native-reanimated';

type AnimationType = 'fade' | 'slide' | 'scale';

interface StaggeredListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  staggerDelay?: number;
  animation?: AnimationType;
  itemStyle?: ViewStyle;
  containerStyle?: ViewStyle;
}

export function StaggeredList<T>({
  data,
  renderItem,
  keyExtractor,
  staggerDelay = 50,
  animation = 'fade',
  itemStyle,
  containerStyle,
}: StaggeredListProps<T>) {
  const getEnteringAnimation = (index: number) => {
    const delay = index * staggerDelay;

    switch (animation) {
      case 'slide':
        return SlideInLeft.delay(delay).duration(300).springify();
      case 'scale':
        return ZoomIn.delay(delay).duration(300);
      case 'fade':
      default:
        return FadeIn.delay(delay).duration(300);
    }
  };

  return (
    <View style={containerStyle}>
      {data.map((item, index) => (
        <Animated.View
          key={keyExtractor(item, index)}
          entering={getEnteringAnimation(index)}
          layout={Layout.springify()}
          style={itemStyle}
        >
          {renderItem(item, index)}
        </Animated.View>
      ))}
    </View>
  );
}

// Convenience component for simple lists
interface SimpleStaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  animation?: AnimationType;
  itemStyle?: ViewStyle;
  containerStyle?: ViewStyle;
}

export function SimpleStaggeredList({
  children,
  staggerDelay = 50,
  animation = 'fade',
  itemStyle,
  containerStyle,
}: SimpleStaggeredListProps) {
  const getEnteringAnimation = (index: number) => {
    const delay = index * staggerDelay;

    switch (animation) {
      case 'slide':
        return SlideInLeft.delay(delay).duration(300).springify();
      case 'scale':
        return ZoomIn.delay(delay).duration(300);
      case 'fade':
      default:
        return FadeIn.delay(delay).duration(300);
    }
  };

  return (
    <View style={containerStyle}>
      {React.Children.map(children, (child, index) => (
        <Animated.View
          key={index}
          entering={getEnteringAnimation(index)}
          layout={Layout.springify()}
          style={itemStyle}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}
