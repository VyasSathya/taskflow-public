# Sounds

Place your sound effect files here (.mp3, .wav).

## Recommended Categories

```
sounds/
├── ui/           # Interface sounds
│   ├── tap.mp3
│   ├── success.mp3
│   ├── error.mp3
│   └── toggle.mp3
├── rewards/      # Achievement sounds
│   ├── coin.mp3
│   ├── level-up.mp3
│   └── achievement.mp3
└── notifications/
    ├── pop.mp3
    └── chime.mp3
```

## Usage

1. Add sound files to this folder
2. Register them in `lib/services/soundService.ts`:

```typescript
export const SOUNDS = {
  tap: require('@/assets/sounds/ui/tap.mp3'),
  success: require('@/assets/sounds/ui/success.mp3'),
  // ...
};
```

3. Preload in your app initialization
4. Use via `useSounds()` hook

## Resources

- [Freesound.org](https://freesound.org/) - Free sound effects
- [Zapsplat](https://www.zapsplat.com/) - Free SFX library
- [UI sounds](https://www.soundsnap.com/tags/ui) - Interface sounds
