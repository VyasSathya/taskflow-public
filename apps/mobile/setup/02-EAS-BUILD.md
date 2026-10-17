# EAS Build Setup Guide

Complete guide for building and deploying your Expo app to app stores using EAS (Expo Application Services).

**Official Docs:**
- [EAS Build Introduction](https://docs.expo.dev/build/introduction/)
- [Create Your First Build](https://docs.expo.dev/build/setup/)
- [EAS Tutorial](https://docs.expo.dev/tutorial/eas/introduction/)

---

## Prerequisites

### Developer Accounts (Required for Store Distribution)

| Platform | Requirement | Cost | Link |
|----------|-------------|------|------|
| **Android** | Google Play Developer | $25 one-time | [play.google.com/console](https://play.google.com/console) |
| **iOS** | Apple Developer Program | $99/year | [developer.apple.com](https://developer.apple.com) |

You can build apps without these, but you won't be able to publish to stores.

### Expo Account
1. Go to [expo.dev](https://expo.dev)
2. Sign up for free account
3. You'll need this for EAS services

---

## Step 1: Install EAS CLI

### 1.1 Global Installation
```bash
npm install -g eas-cli
```

Or use without installing:
```bash
npx eas-cli@latest
```

### 1.2 Verify Installation
```bash
eas --version
```

---

## Step 2: Log In to Expo

### 2.1 Login
```bash
eas login
```
Enter your Expo account email and password.

### 2.2 Verify Login
```bash
eas whoami
```
Should display your username.

---

## Step 3: Configure Your Project

### 3.1 Link to Expo Project
```bash
eas init
```

This will:
- Create/link your project on expo.dev
- Add `extra.eas.projectId` to your `app.json`

### 3.2 Configure Build Profiles
```bash
eas build:configure
```

This creates `eas.json` if it doesn't exist. The template already includes a configured `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Step 4: Update app.json Identifiers

Before building, update these in `app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1
    }
  }
}
```

**Important:** Once published, you cannot change `bundleIdentifier` or `package`.

---

## Step 5: Build Types Explained

### Development Build
- For development/testing
- Includes dev tools and debugging
- Can connect to local dev server
- Best for: Daily development

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### Preview Build
- For internal testing
- No dev tools, closer to production
- Distributed via link or QR code
- Best for: Team testing, QA

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### Production Build
- For app store submission
- Fully optimized
- Signed with production credentials
- Best for: App store release

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

---

## Step 6: Build for Android

### 6.1 First Android Build
```bash
eas build --profile preview --platform android
```

EAS will ask:
- **Generate new Keystore?** → Yes (EAS manages it for you)

### 6.2 Build Output
- **Preview**: APK file (installable directly)
- **Production**: AAB file (for Play Store)

### 6.3 Install Preview Build
1. Build completes → Get download link
2. Open link on Android device
3. Allow installation from unknown sources
4. Install and test

---

## Step 7: Build for iOS

### 7.1 Prerequisites
- Apple Developer account ($99/year)
- macOS NOT required (EAS builds in cloud)

### 7.2 First iOS Build
```bash
eas build --profile preview --platform ios
```

EAS will ask:
- **Log in to Apple Developer account** → Enter Apple ID credentials
- **Select team** → Choose your developer team
- **Generate credentials?** → Yes (EAS manages provisioning profiles)

### 7.3 Build Output
- **Preview**: IPA (for TestFlight internal testing)
- **Production**: IPA (for App Store submission)

### 7.4 Install Preview Build
1. Build completes → Get QR code or link
2. Scan with iPhone camera
3. Follow prompts to install

**Note:** iOS preview builds require registering device UDIDs. EAS handles this automatically.

---

## Step 8: Submit to App Stores

### 8.1 Submit to Google Play
```bash
eas submit --platform android
```

First time setup:
1. Create app in [Google Play Console](https://play.google.com/console)
2. Go to **Setup** → **API access**
3. Create service account with "Release manager" permissions
4. Download JSON key file
5. EAS will prompt for this file path

### 8.2 Submit to Apple App Store
```bash
eas submit --platform ios
```

First time setup:
1. Create app in [App Store Connect](https://appstoreconnect.apple.com)
2. EAS will use your saved Apple credentials

---

## Step 9: Environment Variables in EAS

### 9.1 Add Secrets (Sensitive Data)
For API keys that shouldn't be in code:

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value "your-token"
eas secret:create --name MY_API_KEY --value "secret-value"
```

### 9.2 Using Secrets in Build
In `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "MY_API_KEY": "@MY_API_KEY"
      }
    }
  }
}
```

### 9.3 List Secrets
```bash
eas secret:list
```

---

## Step 10: Automate Builds (Optional)

### 10.1 GitHub Actions Integration
EAS can auto-build on git push:

1. Go to [expo.dev](https://expo.dev) → Your project → **Settings** → **GitHub**
2. Connect your repository
3. Configure build triggers:
   - Push to `main` → Production build
   - Push to `develop` → Preview build
   - PR created → Preview build

### 10.2 EAS Update (Over-the-Air Updates)
For JS-only changes without full rebuild:

```bash
# Install
npx expo install expo-updates

# Publish update
eas update --branch production --message "Bug fix"
```

---

## Build Profiles Reference

### eas.json Full Example
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      },
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

---

## Common Issues & Solutions

### "No bundle identifier" error
- Add `ios.bundleIdentifier` to `app.json`

### "Keystore not found" (Android)
- Run: `eas credentials` → Configure Android credentials

### iOS build fails with provisioning
- Run: `eas credentials` → iOS → Remove existing profiles → Rebuild

### Build queued for long time
- Free tier has queue times
- Upgrade to paid plan for priority builds
- Or use `eas build --local` (requires macOS for iOS)

### "Version already exists" on submit
- Increment `version`, `buildNumber` (iOS), or `versionCode` (Android)

---

## Costs

### Free Tier
- 15 builds/month (iOS + Android combined)
- Shared build queue (longer wait times)
- Basic support

### Production Tier ($99/month)
- Unlimited builds
- Priority queue (faster builds)
- Concurrent builds
- Premium support

For hobby projects, free tier is usually sufficient.

---

## Checklist

- [ ] Created Expo account
- [ ] Installed EAS CLI
- [ ] Ran `eas init` and `eas build:configure`
- [ ] Updated `app.json` with bundle identifiers
- [ ] (Android) Created first preview build
- [ ] (iOS) Set up Apple Developer account
- [ ] (iOS) Created first preview build
- [ ] Tested preview builds on devices
- [ ] (Optional) Set up EAS secrets for API keys
- [ ] (Optional) Connected GitHub for auto-builds

---

## Next Steps

- [Add Sentry](./03-SENTRY.md) for error tracking
- [Add PostHog](./04-POSTHOG.md) for analytics
- [Set up Push Notifications](./05-PUSH-NOTIFICATIONS.md)
