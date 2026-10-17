import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView, { type AnimationObject } from 'lottie-react-native';

type LottieSource = string | AnimationObject | { uri: string };

interface LottieAnimationProps {
  source: LottieSource; // URL, require(), or JSON object
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  onComplete?: () => void;
  style?: ViewStyle;
  width?: number;
  height?: number;
}

export function LottieAnimation({
  source,
  autoPlay = true,
  loop = true,
  speed = 1,
  onComplete,
  style,
  width = 200,
  height = 200,
}: LottieAnimationProps) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      animationRef.current.play();
    }
  }, [autoPlay]);

  const handleAnimationFinish = (isCancelled: boolean) => {
    if (!isCancelled && onComplete) {
      onComplete();
    }
  };

  // Handle different source types
  const getSource = (): LottieSource => {
    if (typeof source === 'string') {
      // URL - need to handle remotely or it could be a require path
      return { uri: source };
    }
    // JSON object or require() result
    return source;
  };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <LottieView
        ref={animationRef}
        source={getSource()}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        onAnimationFinish={handleAnimationFinish}
        style={styles.animation}
      />
    </View>
  );
}

// Control methods exposed via ref
export interface LottieAnimationRef {
  play: () => void;
  pause: () => void;
  reset: () => void;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
