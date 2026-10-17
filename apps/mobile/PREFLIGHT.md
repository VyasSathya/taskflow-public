# Pre-Flight Checklist

Run through this checklist before starting development to ensure everything is set up correctly.

> **Did you validate first?** Complete [VALIDATE_FIRST.md](./VALIDATE_FIRST.md) before this technical setup. Don't build something nobody wants.

---

## Phase 1: Accounts Needed

### Required Accounts
| Service | Purpose | Cost | Sign Up |
|---------|---------|------|---------|
| **Expo** | Build & deploy | Free | [expo.dev](https://expo.dev) |
| **Supabase** | Database & Auth | Free tier | [supabase.com](https://supabase.com) |

### Required for Publishing
| Service | Purpose | Cost | Sign Up |
|---------|---------|------|---------|
| **Apple Developer** | iOS apps | $99/year | [developer.apple.com](https://developer.apple.com) |
| **Google Play Console** | Android apps | $25 one-time | [play.google.com/console](https://play.google.com/console) |

### Optional Services
| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| Sentry | Error tracking | 5K errors/mo | [sentry.io](https://sentry.io) |
| PostHog | Analytics | 1M events/mo | [posthog.com](https://posthog.com) |
| RevenueCat | In-app purchases | Free | [revenuecat.com](https://revenuecat.com) |

---

## Phase 2: Supabase Setup

### 2.1 Create Project
- [ ] Go to [supabase.com](https://supabase.com) → New Project
- [ ] Choose organization (or create one)
- [ ] Set project name (e.g., "myapp-prod")
- [ ] Set database password (save this!)
- [ ] Select region closest to your users
- [ ] Wait for project to provision (~2 minutes)

### 2.2 Get Credentials
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL** (starts with https://)
- [ ] Copy **anon/public key** (starts with eyJ)
- [ ] ⚠️ Never use service_role key in client code!

### 2.3 Run Database Setup
- [ ] Go to **SQL Editor** in Supabase dashboard
- [ ] Open `supabase/00-full-setup.sql` from this project
- [ ] Paste contents into SQL Editor
- [ ] Click **Run** (creates all 7 tables)

**Tables created:**
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (auto-created on signup) |
| `config` | App settings & feature flags |
| `waitlist` | Pre-launch email collection |
| `invite_codes` | Referral system |
| `push_tokens` | Push notification tokens |
| `user_content` | User-generated content |
| `subscriptions` | RevenueCat subscription status |

### 2.4 Configure Auth Providers
- [ ] Go to **Authentication → Providers**
- [ ] **Email** - Enabled by default
- [ ] **Google** (optional):
  - Create OAuth app in Google Cloud Console
  - Add Client ID and Secret
  - Add redirect URL: `https://[project-id].supabase.co/auth/v1/callback`
- [ ] **Apple** (optional):
  - Create Service ID in Apple Developer
  - Add Service ID and Secret Key
  - Add redirect URL: `https://[project-id].supabase.co/auth/v1/callback`

### 2.5 Set Redirect URLs
- [ ] Go to **Authentication → URL Configuration**
- [ ] Add to **Redirect URLs**:
  ```
  myapp://auth/callback
  exp://192.168.x.x:xxxx/--/auth/callback
  ```
  (Replace `myapp` with your app scheme)

---

## Phase 3: EAS Build Setup

### 3.1 Install & Login
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login
```

### 3.2 Initialize Project
```bash
# Creates EAS project & adds projectId to app.json
eas init
```

### 3.3 Build Development Client
```bash
# Build dev client (select platform when prompted)
npm run build:dev
```
- Takes 10-15 minutes
- Install on device via QR code from EAS dashboard

---

## Phase 4: Environment Variables

### 4.1 Create .env File
```bash
cp .env.example .env
```

### 4.2 Fill Required Values
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4.3 Update eas.json (for builds)
Add same credentials to eas.json under each build profile's `env` section:
```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

---

## Phase 5: App Identity

### 5.1 Update app.json
| Field | Example | Notes |
|-------|---------|-------|
| `expo.name` | "MyApp" | Display name |
| `expo.slug` | "my-app" | URL-friendly, lowercase |
| `expo.scheme` | "myapp" | Deep links, no spaces |
| `expo.ios.bundleIdentifier` | "com.company.myapp" | Unique iOS ID |
| `expo.android.package` | "com.company.myapp" | Unique Android ID |

### 5.2 Update package.json
```json
{
  "name": "my-app"
}
```

### 5.3 Update config/constants.ts
```typescript
export const APP_CONFIG = {
  name: 'MyApp',
  scheme: 'myapp',
  version: '1.0.0',
};
```

---

## Phase 6: Assets

### Required Assets
| File | Size | Tool |
|------|------|------|
| `assets/icon.png` | 1024x1024 | [Figma](https://figma.com), [Canva](https://canva.com) |
| `assets/splash-icon.png` | 1024x1024 | Same as icon or custom |
| `assets/adaptive-icon.png` | 1024x1024 | Transparent background |
| `assets/favicon.png` | 48x48 | Scaled down icon |

### Theme Colors
Edit `lib/theme/themes.ts`:
```typescript
primary: '#6366F1',      // Your brand color
primaryLight: '#818CF8', // Lighter variant
primaryDark: '#4F46E5',  // Darker variant
```

Also update `app.json`:
```json
{
  "splash": { "backgroundColor": "#6366F1" },
  "android": { "adaptiveIcon": { "backgroundColor": "#6366F1" } }
}
```

---

## Phase 7: Test Your Setup

### 7.1 Start Development Server
```bash
npm run tunnel
```

### 7.2 Test Auth Flow
- [ ] Open app on device
- [ ] Sign up with email
- [ ] Check Supabase **Authentication → Users**
- [ ] Check Supabase **Table Editor → profiles**

### 7.3 Common Issues
| Issue | Fix |
|-------|-----|
| "supabaseUrl is required" | Check .env has valid URL |
| Auth callback fails | Check redirect URLs in Supabase |
| Can't connect to server | Use `npm run tunnel` |
| Worklets version mismatch | Use dev build, not Expo Go |

---

## Phase 8: Optional Services

### Sentry (Error Tracking)
See `setup/03-SENTRY.md`
```bash
npx expo install @sentry/react-native
```

### PostHog (Analytics)
See `setup/04-POSTHOG.md`
```bash
npx expo install posthog-react-native
```

### Push Notifications
See `setup/05-PUSH-NOTIFICATIONS.md`
- Already configured in app.json
- Requires physical device

### RevenueCat (In-App Purchases)
See `setup/06-REVENUECAT.md`
```bash
npx expo install react-native-purchases react-native-purchases-ui
```
⚠️ Requires development build (not Expo Go)

---

## Phase 9: Website Setup (Optional)

### 9.1 Install Dependencies
```bash
cd website
npm install
```

### 9.2 Create Environment
```bash
cp .env.example .env.local
```

### 9.3 Fill Values
```env
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_SITE_URL=https://myapp.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@myapp.com
NEXT_PUBLIC_APP_SCHEME=myapp
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 9.4 Customize Content
| File | What to Update |
|------|----------------|
| `src/components/Hero.tsx` | Headline, description |
| `src/components/Features.tsx` | Feature list |
| `src/app/privacy/page.tsx` | Privacy policy |
| `src/app/terms/page.tsx` | Terms of service |
| `src/app/delete-account/page.tsx` | Account deletion |

### 9.5 Replace Assets
| File | Size |
|------|------|
| `public/og-image.png` | 1200x630 |
| `public/favicon.ico` | Any |

### 9.6 Run Locally
```bash
npm run dev
```

---

## Phase 10: Pre-Publish Checklist

### Before TestFlight/Internal Testing
- [ ] All environment variables set
- [ ] App icon and splash screen replaced
- [ ] Bundle ID is unique and owned by you
- [ ] Preview build works: `npm run build:preview`
- [ ] Auth flow tested on physical device

### Before App Store Release
- [ ] Privacy policy URL live (required)
- [ ] Terms of service URL live
- [ ] Account deletion page live (App Store requirement)
- [ ] App screenshots ready
- [ ] App Store Connect listing complete
- [ ] Google Play Console listing complete
- [ ] Production build: `npm run build:prod`

---

## Quick Reference

### Build Commands
```bash
npm run build:dev      # Development client
npm run build:preview  # Internal testing
npm run build:prod     # App store release
```

### Run Commands
```bash
npm start      # Local network
npm run tunnel # Tunnel (for devices on different networks)
```

### Key Files
| Purpose | File |
|---------|------|
| App config | `app.json` |
| Build config | `eas.json` |
| Environment | `.env` |
| Constants | `config/constants.ts` |
| Theme | `lib/theme/themes.ts` |
| Auth | `lib/stores/auth-store.ts` |
| Database | `supabase/00-full-setup.sql` |
