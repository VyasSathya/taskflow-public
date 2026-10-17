# RevenueCat Monetization Setup Guide

Complete guide for adding in-app purchases and subscriptions to your Expo app using RevenueCat.

**Official Docs:**
- [RevenueCat Expo Installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Expo In-App Purchases Guide](https://docs.expo.dev/guides/in-app-purchases/)
- [Expo + RevenueCat Tutorial](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial)

**Important:** In-app purchases do NOT work in Expo Go. You must use a development build.

---

## Step 1: Create RevenueCat Account

### 1.1 Sign Up
1. Go to [revenuecat.com](https://www.revenuecat.com)
2. Click **Get Started Free**
3. Sign up with email or Google

### 1.2 Create Project
1. Click **Create New Project**
2. Name it (e.g., `MyApp`)
3. You'll be taken to project dashboard

### 1.3 Get API Keys
1. Go to **Project Settings** → **API Keys**
2. You'll see:
   - **Public App-Specific API Key (iOS)**: `appl_xxxxxxxxx`
   - **Public App-Specific API Key (Android)**: `goog_xxxxxxxxx`

Copy both - you'll need them later.

---

## Step 2: App Store Setup

### iOS: App Store Connect

1. **Create App in App Store Connect**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Apps → + → New App
   - Fill in details, use your bundle ID

2. **Create Subscription**
   - In your app → **Monetization** → **Subscriptions**
   - Create Subscription Group (e.g., "Premium")
   - Add subscription products:
     - `premium_monthly` - $4.99/month
     - `premium_yearly` - $29.99/year

3. **Create Shared Secret**
   - App Store Connect → Users & Access → Shared Secret
   - Generate and copy the secret

4. **Add to RevenueCat**
   - RevenueCat → Apps → + Add App → iOS
   - Enter bundle ID and shared secret

### Android: Google Play Console

1. **Create App in Google Play Console**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Create app → Fill details

2. **Create Subscription**
   - Monetization → Products → Subscriptions
   - Create subscription:
     - Product ID: `premium_monthly`
     - Set price and billing period

3. **Enable Google Play Billing API**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable "Google Play Android Developer API"
   - Create Service Account with proper permissions
   - Download JSON key

4. **Add to RevenueCat**
   - RevenueCat → Apps → + Add App → Android
   - Upload service account JSON

---

## Step 3: Configure RevenueCat Products

### 3.1 Create Entitlements
Entitlements represent what users get access to.

1. RevenueCat → **Entitlements** → **+ New**
2. Create: `premium`
   - Description: "Premium access to all features"

### 3.2 Create Offerings
Offerings are what users see in your paywall.

1. RevenueCat → **Offerings** → **+ New**
2. Create default offering:
   - Identifier: `default`
   - Add packages:
     - `$rc_monthly` → Links to your monthly product
     - `$rc_annual` → Links to your annual product

### 3.3 Attach Products to Entitlements
1. Go to each product
2. Attach to `premium` entitlement

---

## Step 4: Install in Your App

### 4.1 Install Packages
```bash
npx expo install react-native-purchases react-native-purchases-ui expo-dev-client
```

### 4.2 Add Plugin to app.json
```json
{
  "expo": {
    "plugins": ["react-native-purchases"]
  }
}
```

### 4.3 Add Environment Variables
Add to `.env`:
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxx
```

---

## Step 5: Create RevenueCat Service

Create `lib/services/purchases.ts`:

```typescript
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}) as string;

export const purchaseService = {
  /**
   * Initialize RevenueCat - call once on app start
   */
  async init(): Promise<void> {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({ apiKey: API_KEY });
  },

  /**
   * Identify user (call after login)
   */
  async login(userId: string): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  },

  /**
   * Log out user
   */
  async logout(): Promise<void> {
    await Purchases.logOut();
  },

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    return await Purchases.getCustomerInfo();
  },

  /**
   * Check if user has premium access
   */
  async isPremium(): Promise<boolean> {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  },

  /**
   * Get available packages
   */
  async getOfferings(): Promise<PurchasesPackage[]> {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  },

  /**
   * Purchase a package
   */
  async purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  },

  /**
   * Restore purchases (for users who reinstalled)
   */
  async restore(): Promise<CustomerInfo> {
    return await Purchases.restorePurchases();
  },
};
```

---

## Step 6: Create Paywall Component

Create `components/Paywall.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { Button, Card } from '@/components/ui';
import { purchaseService } from '@/lib/services/purchases';
import { useTheme } from '@/lib/hooks';

interface PaywallProps {
  onPurchaseComplete?: () => void;
  onClose?: () => void;
}

