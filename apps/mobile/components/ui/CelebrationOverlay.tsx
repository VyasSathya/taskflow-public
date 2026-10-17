/**
 * CelebrationOverlay - Animated Celebration Component
 * Shows celebratory animations with emoji fallbacks
 *
 * Use for:
 * - Achievement unlocks
 * - Level completions
 * - Streak milestones
 * - Success moments
 *
 * Features:
 * - Multiple celebration types (confetti, success, trophy, fire, winner)
 * - Auto-hide with configurable delay
 * - Haptic feedback on show
 * - Emoji fallback if Lottie not available
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

import { tokens } from '@/lib/theme';

type CelebrationType = 'confetti' | 'success' | 'trophy' | 'fire' | 'winner' | 'star';

interface CelebrationOverlayProps {
  /** Whether to show the celebration */
  isVisible: boolean;
  /** Type of celebration animation */
  type?: CelebrationType;
  /** Main message to display */
  message?: string;
  /** Optional sub-message */
  subMessage?: string;
  /** Emoji size */
  size?: number;
  /** Auto-hide after showing */
  autoHide?: boolean;
  /** Auto-hide delay in ms */
  autoHideDelay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Primary color for styling */
  primaryColor?: string;
}

const CELEBRATION_EMOJI: Record<CelebrationType, string> = {
  confetti: '🎉',
  success: '✅',
  trophy: '🏆',
  fire: '🔥',
  winner: '🥇',
  star: '⭐',
};

const CELEBRATION_MESSAGES: Record<CelebrationType, string> = {
  confetti: 'Congratulations!',
  success: 'Success!',
  trophy: 'Achievement Unlocked!',
  fire: "You're on Fire!",
  winner: 'Winner!',
  star: 'Amazing!',
};

export function CelebrationOverlay({
  isVisible,
  type = 'confetti',
  message,
  subMessage,
  size = 80,
  autoHide = true,
  autoHideDelay = 3000,
  onComplete,
  primaryColor = '#8B5CF6',
}: CelebrationOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowOverlay(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      if (autoHide) {
        const timer = setTimeout(() => {
          hideOverlay();
        }, autoHideDelay);
        return () => clearTimeout(timer);
      }
    } else {
      hideOverlay();
    }
  }, [isVisible]);

  const hideOverlay = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOverlay(false);
      onComplete?.();
    });
  };

  if (!showOverlay) return null;

  const displayMessage = message || CELEBRATION_MESSAGES[type];
  const emoji = CELEBRATION_EMOJI[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.card, { borderColor: `${primaryColor}40` }]}>
        {/* Emoji */}
        <Text style={[styles.emoji, { fontSize: size }]}>{emoji}</Text>

        {/* Message */}
        <Text style={[styles.message, { color: primaryColor }]}>
          {displayMessage}
        </Text>

        {/* Sub-message */}
        {subMessage && (
          <Text style={styles.subMessage}>{subMessage}</Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Quick celebration trigger hook
 */
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    isVisible: boolean;
    type: CelebrationType;
    message?: string;
    subMessage?: string;
  }>({
    isVisible: false,
    type: 'confetti',
  });

  const celebrate = (
    type: CelebrationType = 'confetti',
    message?: string,
    subMessage?: string
  ) => {
    setCelebration({
      isVisible: true,
      type,
      message,
      subMessage,
    });
  };

  const hide = () => {
    setCelebration((prev) => ({ ...prev, isVisible: false }));
  };

  return {
    celebration,
    celebrate,
    hide,
    CelebrationComponent: () => (
      <CelebrationOverlay
        isVisible={celebration.isVisible}
        type={celebration.type}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onComplete={hide}
      />
    ),
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: tokens.borderRadius.xl,
    borderWidth: 1,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 300,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emoji: {
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: tokens.spacing.sm,
  },
});

export default CelebrationOverlay;
