# Sentry Error Tracking Setup Guide

Complete guide for setting up Sentry crash reporting and error tracking in your Expo app.

**Official Docs:**
- [Sentry React Native Expo Setup](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)
- [Expo Sentry Guide](https://docs.expo.dev/guides/using-sentry/)

**Important:** The old `sentry-expo` package is deprecated. Use `@sentry/react-native` directly.

---

## Step 1: Create Sentry Account & Project

### 1.1 Sign Up
1. Go to [sentry.io](https://sentry.io)
2. Sign up with GitHub, Google, or email
3. Free tier includes 5,000 errors/month

### 1.2 Create Project
1. Click **Create Project**
2. Select platform: **React Native**
3. Set alert frequency (recommended: "Alert me on every new issue")
4. Name your project (e.g., `myapp-mobile`)
5. Click **Create Project**

### 1.3 Get Your DSN
1. Go to **Settings** → **Projects** → Your project → **Client Keys (DSN)**
2. Copy the DSN (looks like):
   ```
   https://abc123@o123456.ingest.sentry.io/1234567
   ```

---

## Step 2: Install Sentry SDK

### 2.1 Install Package
```bash
npx expo install @sentry/react-native
```

### 2.2 Update Metro Config
Edit `metro.config.js`:

```javascript
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
```

If you don't have `metro.config.js`, create it with this content.

---

## Step 3: Add Expo Plugin

### 3.1 Update app.json
Add Sentry to your plugins:

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "organization": "your-org-slug",
          "project": "your-project-slug"
        }
      ]
    ]
  }
}
```

Find your org/project slugs in Sentry URL:
`https://sentry.io/organizations/{org-slug}/projects/{project-slug}/`

---

## Step 4: Initialize Sentry

### 4.1 Update Root Layout
Edit `app/_layout.tsx`:

```typescript
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__, // Disable in production
  tracesSampleRate: 1.0, // Capture 100% of transactions (reduce in production)
  _experiments: {
    profilesSampleRate: 1.0, // Profiling sample rate
  },
});

function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef) {
      // Register navigation for breadcrumbs
      Sentry.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  // ... rest of your layout
}

// Wrap your app with Sentry
export default Sentry.wrap(RootLayout);
```

### 4.2 Add DSN to Environment
Add to `.env`:
```env
EXPO_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/1234567
```

---

## Step 5: Configure Source Maps (EAS Build)

### 5.1 Create Auth Token
1. Go to [sentry.io](https://sentry.io) → **Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Select scopes:
   - `project:releases`
   - `org:read`
4. Copy the token

### 5.2 Add as EAS Secret
**Do NOT put auth token in `.env`** - it's sensitive!

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value "your-auth-token"
```

### 5.3 Update eas.json
```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_AUTH_TOKEN": "@SENTRY_AUTH_TOKEN"
      }
    }
  }
}
```

Source maps will now auto-upload during EAS builds.

---

## Step 6: Using Sentry in Your App

### 6.1 Capture Exceptions
```typescript
import * as Sentry from '@sentry/react-native';

try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}
```

### 6.2 Capture Messages
```typescript
Sentry.captureMessage('Something happened', 'info');
```

### 6.3 Add Breadcrumbs
```typescript
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
});
```

### 6.4 Set User Context
```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// On logout
Sentry.setUser(null);
```

### 6.5 Add Tags
```typescript
Sentry.setTag('subscription', 'premium');
Sentry.setTag('feature', 'checkout');
```

---

## Step 7: Expo Router Integration

Sentry automatically tracks Expo Router navigation. For enhanced tracking:

```typescript
import * as Sentry from '@sentry/react-native';
import { usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';

export function useRouteTracking() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${pathname}`,
      data: { segments },
      level: 'info',
    });
  }, [pathname, segments]);
}
```

---

## Step 8: Update Error Reporting Service

Replace the stub in `lib/services/errorReporting.ts`:

```typescript
import * as Sentry from '@sentry/react-native';

export const errorReporting = {
  init: () => {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: __DEV__,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      beforeSend(event) {
        // Don't send events in dev
        if (__DEV__) {
          console.log('[Sentry] Would send:', event);
          return null;
        }
        return event;
      },
    });
  },

  captureException: (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, { extra: context });
  },

  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, level);
  },

  setUser: (user: { id: string; email?: string } | null) => {
    Sentry.setUser(user);
  },

  addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => {
    Sentry.addBreadcrumb(breadcrumb);
  },
};
```

---

## Step 9: Test Your Setup

### 9.1 Trigger Test Error
Add a test button somewhere:

```typescript
import * as Sentry from '@sentry/react-native';

<Button
  title="Test Sentry"
  onPress={() => {
    throw new Error('Test Sentry Error');
  }}
/>
```

### 9.2 Check Sentry Dashboard
1. Run the app and tap the test button
2. Go to Sentry → **Issues**
3. You should see "Test Sentry Error"
4. Click to see full stack trace, device info, breadcrumbs

---

## Production Recommendations

### Sample Rates
Don't capture 100% in production (costs money):

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2, // 20% of transactions
  profilesSampleRate: 0.1, // 10% of profiles
  beforeSend(event) {
    // Filter out known non-issues
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    return event;
  },
});
```

### Environment Tags
```typescript
Sentry.init({
  environment: __DEV__ ? 'development' : 'production',
});
```

### Release Tracking
EAS Build automatically sets release version. For manual builds:

```typescript
import Constants from 'expo-constants';

Sentry.init({
  release: `${Constants.expoConfig?.slug}@${Constants.expoConfig?.version}`,
});
```

---

## Common Issues & Solutions

### "DSN required" error
- Check `.env` has `EXPO_PUBLIC_SENTRY_DSN`
- Restart Expo after adding env var

### Source maps not uploading
- Verify `SENTRY_AUTH_TOKEN` EAS secret is set
- Check org/project slugs in `app.json` plugin config
- Run: `eas secret:list` to verify

### Events not appearing in Sentry
- Check if `debug: true` shows console logs
- Verify DSN is correct
- Check Sentry project filters

### Metro config error
- Make sure you're using `getSentryExpoConfig` from `@sentry/react-native/metro`

---

## Checklist

- [ ] Created Sentry account and project
- [ ] Installed `@sentry/react-native`
- [ ] Updated `metro.config.js`
- [ ] Added Sentry plugin to `app.json`
- [ ] Added `EXPO_PUBLIC_SENTRY_DSN` to `.env`
- [ ] Initialized Sentry in `_layout.tsx`
- [ ] Created auth token and added as EAS secret
- [ ] Tested with a sample error
- [ ] Set appropriate sample rates for production

---

## Next Steps

- [Add PostHog](./04-POSTHOG.md) for analytics
- [Set up Push Notifications](./05-PUSH-NOTIFICATIONS.md)