export function Paywall({ onPurchaseComplete, onClose }: PaywallProps) {
  const { colors } = useTheme();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const pkgs = await purchaseService.getOfferings();
      setPackages(pkgs);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const customerInfo = await purchaseService.purchase(pkg);
      if (customerInfo.entitlements.active['premium']) {
        onPurchaseComplete?.();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Purchase failed:', error);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const customerInfo = await purchaseService.restore();
      if (customerInfo.entitlements.active['premium']) {
        onPurchaseComplete?.();
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Unlock Premium
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Get access to all features
      </Text>

      {/* Features list */}
      <View style={styles.features}>
        {['Unlimited access', 'No ads', 'Priority support', 'All future features'].map((feature) => (
          <Text key={feature} style={[styles.feature, { color: colors.text }]}>
            ✓ {feature}
          </Text>
        ))}
      </View>

      {/* Packages */}
      <View style={styles.packages}>
        {packages.map((pkg) => (
          <Card
            key={pkg.identifier}
            variant="outlined"
            style={styles.packageCard}
            onPress={() => handlePurchase(pkg)}
          >
            <Text style={[styles.packageTitle, { color: colors.text }]}>
              {pkg.product.title}
            </Text>
            <Text style={[styles.packagePrice, { color: colors.primary }]}>
              {pkg.product.priceString}
              {pkg.packageType === 'ANNUAL' ? '/year' : '/month'}
            </Text>
            {pkg.packageType === 'ANNUAL' && (
              <Text style={[styles.savings, { color: colors.success }]}>
                Save 50%
              </Text>
            )}
          </Card>
        ))}
      </View>

      {purchasing && (
        <ActivityIndicator style={styles.purchaseLoader} color={colors.primary} />
      )}

      <Button
        title="Restore Purchases"
        variant="ghost"
        onPress={handleRestore}
      />

      {onClose && (
        <Button
          title="Maybe Later"
          variant="ghost"
          onPress={onClose}
          style={styles.closeButton}
        />
      )}

      <Text style={[styles.terms, { color: colors.textTertiary }]}>
        Subscriptions auto-renew. Cancel anytime in Settings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  features: {
    marginBottom: 24,
  },
  feature: {
    fontSize: 16,
    marginBottom: 8,
  },
  packages: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    alignItems: 'center',
    padding: 16,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  purchaseLoader: {
    marginVertical: 16,
  },
  closeButton: {
    marginTop: 8,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
```

---

## Step 7: Create Premium Hook

Create `lib/hooks/usePremium.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { purchaseService } from '@/lib/services/purchases';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPremium = useCallback(async () => {
    try {
      const premium = await purchaseService.isPremium();
      setIsPremium(premium);
    } catch (error) {
      console.error('Error checking premium:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  return { isPremium, loading, refresh: checkPremium };
}
```

---

## Step 8: Initialize on App Start

Update `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { purchaseService } from '@/lib/services/purchases';
import { useAuth } from '@/lib/hooks';

function RootLayout() {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize RevenueCat
    purchaseService.init();
  }, []);

  useEffect(() => {
    // Sync user with RevenueCat
    if (user) {
      purchaseService.login(user.id);
    } else {
      purchaseService.logout();
    }
  }, [user]);

  // ...
}
```

---

## Step 9: Gate Features

```typescript
import { usePremium } from '@/lib/hooks/usePremium';
import { Paywall } from '@/components/Paywall';

function PremiumFeature() {
  const { isPremium, loading } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) return <LoadingScreen />;

  if (!isPremium) {
    return (
      <View>
        <Text>This is a premium feature</Text>
        <Button
          title="Unlock Premium"
          onPress={() => setShowPaywall(true)}
        />
        <Modal visible={showPaywall}>
          <Paywall
            onPurchaseComplete={() => setShowPaywall(false)}
            onClose={() => setShowPaywall(false)}
          />
        </Modal>
      </View>
    );
  }

  return <ActualPremiumContent />;
}
```

---

## Step 10: Testing

### 10.1 Build Development Build
In-app purchases don't work in Expo Go!

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 10.2 Sandbox Testing

**iOS:**
1. App Store Connect → Users → Sandbox Testers
2. Create test account
3. Sign out of real App Store on device
4. Purchase in app → Sign in with sandbox account

**Android:**
1. Google Play Console → License Testing
2. Add test email addresses
3. Purchases are free for testers

### 10.3 RevenueCat Dashboard
- View test purchases in RevenueCat dashboard
- Check customer info and entitlements
- Debug issues with event history

---

## Pricing Strategy

### Common Models

| Model | Example | Best For |
|-------|---------|----------|
| **Monthly** | $4.99/mo | Testing, lower commitment |
| **Annual** | $29.99/yr (50% off) | Higher LTV, commitment |
| **Lifetime** | $79.99 once | One-time purchase lovers |
| **Freemium** | Free + $4.99/mo | Broad user base |

### Tips
- Annual at ~50% off monthly → encourages annual
- Lifetime at 12-18x monthly → captures "I hate subscriptions" users
- Free trial (3-7 days) can increase conversions
- Show annual first (higher revenue)

---

## RevenueCat Paywalls (Optional)

RevenueCat offers pre-built paywalls you can configure remotely:

```typescript
import RevenueCatUI from 'react-native-purchases-ui';

// Show paywall
const paywallResult = await RevenueCatUI.presentPaywall();

if (paywallResult === 'PURCHASED' || paywallResult === 'RESTORED') {
  // User is now premium
}
```

Configure paywall design in RevenueCat dashboard - no code changes needed!

---

## Checklist

- [ ] Created RevenueCat account and project
- [ ] Set up App Store Connect (iOS)
- [ ] Set up Google Play Console (Android)
- [ ] Created subscription products in both stores
- [ ] Connected stores to RevenueCat
- [ ] Created entitlements and offerings in RevenueCat
- [ ] Installed `react-native-purchases`
- [ ] Added API keys to `.env`
- [ ] Created purchase service
- [ ] Created paywall component
- [ ] Created premium hook
- [ ] Initialized on app start
- [ ] Built development build (not Expo Go!)
- [ ] Tested purchases with sandbox accounts

---

## Next Steps

- A/B test different price points
- Add analytics to track conversion
- Create promotional offers
- Set up subscription management screen
