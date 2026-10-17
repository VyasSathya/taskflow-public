# Supabase Apple Provider Configuration

## Quick Reference

Copy these values directly into Supabase Dashboard.

### Where to Configure
1. Go to: https://supabase.com/dashboard/project/cbkkztbcoitrfcleghfd/auth/providers
2. Find "Apple" provider
3. Click to enable and configure

---

## Configuration Form

### ✅ Enable Sign in with Apple
**Value**: `Checked` ✓

---

### 📱 Client IDs
**Value**:
```
com.taskflowapp.app,com.taskflowapp.app.web
```

**⚠️ IMPORTANT**: You must include BOTH IDs (comma-separated, no spaces):
- `com.taskflowapp.app` - Bundle ID for native iOS app sign-in
- `com.taskflowapp.app.web` - Service ID for web OAuth

**Common Error**: If you only add the web Service ID, native iOS sign-in will fail with:
> "Unacceptable audience in id_token: [com.taskflowapp.app]"

You must create both in Apple Developer Console first (see APPLE_SIGNIN_SETUP.md).

---

### 🔑 Secret Key (for OAuth)
**Value**: `[Generated JWT - see below]`

**How to generate**:
1. Download your .p8 key file from Apple Developer Console
2. Save it to: `taskflow-mobile/secrets/AuthKey_XXXXX.p8`
3. Edit `scripts/generate-apple-secret.js`:
   - Replace `YOUR_KEY_ID` with your actual Key ID
   - Update the path to your .p8 file
4. Run: `node scripts/generate-apple-secret.js`
5. Copy the generated JWT token (starts with `your-supabase-anon-key`)
6. Paste it here

**Example JWT format** (yours will be different):
```
your-supabase-anon-key
```

---

### 📧 Allow users without an email
**Value**: `Unchecked` ⬜ (recommended)

**Explanation**: Apple allows users to hide their email. If unchecked, authentication will fail when users choose to hide their email. If checked, you'll need to handle users without emails in your app.

---

### 🔗 Callback URL (for OAuth)
**Value**: `https://your-project-ref.supabase.co/auth/v1/callback`

**Note**: This is displayed by Supabase automatically. You need to register this URL in Apple Developer Console.

---

## Pre-Configuration Checklist

Before filling out the Supabase form, ensure you have:

- [ ] Created App ID in Apple Developer Console (`com.taskflowapp.app`)
- [ ] Created Service ID in Apple Developer Console (`com.taskflowapp.app.web`)
- [ ] Configured Service ID with Supabase callback URL
- [ ] Created Sign in with Apple Key and downloaded .p8 file
- [ ] Generated JWT using `generate-apple-secret.js` script
- [ ] JWT is not expired (valid for 6 months from generation)

---

## Verification

After configuring in Supabase:

1. **Test Native Sign In** (iOS only):
   - Build the app with EAS: `npm run build:ios`
   - Install on a real device (Apple Sign In doesn't work on simulator)
   - Try signing in with Apple

2. **Test Web OAuth**:
   - Deploy to web or use Expo web
   - Try signing in with Apple
   - Should redirect to Apple's auth page, then back to your app

---

## Troubleshooting

### "Unacceptable audience in id_token: [com.taskflowapp.app]"
- **Cause**: Supabase Client IDs field is missing the native iOS bundle ID
- **Fix**: Add BOTH IDs to Supabase: `com.taskflowapp.app,com.taskflowapp.app.web`

### "invalid_client" error
- Check Client IDs field contains both: `com.taskflowapp.app,com.taskflowapp.app.web`
- Verify Service ID is created in Apple Developer Console
- Ensure callback URL is registered in Service ID configuration

### "invalid_token" or "token_expired" error
- Regenerate JWT using the script
- Check that Key ID matches the .p8 file
- Verify Team ID is correct (YOUR_TEAM_ID)

### Sign in works on iOS but not web
- Ensure Service ID is configured for web (not just App ID)
- Check that callback URL is correct in Apple Developer Console
- Verify JWT secret is pasted correctly in Supabase

### Sign in works on web but not iOS
- Ensure Bundle ID (`com.taskflowapp.app`) is in Supabase Client IDs field
- Must be using a development build, not Expo Go
- Must test on real device, not simulator

---

## Important Reminders

⚠️ **JWT Expires**: The secret key expires every 6 months. Set a calendar reminder to regenerate it.

⚠️ **Production Build Required**: Apple Sign In requires a production or development build. It won't work with Expo Go.

⚠️ **Real Device Only**: Testing iOS Apple Sign In requires a real device, not the simulator.

---

## Your Configuration Summary

| Field | Value |
|-------|-------|
| Team ID | `YOUR_TEAM_ID` |
| Bundle ID (iOS) | `com.taskflowapp.app` |
| Service ID (Web) | `com.taskflowapp.app.web` |
| **Supabase Client IDs** | `com.taskflowapp.app,com.taskflowapp.app.web` |
| Supabase Project | `cbkkztbcoitrfcleghfd` |
| Callback URL | `https://your-project-ref.supabase.co/auth/v1/callback` |

---

## Next Steps

1. Complete Apple Developer Console setup (see APPLE_SIGNIN_SETUP.md)
2. Generate JWT secret: `node scripts/generate-apple-secret.js`
3. Configure Supabase with values above
4. Test on a real iOS device
5. Set reminder to regenerate JWT in 6 months
