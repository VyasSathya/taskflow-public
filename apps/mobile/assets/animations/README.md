# Animations

Lottie animation files for common UI states.

## Included Animations

| File | Purpose | Loop |
|------|---------|------|
| `loading.json` | Loading spinner | Yes |
| `success.json` | Success checkmark | No |
| `error.json` | Error/failure X | No |
| `empty.json` | Empty state box | Yes |

## Usage

```tsx
import { LottieAnimation } from '@/components/animations';

// Loading
<LottieAnimation
  source={require('@/assets/animations/loading.json')}
  width={100}
  height={100}
/>

// Success (with callback)
<LottieAnimation
  source={require('@/assets/animations/success.json')}
  loop={false}
  onComplete={() => navigation.goBack()}
/>
```

## Adding More Animations

Download free animations from:
- [LottieFiles](https://lottiefiles.com/) - Huge free library
- [IconScout Lottie](https://iconscout.com/lottie-animations)
- [Lordicon](https://lordicon.com/) - Animated icons

### Recommended Additions

```
animations/
├── confetti.json      # Celebration
├── heart.json         # Like animation
├── upload.json        # Upload progress
├── onboarding/
│   ├── welcome.json
│   └── complete.json
└── features/          # App-specific
```

## Tips

- Keep files under 50KB for performance
- Use LottieFiles optimizer to reduce size
- Avoid complex gradients/effects
- Test on low-end devices
