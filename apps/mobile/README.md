# Expo App Template

A comprehensive Expo template with authentication, theming, animations, and all the infrastructure you need to build production-ready mobile apps.

## Before You Build

**Don't skip validation.** Most apps fail because they solve problems nobody has.

| Step | Doc | Purpose |
|------|-----|---------|
| 1 | [VALIDATE_FIRST.md](./VALIDATE_FIRST.md) | PMF checklist - do this first |
| 2 | [PREFLIGHT.md](./PREFLIGHT.md) | Technical setup (accounts, Supabase, EAS) |
| 3 | [SETUP.md](./SETUP.md) | Daily development |

Full validation playbook: [docs/PMF_PLAYBOOK.md](./docs/PMF_PLAYBOOK.md)

**AI assistants:** Start with [START_HERE.md](./START_HERE.md) for setup, [CLAUDE.md](./CLAUDE.md) for component reference.

## Features

- **Expo SDK 54** with Expo Router
- **TypeScript** with strict mode
- **Supabase** for auth, database, and storage
- **OAuth** - Apple + Google Sign In ready
- **Zustand** for state management
- **TanStack Query** for server state
- **6 Themes** (light, dark, ocean, forest, sunset, midnight)
- **Animations** (Reanimated, Lottie, Confetti, Sparkles, Fire, HolographicShimmer)
- **Haptics & Sounds** built-in with contextual patterns (UI, Game, Session, Progress)
- **Gamification** (StreakBadge, CelebrationOverlay, FireAnimation)
- **Premium UI** (GlassCard, AnimatedProgressBar, SearchFilterBar, StatCard, EmptyState)
- **EAS Build** configured

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development
npm start
```

## Project Structure

```
app/                  # Expo Router screens
├── (auth)/           # Auth screens (login, signup)
├── (tabs)/           # Main tab screens
├── setup-wizard.tsx  # Onboarding wizard
└── _layout.tsx       # Root layout

components/
├── ui/               # Reusable UI components
│   ├── Button, Card, Input, Avatar, Badge
│   ├── GlassCard, SearchFilterBar, StatCard
│   ├── StreakBadge, CelebrationOverlay, EmptyState
│   ├── AnimatedProgressBar, AnimatedStepIndicator
│   └── Toast, BottomSheet, SkeletonLoader
├── animations/       # Animation components
│   ├── Sparkles, Confetti, FireAnimation
│   ├── HolographicShimmer, FadeIn, SlideIn
│   └── ScaleIn, PulseAnimation, LottieAnimation
└── common/           # Common utilities
    ├── ErrorBoundary, LoadingScreen
    └── SafeAreaWrapper, ToastProvider

lib/
├── supabase/         # Supabase client & types
├── stores/           # Zustand stores
├── hooks/            # Custom hooks
├── services/         # App services
├── theme/            # Themes & tokens
└── utils/            # Utility functions
```

## Component Highlights

### UI Components
```tsx
import { GlassCard, StatCard, StreakBadge, SearchFilterBar } from '@/components/ui';

// Glassmorphism card
<GlassCard primaryColor="#8B5CF6">
  <Text>Premium content</Text>
</GlassCard>

// Stats display
<StatCard value={1234} label="Users" trend="up" trendValue="+12%" />

// Gamification streak
<StreakBadge streak={7} label="day streak" />

// Search with filters
<SearchFilterBar
  searchValue={query}
  onSearchChange={setQuery}
  filters={[{ id: 'all', label: 'All' }]}
/>
```

### Animations
```tsx
import { FireAnimation, HolographicShimmer, Sparkles } from '@/components/animations';
import { CelebrationOverlay, useCelebration } from '@/components/ui';

// Fire effect for streaks
<FireAnimation size={24} intensity={2} />

// Celebration on achievement
const { celebrate, CelebrationComponent } = useCelebration();
celebrate('trophy', 'Achievement Unlocked!');
```

### Haptics (Contextual Patterns)
```tsx
import { hapticUI, hapticGame, hapticProgress, playVictory } from '@/lib/utils/haptics';

hapticUI.tap();           // Button press
hapticGame.correct();     // Correct answer
hapticProgress.milestone(); // Streak milestone
playVictory();            // Victory celebration
```

## Configuration

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
EXPO_PUBLIC_POSTHOG_KEY=your-posthog-key
```

### Customize

1. Update `app.json` with your app name and bundle IDs
2. Update `eas.json` with your EAS project ID
3. Configure your Supabase project

## Building

```bash
# Development build
npm run build:dev

# Preview build
npm run build:preview

# Production build
npm run build:prod
```

## Direct Device Deployment (No EAS Required)

Build and install directly to your connected device - faster iteration without cloud builds.

### Prerequisites

#### macOS (iOS builds)
- Xcode with Command Line Tools
- CocoaPods (`brew install cocoapods`)
- Apple Developer account (free works for development)

#### All platforms (Android builds)
- **ADB**: Install via:
  - macOS: `brew install android-platform-tools`
  - Windows: [Download SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
  - Linux: `sudo apt install adb`
- **Java 17**:
  - macOS: `brew install openjdk@17`
  - Windows/Linux: [Download OpenJDK](https://adoptium.net/)
- **Android SDK**:
  - macOS: `brew install --cask android-commandlinetools`
  - Then run: `sdkmanager "platforms;android-34" "build-tools;34.0.0"`

### iOS Deployment

```bash
# Connect iPhone via USB, then:
pnpm ios
```

This will:
1. Find connected device
2. Install CocoaPods
3. Build with xcodebuild
4. Install to device via `devicectl`

### Android Deployment

#### USB Connection
```bash
# Enable USB Debugging on phone, connect via USB, then:
pnpm android
```

#### Wireless Connection (Android 11+)
```bash
# One-time pairing:
pnpm android:pair
# Enter IP:Port and pairing code from phone

# Connect each session:
pnpm android:connect
# Enter IP:Port from Wireless Debugging screen

# Then build and install:
pnpm android
```

### Configuration for New Projects

After cloning this template, update these files:

1. **scripts/build-device.js** - Update these constants:
   ```javascript
   const APP_NAME = 'YourAppName';
   const WORKSPACE_NAME = 'YourAppName';
   const TEAM_ID = 'YOUR_TEAM_ID';  // Apple Developer Team ID
   ```

2. **scripts/build-device-android.js** - Update these constants:
   ```javascript
   const APP_NAME = 'YourAppName';
   const PACKAGE_NAME = 'com.yourcompany.yourapp';  // From app.json
   ```

3. **android/local.properties** - Create with your SDK path:
   ```properties
   # macOS (Homebrew)
   sdk.dir=/opt/homebrew/share/android-commandlinetools

   # macOS (Android Studio)
   sdk.dir=/Users/YOU/Library/Android/sdk

   # Windows
   sdk.dir=C:\\Users\\YOU\\AppData\\Local\\Android\\Sdk

   # Linux
   sdk.dir=/home/YOU/Android/Sdk
   ```

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm ios` | Build & install iOS to connected iPhone |
| `pnpm android` | Build & install Android to connected device |
| `pnpm android:pair` | Pair new wireless Android device (one-time) |
| `pnpm android:connect` | Connect to paired Android device |
| `pnpm device` | Alias for `pnpm ios` |
| `pnpm device:android` | Alias for `pnpm android` |

## License

MIT
