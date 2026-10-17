# TestFlight Automation Setup

This template includes automated scripts to build and upload your iOS app to TestFlight without using EAS Build.

## Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Xcode** installed (latest version recommended)
3. **CocoaPods** installed: `sudo gem install cocoapods`
4. **App Store Connect API Key** (for automated uploads)

## Quick Start

### 1. Run the Setup Script

```bash
npm run setup:testflight
```

This will:
- Generate the iOS native project (`npx expo prebuild -p ios`)
- Install CocoaPods dependencies
- Create necessary directories
- Guide you through configuration

### 2. Configure App Store Connect API

Create a `secrets/` directory and add your API key:

```bash
mkdir -p secrets
# Copy your AuthKey_XXXXXXXXXX.p8 file to secrets/
```

Update `eas.json` with your credentials:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID",
        "ascApiKeyId": "YOUR_KEY_ID",
        "ascApiKeyPath": "secrets/AuthKey_YOUR_KEY_ID.p8",
        "ascApiKeyIssuerId": "YOUR_ISSUER_ID"
      }
    }
  }
}
```

### 3. Configure Signing in Xcode

1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select your project in the navigator
3. Go to "Signing & Capabilities"
4. Select your Team
5. Ensure "Automatically manage signing" is checked
6. Set your Bundle Identifier

### 4. Build and Upload

```bash
# Build the app locally
npm run build:xcode

# Upload to TestFlight
npm run upload:testflight

# Or do both in one command
npm run release:testflight
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Setup | `npm run setup:testflight` | Initial setup and prebuild |
| Build | `npm run build:xcode` | Build .ipa locally with Xcode |
| Upload | `npm run upload:testflight` | Upload existing .ipa to TestFlight |
| Release | `npm run release:testflight` | Build + Upload in one step |
| Show Builds | `npm run show:builds` | List recent builds |

## Getting App Store Connect Credentials

### 1. Create API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Keys** (under Integrations)
3. Click **Generate API Key** or **+**
4. Name: "TestFlight Upload"
5. Access: **App Manager** or **Admin**
6. Click **Generate**
7. Download the `.p8` file (you can only download it once!)

### 2. Get Your IDs

- **Key ID**: Shown in the Keys list (e.g., `YOUR_KEY_ID`)
- **Issuer ID**: Shown at the top of the Keys page
- **Team ID**: Go to **Membership** in App Store Connect
- **App ID**: Go to **Apps** → Select your app → **App Information** → Look for Apple ID

### 3. Store Credentials Securely

```bash
# Create secrets directory
mkdir -p secrets

# Move your API key
mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 secrets/

# Add to .gitignore (already included in template)
echo "secrets/" >> .gitignore
```

## Environment Variables

Create a `.env` file in your project root:

```bash
# Required for the app to function
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For build scripts
APPLE_TEAM_ID=YOUR_TEAM_ID
ASC_APP_ID=YOUR_APP_ID
```

## Troubleshooting

### Build Fails with "No such module"

Run pod install:
```bash
cd ios && pod install && cd ..
```

### Signing Issues

1. Open Xcode
2. Go to Preferences → Accounts
3. Add your Apple ID
4. Download Manual Profiles if needed

### Upload Fails

Check your API key:
- Ensure the `.p8` file is in `secrets/`
- Verify the key ID matches in `eas.json`
- Confirm the key has App Manager access

### "Invalid IPA" Error

Make sure you're building for a real device, not simulator:
```bash
# The build script automatically uses generic/platform=iOS
# But verify in Xcode: Product → Destination → Any iOS Device
```

## Next Steps

1. ✅ Run `npm run setup:testflight`
2. ✅ Configure signing in Xcode
3. ✅ Add App Store Connect API credentials
4. ✅ Run `npm run release:testflight`
5. ✅ Check TestFlight in App Store Connect
6. ✅ Invite testers!

## Resources

- [App Store Connect API Keys](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)

