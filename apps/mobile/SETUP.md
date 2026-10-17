# New App Setup Checklist

Complete these steps when creating a new app from this template.

## Quick Start

```bash
# 1. Copy the template
cp -r expo-app-template my-new-app
cd my-new-app

# 2. Install dependencies
npm install

# 3. Create .env from example
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Initialize EAS (required for dev builds)
eas login
eas init

# 5. Build development client (one-time, ~10-15 min)
npm run build:dev
# Select iOS or All, install the build on your device

# 6. Run the app
npm run tunnel
```

## Development Build Workflow

This template uses **development builds** (not Expo Go) for full native module support.

### First-Time Setup
```bash
# Login to EAS
eas login

# Initialize project (creates EAS project + adds projectId to app.json)
eas init

# Build dev client (select platform when prompted)
npm run build:dev

# Install the .ipa/.apk on your device via QR code link
```

### Daily Development
```bash
# Start dev server (connects to your dev build app)
npm run tunnel

# Or for local network (faster, same WiFi required)
npm start
```

### Why Dev Builds?
- Full native module support (reanimated, worklets, etc.)
- No Expo Go version mismatches
- Same environment as production
- Required for expo-dev-client, custom native code

## Running Multiple Projects (Avoid Port Conflicts)

Ports are auto-selected with `--port 0` to avoid conflicts.

**Mobile App (Expo):**
```bash
npm run tunnel    # Auto-selects available port
npm start         # Auto-selects available port
```

**Website (Next.js):**
```bash
cd website
npm run dev           # Default port 3000
npm run dev -- -p 3001  # Or specify a port
```

---

## Included in This Template

| Folder | Description |
|--------|-------------|
| `app/` | Expo Router screens (tabs, auth) |
| `components/` | Reusable UI components & animations |
| `lib/` | Hooks, stores, services, theme, utils |
| `assets/` | Icons, images, sounds, Lottie animations |
| `supabase/` | **SQL scripts to set up your database** |
| `website/` | **Next.js landing page for your app** |
| `setup/` | Detailed setup guides for each service |

### Component Highlights

**UI Components:** Button, Card, Input, Avatar, Badge, Toast, BottomSheet, SkeletonLoader, GlassCard, SearchFilterBar, StatCard, StreakBadge, CelebrationOverlay, EmptyState, AnimatedProgressBar, AnimatedStepIndicator

**Animations:** Sparkles, Confetti, FireAnimation, HolographicShimmer, FadeIn, SlideIn, ScaleIn, PulseAnimation, LottieAnimation

**Haptics:** `hapticUI` (tap, selection), `hapticGame` (correct, wrong, reveal), `hapticProgress` (milestone, streak), `playVictory()`, `playCountdown()`

---

## 1. Supabase Setup (IMPORTANT)

### Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API

### Run Database Setup
1. Go to **SQL Editor** in your Supabase dashboard
2. Open `supabase/00-full-setup.sql` and run it
3. This creates all tables you need:
   - `profiles` - User profiles (auto-created on signup)
   - `config` - App settings/feature flags
   - `waitlist` - Pre-launch email collection
   - `invite_codes` - Referral system
   - `push_tokens` - Push notification tokens
   - `user_content` - User-generated content
   - `subscriptions` - RevenueCat subscription status

### Environment Variables
Copy `.env.example` to `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 2. Project Identity

### app.json
| Field | Change To | Example |
|-------|-----------|---------|
| `name` | Your app name | `"MyApp"` |
| `slug` | URL-friendly name | `"myapp"` |
| `scheme` | Deep link scheme | `"myapp"` |
| `ios.bundleIdentifier` | Apple bundle ID | `"com.yourname.myapp"` |
| `android.package` | Android package | `"com.yourname.myapp"` |

### package.json
| Field | Change To |
|-------|-----------|
| `name` | `"myapp"` |

---

## 3. Website Setup

Your app landing page is in the `website/` folder.

```bash
cd website
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

