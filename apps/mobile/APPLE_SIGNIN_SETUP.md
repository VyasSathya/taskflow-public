# Apple Sign In Setup Guide

## Overview
This guide walks you through setting up Apple Sign In for TaskFlow on both native iOS and web (OAuth).

## Prerequisites

✅ Apple Developer Account
✅ App registered in Apple Developer Console
✅ Bundle ID: `com.taskflowapp.app`
✅ Team ID: `YOUR_TEAM_ID`

## Step 1: Configure in Apple Developer Console

### 1.1 Create App ID (if not already done)
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Certificates, Identifiers & Profiles > Identifiers
3. Click + to create new App ID
4. Select "App IDs" > Continue
5. Description: TaskFlow
6. Bundle ID: `com.taskflowapp.app`
7. Capabilities: Enable "Sign In with Apple"
8. Click Continue > Register

### 1.2 Create Service ID (for Web OAuth)
1. Certificates, Identifiers & Profiles > Identifiers
2. Click + > Select "Services IDs" > Continue
3. Description: TaskFlow Web
4. Identifier: `com.taskflowapp.app.web`
5. Click Continue > Register
6. Click on the newly created Service ID
7. Enable "Sign In with Apple"
8. Click Configure next to Sign In with Apple
9. Primary App ID: Select `com.taskflowapp.app`
10. Web Domain: `your-project-ref.supabase.co`
11. Return URLs: `https://your-project-ref.supabase.co/auth/v1/callback`
12. Click Save > Continue > Done

### 1.3 Create Sign In with Apple Key
1. Certificates, Identifiers & Profiles > Keys
2. Click + to create new key
3. Key Name: TaskFlow Sign In with Apple Key
4. Enable "Sign In with Apple"
5. Click Configure next to Sign In with Apple
6. Primary App ID: Select `com.taskflowapp.app`
7. Click Save > Continue > Register
8. **IMPORTANT**: Download the `.p8` file (you can only download it once!)
9. Note the Key ID (you'll need this)
10. Save the `.p8` file to `taskflow-mobile/secrets/AuthKey_XXXXX.p8`

## Step 2: Generate OAuth Secret

### 2.1 Install jsonwebtoken (if not already installed)
```bash
npm install jsonwebtoken
```

### 2.2 Update the generate script
Edit `scripts/generate-apple-secret.js`:
- Replace `YOUR_KEY_ID` with your actual Key ID from step 1.3
- Update the `P8_FILE_PATH` to point to your downloaded .p8 file

### 2.3 Run the script
```bash
node scripts/generate-apple-secret.js
```

This will output a JWT token that looks like:
```
your-supabase-anon-key
```

Copy this entire token - you'll need it for Supabase.

## Step 3: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cbkkztbcoitrfcleghfd)
2. Navigate to Authentication > Providers
3. Find "Apple" and click to enable it
4. Fill in the form:

   **Enable Sign in with Apple**: ✅ Checked

   **Client IDs**:
   ```
   com.taskflowapp.app.web
   ```

   **Secret Key (for OAuth)**:
   ```
   [Paste the JWT token from Step 2.3]
   ```

   **Allow users without an email**: ⬜ Unchecked (optional)

5. Note the Callback URL shown: `https://your-project-ref.supabase.co/auth/v1/callback`
6. Click "Save"

## Step 4: Update app.json

The app.json already has Apple Sign In configured:
```json
{
  "ios": {
    "usesAppleSignIn": true
  },
  "plugins": [
    "expo-apple-authentication"
  ]
}
```

## Step 5: Test Sign In

### Native iOS
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const handleAppleSignIn = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Use credential.identityToken to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
  } catch (e) {
    console.error(e);
  }
};
```

### Web OAuth
The Supabase client will automatically use OAuth flow on web:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
});
```

## Important Notes

⚠️ **Token Expiration**: The OAuth secret JWT expires every 6 months. Set a reminder to regenerate it!

⚠️ **Testing**: Apple Sign In only works on real devices or TestFlight, not the iOS Simulator.

⚠️ **Privacy**: On first sign in, users can choose to hide their email. Handle this case in your app.

## Troubleshooting

### "Invalid client" error
- Check that Service ID matches exactly: `com.taskflowapp.app.web`
- Verify callback URL is correct in Apple Developer Console
- Regenerate the secret JWT

### "Invalid token" error
- Check that the JWT hasn't expired (6 months)
- Verify Key ID is correct
- Ensure .p8 file is the correct one

### App crashes on sign in attempt
- Verify `expo-apple-authentication` is installed
- Check that `usesAppleSignIn: true` is in app.json
- Rebuild the app with EAS Build (native config changed)

## Summary Checklist

- [ ] App ID created with Sign In with Apple capability
- [ ] Service ID created for web OAuth
- [ ] Service ID configured with Supabase callback URL
- [ ] Sign In with Apple Key created and .p8 file downloaded
- [ ] JWT secret generated using the script
- [ ] Supabase Apple provider configured with Client IDs and Secret
- [ ] app.json has `usesAppleSignIn: true`
- [ ] expo-apple-authentication plugin installed
- [ ] Set reminder to regenerate JWT in 6 months
