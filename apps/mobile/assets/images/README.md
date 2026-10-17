# Images

Place image assets here.

## Structure

```
images/
├── icon.png              # App icon (1024x1024)
├── adaptive-icon.png     # Android adaptive (1024x1024)
├── splash-icon.png       # Splash screen icon
├── favicon.png           # Web favicon
├── notification-icon.png # Push notification icon
├── logo/
│   ├── logo.png
│   ├── logo-dark.png
│   └── logo-icon.png
├── onboarding/
│   ├── step-1.png
│   ├── step-2.png
│   └── step-3.png
└── placeholders/
    ├── avatar.png
    └── empty-state.png
```

## Guidelines

- **App Icon**: 1024x1024, no transparency
- **Adaptive Icon**: 1024x1024, transparent bg, content in center 66%
- **Use @2x/@3x**: For resolution scaling
- **Optimize**: Use TinyPNG or similar

## Usage

```tsx
import { Image } from 'react-native';

<Image source={require('@/assets/images/logo/logo.png')} />
```
