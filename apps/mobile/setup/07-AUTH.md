# OAuth Authentication Setup

Complete guide to set up Apple + Google Sign In.

---

## Quick Checklist

```
[ ] 1. Apple Developer Console - Enable Sign In with Apple
[ ] 2. Apple Developer Console - Create Sign In with Apple Key
[ ] 3. Supabase Dashboard - Configure Apple Provider
[ ] 4. Google Cloud Console - Create OAuth Client IDs
[ ] 5. Supabase Dashboard - Configure Google Provider
[ ] 6. Rebuild iOS app (native module added)
```

---

## Part 1: Apple Sign In Setup

### Step 1.1: Enable Sign In with Apple on Your App ID

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to: **Certificates, Identifiers & Profiles** → **Identifiers**
3. Find your App ID: `com.yourcompany.yourapp`
   - If it doesn't exist, click **+** to create it
4. Click on the App ID to edit it
5. Scroll down to **Capabilities**
6. Check ✅ **Sign In with Apple**
7. Click **Save**

### Step 1.2: Create a Sign In with Apple Key

1. In Apple Developer Console, go to: **Keys**
2. Click **+** to create a new key
3. Enter:
   - **Key Name:** `YourApp Sign In Key`
   - Check ✅ **Sign In with Apple**
4. Click **Configure** next to Sign In with Apple
5. Select your App ID: `com.yourcompany.yourapp`
6. Click **Save** → **Continue** → **Register**
7. **IMPORTANT:** Download the `.p8` file immediately (you can only download once!)
8. Note your **Key ID** (shown on the keys page)

### Step 1.3: Find Your Apple Team ID

1. Go to [Apple Developer Membership](https://developer.apple.com/account/#!/membership)
2. Your **Team ID** is shown (10 character string like `ABC123XYZ`)

### Step 1.4: Configure Supabase Apple Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Providers**
4. Find **Apple** and click to expand
5. Toggle **Enable Sign in with Apple** ON
6. Fill in:

| Field | Value |
|-------|-------|
| **Secret Key** | Open your `.p8` file in a text editor, copy the ENTIRE contents including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` |
| **Apple Team ID** | Your Team ID from Step 1.3 (e.g., `ABC123XYZ`) |
| **Key ID** | The Key ID from Step 1.2 |
| **Authorized Client IDs** | `com.yourcompany.yourapp` |

7. Click **Save**

---

## Part 2: Google Sign In Setup

### Step 2.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at top → **New Project**
   - Or use an existing project
3. Name it: `YourApp`
4. Click **Create**

### Step 2.2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to: **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you're only allowing specific Google Workspace users)
3. Click **Create**
4. Fill in:

| Field | Value |
|-------|-------|
| App name | YourApp |
| User support email | your-email@example.com |
| Developer contact email | your-email@example.com |

5. Click **Save and Continue**
6. Skip Scopes (defaults are fine) → **Save and Continue**
7. Skip Test Users → **Save and Continue**
8. Click **Back to Dashboard**

### Step 2.3: Create OAuth Client IDs

You need to create **3 client IDs**:

#### Client ID #1: Web Application (Required for Supabase)

1. Go to: **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select: **Web application**
4. Name: `YourApp Supabase`
5. Under **Authorized redirect URIs**, click **+ Add URI**
6. Enter: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - (This is your Supabase project URL + `/auth/v1/callback`)
7. Click **Create**
8. **Copy and save:**
   - Client ID: `xxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxx`

#### Client ID #2: iOS (For native iOS app)

1. Click **+ Create Credentials** → **OAuth client ID**
2. Select: **iOS**
3. Name: `YourApp iOS`
4. Bundle ID: `com.yourcompany.yourapp`
5. Click **Create**
6. **Copy the Client ID:** `xxx.apps.googleusercontent.com`

#### Client ID #3: Android (For native Android app)

1. Click **+ Create Credentials** → **OAuth client ID**
2. Select: **Android**
3. Name: `YourApp Android`
4. Package name: `com.yourcompany.yourapp`
5. SHA-1 certificate fingerprint:
   - Run this in terminal: `eas credentials`
   - Select Android → Select your build profile
   - Copy the SHA-1 fingerprint
   - Or get it from Google Play Console if already published
6. Click **Create**
7. **Copy the Client ID:** `xxx.apps.googleusercontent.com`

### Step 2.4: Configure Supabase Google Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Sign in with Google** ON
6. Fill in:

| Field | Value |
|-------|-------|
| **Client ID** | Your **Web Application** Client ID from Step 2.3 |
| **Client Secret** | Your **Web Application** Client Secret from Step 2.3 |
| **Authorized Client IDs** | Your iOS and Android Client IDs, comma-separated: `ios-client-id.apps.googleusercontent.com,android-client-id.apps.googleusercontent.com` |

7. Click **Save**

---

## Part 3: Update Your App

### 3.1: Update app.json

Add Apple Sign In capability:

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true
    },
    "plugins": [
      "expo-apple-authentication"
    ]
  }
}
```

### 3.2: Update URL Scheme

Make sure your app scheme is set in app.json:

```json
{
  "expo": {
    "scheme": "yourapp"
  }
}
```

### 3.3: Update Google Redirect URL

In `lib/supabase/client.ts`, update the redirect URL in `signInWithGoogle`:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'yourapp://auth/callback',  // <-- Update this
    skipBrowserRedirect: true,
  },
});
```

---

## Part 4: Rebuild Your App

Since we added `expo-apple-authentication` (a native module), you need a new development build:

```bash
# Build for iOS
npx eas build --profile development --platform ios

# Build for Android (optional, for testing Google Sign In)
npx eas build --profile development --platform android
```

After build completes:
1. Scan the QR code to install the new build
2. Run `npm run tunnel` to start the dev server
3. Test sign in!

---

## Troubleshooting

### "Invalid client_id" from Apple
- Make sure the Bundle ID in Supabase matches exactly your app's bundle ID
- Check that Sign In with Apple is enabled on the App ID

### "Sign in with Apple is not available"
- This only works on real iOS devices (not simulators without Apple ID)
- Make sure iOS version is 13+
- Make sure you're using a dev build, not Expo Go

### "redirect_uri_mismatch" from Google
- Check that the redirect URI in Google Cloud Console is exactly:
  `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- No trailing slash!

### Google Sign In opens browser but nothing happens
- Make sure your app scheme is correct in app.json
- The redirect URL should match: `yourapp://auth/callback`

### "User cancelled" errors
- These are normal when user taps outside the sign-in sheet
- The app handles this gracefully (no error shown to user)

---

## Your Credentials Reference

Fill these in as you go:

```
APPLE:
- Team ID: _______________
- Key ID: _______________
- Bundle ID: _______________
- .p8 file location: _______________

GOOGLE:
- Web Client ID: _______________
- Web Client Secret: _______________
- iOS Client ID: _______________
- Android Client ID: _______________

SUPABASE:
- Project URL: _______________
- Project ID: _______________
```

---

## What's Already Done in Template

✅ `expo-apple-authentication` in package.json
✅ `expo-crypto` in package.json
✅ `lib/supabase/client.ts` has `signInWithApple()` and `signInWithGoogle()`
✅ `lib/stores/auth-store.ts` has OAuth store methods
✅ Login screen has Apple + Google buttons (when available)

You just need to configure Apple Developer Console, Google Cloud Console, and Supabase Dashboard!
