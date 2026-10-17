#!/bin/bash
# Setup TestFlight automation
# This script helps you set up your iOS project for TestFlight uploads

set -e

echo ""
echo "=================================================="
echo "🚀 TESTFLIGHT AUTOMATION SETUP"
echo "=================================================="
echo ""

# Check if iOS directory exists
if [ ! -d "ios" ]; then
    echo "📱 Step 1: Generating iOS native project..."
    npx expo prebuild -p ios --clean
    echo "✅ iOS project generated"
else
    echo "✅ iOS project already exists"
fi

# Install CocoaPods dependencies
if [ -f "ios/Podfile" ]; then
    echo ""
    echo "📦 Step 2: Installing CocoaPods dependencies..."
    cd ios && pod install && cd ..
    echo "✅ Pods installed"
fi

# Create secrets directory
echo ""
echo "🔐 Step 3: Setting up secrets directory..."
mkdir -p secrets
echo "✅ Secrets directory created"

# Create builds directory
mkdir -p builds
touch builds/.gitkeep
echo "✅ Builds directory created"

echo ""
echo "=================================================="
echo "✅ SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Get your App Store Connect API Key:"
echo "   • Go to: https://appstoreconnect.apple.com"
echo "   • Navigate to: Users and Access → Keys"
echo "   • Generate a new key with 'App Manager' access"
echo "   • Download the .p8 file"
echo "   • Move it to: secrets/AuthKey_XXXXXXXXXX.p8"
echo ""
echo "2. Update eas.json with your credentials:"
echo "   • ascAppId: Your App Store Connect App ID"
echo "   • appleTeamId: Your Apple Team ID"
echo "   • ascApiKeyId: Your API Key ID (e.g., YOUR_KEY_ID)"
echo "   • ascApiKeyIssuerId: Your Issuer ID"
echo ""
echo "3. Configure signing in Xcode:"
echo "   • Open ios/YourApp.xcworkspace in Xcode"
echo "   • Select your project → Signing & Capabilities"
echo "   • Choose your Team"
echo "   • Set your Bundle Identifier"
echo ""
echo "4. Build and upload:"
echo "   npm run release:testflight"
echo ""
echo "📖 See TESTFLIGHT_SETUP.md for detailed instructions"
echo ""

