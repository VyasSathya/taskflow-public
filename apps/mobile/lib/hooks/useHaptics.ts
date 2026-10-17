import { useCallback } from 'react';
import { haptics, HapticType, triggerHaptic } from '@/lib/utils/haptics';
import { useAppStore } from '@/lib/stores';

export const useHaptics = () => {
  const hapticsEnabled = useAppStore((state) => state.hapticsEnabled);

  const trigger = useCallback(
    async (type: HapticType) => {
      if (!hapticsEnabled) return;
      await triggerHaptic(type);
    },
    [hapticsEnabled]
  );

  return {
    trigger,
    isEnabled: hapticsEnabled,
    // Convenience methods
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    selection: () => trigger('selection'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
  };
};

// Hook for common interaction patterns
export const useInteractionFeedback = () => {
  const haptics = useHaptics();
  const sounds = useAppStore((state) => state.soundsEnabled);

  return {
    onButtonPress: async () => {
      await haptics.light();
    },
    onToggle: async () => {
      await haptics.selection();
    },
    onSuccess: async () => {
      await haptics.success();
    },
    onError: async () => {
      await haptics.error();
    },
    onWarning: async () => {
      await haptics.warning();
    },
  };
};
