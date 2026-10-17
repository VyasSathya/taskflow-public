#!/usr/bin/env node
/**
 * Build and Upload to TestFlight
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '..');
const IOS_DIR = path.join(ROOT_DIR, 'ios');
const SECRETS_DIR = path.join(ROOT_DIR, 'secrets');

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
  return execSync(cmd, { stdio: 'inherit', ...options });
}

// Load .env file
function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return {};

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });

  return envVars;
}

async function buildWithXcode() {
  console.log(`\n🍎 Building ${APP_NAME} for TestFlight...\n`);

  const exportOptionsPath = path.join(IOS_DIR, 'exportOptionsAppStore.plist');
  const apiKeyPath = path.join(SECRETS_DIR, `AuthKey_${API_KEY_ID}.p8`);

  // Check API key exists
  if (!fs.existsSync(apiKeyPath)) {
    console.error(`\n❌ API Key not found at ${apiKeyPath}`);
    console.error('Get it from App Store Connect → Users and Access → Keys');
    process.exit(1);
  }

  // Create App Store export options with API key auth
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
  fs.writeFileSync(exportOptionsPath, exportOptions);

  // Clean
  console.log('📦 Step 1/3: Cleaning...');
  try {
    run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} clean`, { cwd: IOS_DIR, stdio: 'pipe' });
  } catch (e) {}

  // Archive with Release configuration
  console.log('🔧 Step 2/3: Building Release archive...');

  // Load env vars
  const envVars = loadEnvFile();
  const envKeys = Object.keys(envVars).filter(k => k.startsWith('EXPO_PUBLIC_'));
  if (envKeys.length > 0) {
    console.log(`   ✓ Loaded ${envKeys.length} environment variables from .env`);
  }

  const buildEnv = {
    ...process.env,
    ...envVars,
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    EX_UPDATES_NATIVE_DEBUG: '0',
  };

  run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} -destination "generic/platform=iOS" -configuration Release -archivePath build/${APP_NAME}.xcarchive archive -allowProvisioningUpdates`, { cwd: IOS_DIR, env: buildEnv });

  // Upload to TestFlight using API key
  console.log('🚀 Step 3/3: Uploading to TestFlight...');

  // Set up private keys directory for xcodebuild
  const privateKeysDir = path.join(os.homedir(), 'private_keys');
  if (!fs.existsSync(privateKeysDir)) {
    fs.mkdirSync(privateKeysDir, { recursive: true });
  }

  // Copy API key to expected location
  const destKeyPath = path.join(privateKeysDir, `AuthKey_${API_KEY_ID}.p8`);
  fs.copyFileSync(apiKeyPath, destKeyPath);

  try {
    run(`xcodebuild -exportArchive -archivePath build/${APP_NAME}.xcarchive -exportOptionsPlist exportOptionsAppStore.plist -allowProvisioningUpdates -authenticationKeyPath "${destKeyPath}" -authenticationKeyID ${API_KEY_ID} -authenticationKeyIssuerID ${API_ISSUER_ID}`, { cwd: IOS_DIR });
  } catch (e) {
    console.log('\n⚠️  API key auth failed, trying with Apple ID...');
    run(`xcodebuild -exportArchive -archivePath build/${APP_NAME}.xcarchive -exportOptionsPlist exportOptionsAppStore.plist -allowProvisioningUpdates`, { cwd: IOS_DIR });
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ UPLOADED TO TESTFLIGHT!');
  console.log('='.repeat(50));
  console.log('🔗 Check status: https://appstoreconnect.apple.com/apps');
  console.log('⏱️  Processing takes 5-15 minutes\n');
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 ${APP_NAME.toUpperCase()} → TESTFLIGHT`);
  console.log('='.repeat(50));

  await buildWithXcode();
}

main().catch(e => {
  console.error('\n❌ Upload failed:', e.message);
  process.exit(1);
});