### Website Environment Variables
```env
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_SITE_URL=https://myapp.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@myapp.com
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/myapp/id123
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.myapp
NEXT_PUBLIC_APP_SCHEME=myapp
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Website Pages Included
- `/` - Landing page
- `/privacy` - Privacy policy
- `/terms` - Terms of service
- `/delete-account` - Account deletion (required for App Store)
- `/invite/[code]` - Invite deep link handler
- `/join/[code]` - Group join deep link handler

---

## 4. EAS Build Setup

```bash
# Install EAS CLI globally (if not already)
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize project (links to EAS, adds projectId)
eas init

# Build development client (REQUIRED for this template)
npm run build:dev

# Build for TestFlight/internal testing
npm run build:preview

# Build for App Store/Play Store release
npm run build:prod
```

Build profiles in `eas.json`:
- `development` - Dev client for local development (required first!)
- `preview` - Internal testing builds (TestFlight/APK)
- `production` - App store release builds

---

## 5. Assets

### Required
| File | Location | Size |
|------|----------|------|
| App icon | `assets/icon.png` | 1024x1024 |
| Splash screen | `assets/splash.png` | 1284x2778 |
| Adaptive icon | `assets/adaptive-icon.png` | 1024x1024 |
| Favicon | `assets/favicon.png` | 48x48 |

### Website Assets
| File | Location | Size |
|------|----------|------|
| OG Image | `website/public/og-image.png` | 1200x630 |
| Favicon | `website/public/favicon.ico` | Any |
| App Screenshot | `website/public/screenshot.png` | Phone mockup |

---

## 6. Theme Customization

### Mobile App Colors
Edit `lib/theme/themes.ts`:
```typescript
primary: '#YOUR_BRAND_COLOR',
primaryLight: '#LIGHTER_VERSION',
primaryDark: '#DARKER_VERSION',
```

### Website Colors
Edit `website/src/app/globals.css`:
```css
:root {
  --primary: #YOUR_BRAND_COLOR;
  --secondary: #ACCENT_COLOR;
}
```

---

## Detailed Setup Guides

See the [setup/](./setup/) folder for comprehensive step-by-step instructions:
- [Supabase Setup](./setup/01-SUPABASE.md) - Auth, database, social login
- [EAS Build Setup](./setup/02-EAS-BUILD.md) - App store builds
- [Sentry Setup](./setup/03-SENTRY.md) - Error tracking
- [PostHog Setup](./setup/04-POSTHOG.md) - Analytics & feature flags
- [Push Notifications](./setup/05-PUSH-NOTIFICATIONS.md) - Push & local notifications
- [RevenueCat Setup](./setup/06-REVENUECAT.md) - In-app purchases

---

## File Reference

| What | File |
|------|------|
| App config | `app.json` |
| Environment vars | `.env` |
| Supabase client | `lib/supabase/client.ts` |
| Auth logic | `lib/stores/auth-store.ts` |
| Theme colors | `lib/theme/themes.ts` |
| API services | `lib/services/api.ts` |
| Analytics | `lib/services/analytics.ts` |
| Error reporting | `lib/services/errorReporting.ts` |
| Tab screens | `app/(tabs)/` |
| Auth screens | `app/(auth)/` |
| **Database SQL** | `supabase/` |
| **Landing Page** | `website/` |

---

## Master Checklist

### Mobile App
- [ ] Updated `app.json` (name, slug, scheme, bundle IDs)
- [ ] Updated `package.json` name
- [ ] Created Supabase project
- [ ] Ran `supabase/00-full-setup.sql`
- [ ] Added `.env` with Supabase credentials
- [ ] Ran `eas login` and `eas init`
- [ ] Built dev client with `npm run build:dev`
- [ ] Installed dev build on device
- [ ] Replaced `assets/icon.png`
- [ ] Replaced `assets/splash.png`
- [ ] Customized theme colors
- [ ] Tested auth flow

### Website
- [ ] Updated `website/.env.local`
- [ ] Customized hero text and features
- [ ] Updated legal pages with real policies
- [ ] Added OG image and favicon
- [ ] Deployed to Vercel/Netlify

### Optional
- [ ] Added Sentry error tracking
- [ ] Added PostHog analytics
- [ ] Set up RevenueCat for subscriptions
- [ ] Configured push notifications
