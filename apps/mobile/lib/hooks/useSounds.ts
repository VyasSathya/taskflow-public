import { useCallback } from 'react';
import { soundService, SOUNDS } from '@/lib/services/soundService';
import { useAppStore } from '@/lib/stores';

export const useSounds = () => {
  const soundsEnabled = useAppStore((state) => state.soundsEnabled);

  const play = useCallback(
    async (key: keyof typeof SOUNDS, options?: { volume?: number }) => {
      if (!soundsEnabled) return;
      await soundService.play(key as string, options);
    },
    [soundsEnabled]
  );

  const stop = useCallback(async (key: keyof typeof SOUNDS) => {
    await soundService.stop(key as string);
  }, []);

  return { play, stop, isEnabled: soundsEnabled };
};

// Convenience hooks for common sound categories
export const useUISound = () => {
  const { play, isEnabled } = useSounds();

  return {
    isEnabled,
    playTap: () => play('tap' as keyof typeof SOUNDS),
    playSuccess: () => play('success' as keyof typeof SOUNDS),
    playError: () => play('error' as keyof typeof SOUNDS),
    playToggle: () => play('toggle' as keyof typeof SOUNDS),
  };
};

export const useRewardSound = () => {
  const { play, isEnabled } = useSounds();

  return {
    isEnabled,
    playCoin: () => play('coin' as keyof typeof SOUNDS),
    playLevelUp: () => play('levelUp' as keyof typeof SOUNDS),
    playAchievement: () => play('achievement' as keyof typeof SOUNDS),
  };
};
