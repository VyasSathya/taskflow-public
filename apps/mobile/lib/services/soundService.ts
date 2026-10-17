import { Audio } from 'expo-av';

type SoundKey = string;

class SoundService {
  private sounds: Map<SoundKey, Audio.Sound> = new Map();
  private enabled: boolean = true;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.initialized = true;
    } catch (error) {
      console.error('Sound service init error:', error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async preload(soundMap: Record<SoundKey, number>): Promise<void> {
    await this.init();

    for (const [key, source] of Object.entries(soundMap)) {
      try {
        const { sound } = await Audio.Sound.createAsync(source);
        this.sounds.set(key, sound);
      } catch (error) {
        console.error(`Failed to preload sound ${key}:`, error);
      }
    }
  }

  async play(key: SoundKey, options?: { volume?: number }): Promise<void> {
    if (!this.enabled) return;

    const sound = this.sounds.get(key);
    if (!sound) {
      console.warn(`Sound ${key} not found`);
      return;
    }

    try {
      await sound.setPositionAsync(0);
      if (options?.volume !== undefined) {
        await sound.setVolumeAsync(options.volume);
      }
      await sound.playAsync();
    } catch (error) {
      console.error(`Failed to play sound ${key}:`, error);
    }
  }

  async stop(key: SoundKey): Promise<void> {
    const sound = this.sounds.get(key);
    if (!sound) return;

    try {
      await sound.stopAsync();
    } catch (error) {
      console.error(`Failed to stop sound ${key}:`, error);
    }
  }

  async playOneShot(source: number, options?: { volume?: number }): Promise<void> {
    if (!this.enabled) return;

    try {
      const { sound } = await Audio.Sound.createAsync(source);
      if (options?.volume !== undefined) {
        await sound.setVolumeAsync(options.volume);
      }
      await sound.playAsync();

      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Failed to play one-shot sound:', error);
    }
  }

  async unloadAll(): Promise<void> {
    for (const sound of this.sounds.values()) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.error('Failed to unload sound:', error);
      }
    }
    this.sounds.clear();
  }
}

export const soundService = new SoundService();

// Sound registry - add your sounds here
//
// RECOMMENDED SOUND FILES (add to assets/sounds/):
// ┌────────────────┬─────────────────────────────────────────────────┐
// │ File           │ Purpose                                         │
// ├────────────────┼─────────────────────────────────────────────────┤
// │ tap.mp3        │ Button taps, selections (soft click)            │
// │ success.mp3    │ Task complete, uploads done (chime)             │
// │ error.mp3      │ Errors, validation failures (negative tone)     │
// │ toggle.mp3     │ Switch toggles (soft pop)                       │
// │ notification.mp3│ Alerts, info messages                          │
// └────────────────┴─────────────────────────────────────────────────┘
//
// Free sound sources:
// - https://freesound.org (search: UI, click, notification)
// - https://mixkit.co/free-sound-effects/
// - https://notificationsounds.com
//
// Once files are added, uncomment and add to SOUNDS object:

export const SOUNDS: Record<string, number> = {
  // tap: require('@/assets/sounds/tap.mp3'),
  // success: require('@/assets/sounds/success.mp3'),
  // error: require('@/assets/sounds/error.mp3'),
  // toggle: require('@/assets/sounds/toggle.mp3'),
  // notification: require('@/assets/sounds/notification.mp3'),
};

export const preloadSounds = async (): Promise<void> => {
  await soundService.preload(SOUNDS);
};
