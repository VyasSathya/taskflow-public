# PostHog Analytics Setup Guide

Complete guide for setting up PostHog product analytics, feature flags, and session replay in your Expo app.

**Official Docs:**
- [PostHog React Native Setup](https://posthog.com/docs/libraries/react-native)
- [PostHog Expo Tutorial](https://posthog.com/tutorials/react-native-analytics)
- [Expo Analytics Guide](https://docs.expo.dev/guides/using-analytics/)

---

## Why PostHog?

| Feature | Included Free |
|---------|---------------|
| Product Analytics | 1M events/month |
| Session Replay | 5K recordings/month |
| Feature Flags | Unlimited |
| A/B Testing | Included |
| Surveys | Included |

PostHog is open-source and can be self-hosted for unlimited free usage.

---

## Step 1: Create PostHog Account

### 1.1 Sign Up
1. Go to [posthog.com](https://posthog.com)
2. Click **Get started free**
3. Sign up with Google, GitHub, GitLab, or email

### 1.2 Create Project
1. After signup, you'll be prompted to create a project
2. Name it (e.g., `MyApp Mobile`)
3. Select **React Native** when asked about your stack

### 1.3 Get API Key
1. Go to **Settings** (gear icon) → **Project** → **Project API Key**
2. Copy your **Project API Key** (starts with `phc_`)
3. Note your **Host** (usually `https://app.posthog.com` or `https://us.posthog.com`)

---

## Step 2: Install PostHog SDK

### 2.1 Install Packages
```bash
npx expo install posthog-react-native expo-file-system expo-application expo-device expo-localization
```

### 2.2 Add to Environment
Add to `.env`:
```env
EXPO_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

---

## Step 3: Initialize PostHog

### 3.1 Update Root Layout
Edit `app/_layout.tsx`:

```typescript
import { PostHogProvider } from 'posthog-react-native';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{
        host: posthogHost,
        // Enable autocapture of screen views, button presses
        autocapture: {
          captureTouches: true,
          captureLifecycleEvents: true,
          captureScreens: true,
        },
      }}
    >
      {/* Rest of your app */}
    </PostHogProvider>
  );
}
```

---

## Step 4: Track Events

### 4.1 Basic Event Tracking
```typescript
import { usePostHog } from 'posthog-react-native';

function MyComponent() {
  const posthog = usePostHog();

  const handlePurchase = () => {
    posthog.capture('purchase_completed', {
      product_id: 'prod_123',
      price: 29.99,
      currency: 'USD',
    });
  };

  return <Button title="Buy Now" onPress={handlePurchase} />;
}
```

### 4.2 Common Events to Track
```typescript
// User signed up
posthog.capture('user_signed_up', {
  method: 'email', // or 'google', 'apple'
});

// Feature used
posthog.capture('feature_used', {
  feature: 'dark_mode',
  enabled: true,
});

// Error occurred
posthog.capture('error_occurred', {
  error_type: 'network',
  message: 'Failed to load data',
});

// Onboarding step
posthog.capture('onboarding_step', {
  step: 2,
  step_name: 'profile_setup',
});

// Subscription started
posthog.capture('subscription_started', {
  plan: 'premium',
  billing: 'monthly',
  price: 9.99,
});
```

---

## Step 5: Identify Users

### 5.1 On Login/Signup
```typescript
import { usePostHog } from 'posthog-react-native';

function useAuthTracking() {
  const posthog = usePostHog();

  const onLogin = (user: User) => {
    // Identify the user
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      plan: user.subscription_plan,
    });
  };

  const onLogout = () => {
    // Reset to anonymous
    posthog.reset();
  };

  return { onLogin, onLogout };
}
```

### 5.2 Update User Properties
```typescript
// When user upgrades plan
posthog.capture('$set', {
  $set: {
    plan: 'premium',
    upgraded_at: new Date().toISOString(),
  },
});
```

---

## Step 6: Feature Flags

### 6.1 Create Flag in PostHog
1. Go to **Feature Flags** in PostHog dashboard
2. Click **New feature flag**
3. Set key (e.g., `new-checkout-flow`)
4. Configure rollout (percentage or user properties)
5. Save

### 6.2 Use in App
```typescript
import { useFeatureFlag } from 'posthog-react-native';

function CheckoutScreen() {
  const showNewCheckout = useFeatureFlag('new-checkout-flow');

  if (showNewCheckout) {
    return <NewCheckoutFlow />;
  }

  return <OldCheckoutFlow />;
}
```

### 6.3 With Loading State
```typescript
import { useFeatureFlagWithPayload } from 'posthog-react-native';

