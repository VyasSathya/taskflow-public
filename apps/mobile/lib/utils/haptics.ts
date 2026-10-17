/**
 * Haptic Feedback Utility
 *
 * Centralized haptic feedback system with contextual patterns
 * Organized by use case: UI, Game, Session, Progress
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ==================== BASIC HAPTICS ====================

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export type HapticType = keyof typeof haptics;

export const triggerHaptic = async (type: HapticType): Promise<void> => {
  try {
    await haptics[type]();
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

// ==================== UI INTERACTION HAPTICS ====================

/**
 * UI Interaction Haptics
 * Light, quick feedback for common interactions
 */
export const hapticUI = {
  /** Button tap */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Selection change (toggle, switch) */
  selection: () => Haptics.selectionAsync(),
  /** Card flip or swipe */
  swipe: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Menu item selection */
  menuSelect: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Pull to refresh */
  refresh: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
};

// ==================== GAME ACTION HAPTICS ====================

/**
 * Game Action Haptics
 * Medium to heavy feedback for game events
 */
export const hapticGame = {
  /** Roll dice, spin wheel - start */
  rollStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  /** Roll/spin complete */
  rollEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Timer tick (last 5 seconds) */
  timerTick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Timer warning (30s remaining) */
  timerWarning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  /** Timer danger (10s remaining) */
  timerDanger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Time's up! */
  timerEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  /** Player votes/selects */
  vote: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Reveal answer/result */
  reveal: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  /** Round complete */
  roundComplete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Game complete - triple pulse */
  gameComplete: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  /** Score increase */
  scoreUp: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Wrong answer */
  wrong: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  /** Correct answer */
  correct: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

// ==================== SESSION HAPTICS ====================

/**
 * Session Haptics
 * Feedback for multiplayer/connection events
 */
export const hapticSession = {
  /** Player joined */
  playerJoined: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Player left */
  playerLeft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Session started */
  sessionStart: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Received message/notification */
  notification: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Connection established */
  connected: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Connection lost */
  disconnected: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

// ==================== PROGRESS HAPTICS ====================

/**
 * Progress/Streak Haptics
 * For gamification elements
 */
export const hapticProgress = {
  /** Low intensity (streak 1-2) */
  low: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Medium intensity (streak 3-6) */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** High intensity (streak 7+) - double pulse */
  high: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(80);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  /** Milestone reached */
  milestone: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(100);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};

// ==================== UTILITY FUNCTIONS ====================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if haptics are available
 */
export function isHapticsAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Custom haptic pattern builder
 */
export async function playPattern(
  pattern: Array<{
    type: 'impact' | 'notification' | 'selection';
    style?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType;
    delay?: number;
  }>
): Promise<void> {
  for (const step of pattern) {
    switch (step.type) {
      case 'impact':
        await Haptics.impactAsync(step.style as Haptics.ImpactFeedbackStyle);
        break;
      case 'notification':
        await Haptics.notificationAsync(step.style as Haptics.NotificationFeedbackType);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
    if (step.delay) {
      await delay(step.delay);
    }
  }
}

/**
 * Countdown haptic pattern
 */
export async function playCountdown(seconds: number = 3): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    await Haptics.impactAsync(
      i === 1
        ? Haptics.ImpactFeedbackStyle.Heavy
        : i === 2
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    if (i > 1) await delay(1000);
  }
}

/**
 * Victory celebration pattern
 */
export async function playVictory(): Promise<void> {
  await playPattern([
    { type: 'impact', style: Haptics.ImpactFeedbackStyle.Heavy },
    { type: 'impact', style: Haptics.ImpactFeedbackStyle.Light, delay: 100 },
    { type: 'impact', style: Haptics.ImpactFeedbackStyle.Medium, delay: 100 },
    { type: 'notification', style: Haptics.NotificationFeedbackType.Success, delay: 150 },
  ]);
}

/**
 * Settings-aware haptic trigger factory
 */
export function createHapticTrigger(enabled: boolean) {
  const noop = () => Promise.resolve();
  const noopGroup = <T extends Record<string, (...args: any[]) => any>>(obj: T): T => {
    const result = {} as T;
    for (const key in obj) {
      result[key] = noop as any;
    }
    return result;
  };

  return {
    basic: enabled ? haptics : noopGroup(haptics),
    ui: enabled ? hapticUI : noopGroup(hapticUI),
    game: enabled ? hapticGame : noopGroup(hapticGame),
    session: enabled ? hapticSession : noopGroup(hapticSession),
    progress: enabled ? hapticProgress : noopGroup(hapticProgress),
  };
}
