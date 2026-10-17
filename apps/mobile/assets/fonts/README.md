# Fonts

Place custom font files here (.ttf, .otf).

## Setup

1. Add font files:
```
fonts/
├── Inter-Regular.ttf
├── Inter-Medium.ttf
├── Inter-SemiBold.ttf
└── Inter-Bold.ttf
```

2. Load fonts in `app/_layout.tsx`:
```tsx
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'Inter-Regular': require('@/assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('@/assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('@/assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
});
```

3. Use in styles:
```tsx
{ fontFamily: 'Inter-Medium' }
```

## Recommended Fonts

- [Inter](https://rsms.me/inter/) - Clean UI font
- [SF Pro](https://developer.apple.com/fonts/) - iOS native
- [Roboto](https://fonts.google.com/specimen/Roboto) - Android native
- [Poppins](https://fonts.google.com/specimen/Poppins) - Modern geometric
