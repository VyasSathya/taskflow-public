#!/usr/bin/env node
/**
 * Upload iOS build to TestFlight
 *
 * Builds with Xcode and uploads to TestFlight using App Store Connect API
 *
 * Usage: pnpm upload:testflight
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '..');
const IOS_DIR = path.join(ROOT_DIR, 'ios');
const SECRETS_DIR = path.join(ROOT_DIR, 'secrets');
const EXPORT_OPTIONS_PATH = path.join(IOS_DIR, 'exportOptionsAppStore.plist');

// Load .env
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });

// Load app.json for app name
const appConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app.json'), 'utf8'));
const APP_NAME = appConfig.expo?.name || 'App';

// Load eas.json for App Store Connect credentials
const easConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'eas.json'), 'utf8'));
const iosSubmitConfig = easConfig.submit?.production?.ios || {};

// App Store Connect API Key
const API_KEY_ID = iosSubmitConfig.ascApiKeyId || process.env.ASC_API_KEY_ID;
const API_ISSUER_ID = iosSubmitConfig.ascApiKeyIssuerId || process.env.ASC_API_KEY_ISSUER_ID;
const APPLE_TEAM_ID = iosSubmitConfig.appleTeamId || process.env.APPLE_TEAM_ID;

if (!API_KEY_ID || !API_ISSUER_ID || !APPLE_TEAM_ID) {
  console.error('\n❌ Missing required credentials in eas.json or environment variables');
  console.error('Required: ascApiKeyId, ascApiKeyIssuerId, appleTeamId');
  process.exit(1);
}

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { stdio: 'inherit', cwd: IOS_DIR, ...options });
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 ${APP_NAME.toUpperCase()} → TESTFLIGHT`);
  console.log('='.repeat(50));

  const apiKeyPath = path.join(SECRETS_DIR, `AuthKey_${API_KEY_ID}.p8`);

  // Check API key exists
  if (!fs.existsSync(apiKeyPath)) {
    console.error(`\n❌ API Key not found at ${apiKeyPath}`);
    console.error('Get it from App Store Connect → Users and Access → Keys');
    process.exit(1);
  }

  // Create export options plist
  const exportOptions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>${APPLE_TEAM_ID}</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>destination</key>
    <string>upload</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>`;
  fs.writeFileSync(EXPORT_OPTIONS_PATH, exportOptions);

  // Clean
  console.log('\n📦 Step 1/3: Cleaning...');
  try {
    run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} clean`, { stdio: 'pipe' });
  } catch (e) {}

  // Archive
  console.log('\n🔧 Step 2/3: Building Release archive...');
  const buildEnv = {
    ...process.env,
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    EX_UPDATES_NATIVE_DEBUG: '0',
  };
  run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} -destination "generic/platform=iOS" -configuration Release -archivePath build/${APP_NAME}.xcarchive archive -allowProvisioningUpdates`, { env: buildEnv });

  // Upload to TestFlight
  console.log('\n🚀 Step 3/3: Uploading to TestFlight...');

  // Copy API key to ~/private_keys/ (xcodebuild expects it there)
  const privateKeysDir = path.join(os.homedir(), 'private_keys');
  if (!fs.existsSync(privateKeysDir)) {
    fs.mkdirSync(privateKeysDir, { recursive: true });
  }
  const destKeyPath = path.join(privateKeysDir, `AuthKey_${API_KEY_ID}.p8`);
  fs.copyFileSync(apiKeyPath, destKeyPath);

  try {
    run(`xcodebuild -exportArchive -archivePath build/${APP_NAME}.xcarchive -exportOptionsPlist exportOptionsAppStore.plist -allowProvisioningUpdates -authenticationKeyPath "${destKeyPath}" -authenticationKeyID ${API_KEY_ID} -authenticationKeyIssuerID ${API_ISSUER_ID}`);
  } catch (e) {
    console.log('\n⚠️  API key auth failed, trying without...');
    run(`xcodebuild -exportArchive -archivePath build/${APP_NAME}.xcarchive -exportOptionsPlist exportOptionsAppStore.plist -allowProvisioningUpdates`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ UPLOADED TO TESTFLIGHT!');
  console.log('='.repeat(50));
  console.log('\n📱 Check TestFlight in App Store Connect:');
  console.log('   https://appstoreconnect.apple.com/apps');
  console.log('\n⏱️  Processing usually takes 5-15 minutes');
  console.log('   You\'ll receive an email when ready for testing\n');
}

main().catch(err => {
  console.error('\n❌ Upload failed:', err.message);
  process.exit(1);
});