function PricingScreen() {
  const { value, loading } = useFeatureFlagWithPayload('pricing-experiment');

  if (loading) {
    return <LoadingScreen />;
  }

  return <PricingTable variant={value?.variant || 'control'} />;
}
```

---

## Step 7: Session Replay (Optional)

**Note:** Session Replay requires a development build, not Expo Go.

### 7.1 Enable Session Replay
```typescript
<PostHogProvider
  apiKey={posthogApiKey}
  options={{
    host: posthogHost,
    enableSessionReplay: true,
    sessionReplayConfig: {
      maskAllTextInputs: true, // Hide sensitive input
      maskAllImages: false,
      captureLog: true,
      captureNetworkTelemetry: true,
    },
  }}
>
```

### 7.2 Mask Sensitive Views
```typescript
import { PostHogSensitive } from 'posthog-react-native';

<PostHogSensitive>
  <Text>This content is masked in recordings</Text>
  <CreditCardInput />
</PostHogSensitive>
```

---

## Step 8: Update Analytics Service

Replace the stub in `lib/services/analytics.ts`:

```typescript
import posthog from 'posthog-react-native';

export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (__DEV__) {
      console.log('[Analytics]', event, properties);
    }
    posthog.capture(event, properties);
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    posthog.identify(userId, traits);
  },

  reset: () => {
    posthog.reset();
  },

  screen: (name: string, properties?: Record<string, any>) => {
    posthog.screen(name, properties);
  },

  // Feature flags
  getFeatureFlag: (key: string) => {
    return posthog.getFeatureFlag(key);
  },

  isFeatureEnabled: (key: string) => {
    return posthog.isFeatureEnabled(key);
  },
};
```

### Usage in components:
```typescript
import { analytics } from '@/lib/services';

// Track event
analytics.track('button_pressed', { button: 'submit' });

// Check feature flag
if (analytics.isFeatureEnabled('new-feature')) {
  // Show new feature
}
```

---

## Step 9: Group Analytics (Optional)

For B2B apps, group users by company/organization:

```typescript
// When user joins an organization
posthog.group('company', 'company_123', {
  name: 'Acme Inc',
  plan: 'enterprise',
  employee_count: 50,
});

// Events are now associated with both user and company
posthog.capture('report_generated');
```

---

## Step 10: Debug & Test

### 10.1 Enable Debug Mode
```typescript
<PostHogProvider
  apiKey={posthogApiKey}
  options={{
    host: posthogHost,
    debug: __DEV__,
  }}
>
```

### 10.2 View Events
1. Go to PostHog dashboard → **Activity** → **Live events**
2. You'll see events stream in real-time

### 10.3 Test Feature Flags
```bash
# In PostHog, you can override flags for specific users
# Go to Feature Flags → Your flag → "Override for user"
```

---

## Best Practices

### Event Naming
```typescript
// Good - action-based, consistent
'purchase_completed'
'signup_started'
'feature_enabled'
'error_occurred'

// Bad - inconsistent, vague
'click'
'user did thing'
'Purchase'
```

### Property Naming
```typescript
// Good - snake_case, descriptive
{
  product_id: 'prod_123',
  price_usd: 29.99,
  is_first_purchase: true,
}

// Bad - inconsistent
{
  productID: 'prod_123',
  'Price': 29.99,
  firstPurchase: true,
}
```

### What to Track
- **Do track:**
  - Key user actions (signup, purchase, feature use)
  - Errors and failures
  - Funnel steps (onboarding, checkout)
  - Feature flag exposure

- **Don't track:**
  - Every tap/scroll (use autocapture sparingly)
  - PII without consent
  - High-frequency events that add noise

---

## Common Issues & Solutions

### Events not appearing
- Check API key is correct
- Verify host URL matches your region (US vs EU)
- Enable `debug: true` to see console logs

### Feature flags returning undefined
- Flags load async; use loading states
- Check flag is enabled in dashboard
- Verify user meets targeting criteria

### Session replay not working
- Requires development build, not Expo Go
- Check `enableSessionReplay: true`
- Verify PostHog plan includes replay

---

## Checklist

- [ ] Created PostHog account and project
- [ ] Installed `posthog-react-native` and peer deps
- [ ] Added API key and host to `.env`
- [ ] Wrapped app with `PostHogProvider`
- [ ] Added user identification on login
- [ ] Tracking key events
- [ ] (Optional) Set up feature flags
- [ ] (Optional) Enabled session replay
- [ ] Tested events appear in dashboard

---

## Next Steps

- [Set up Push Notifications](./05-PUSH-NOTIFICATIONS.md)
