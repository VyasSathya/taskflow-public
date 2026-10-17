#!/usr/bin/env node
/**
 * Build iOS app with Xcode
 * (Local builds with automatic Diawi upload)
 *
 * Usage: npm run build:xcode
 *
 * After build completes:
 * - Uploads to Diawi automatically (if token configured)
 * - Saves URL to local cache for cross-machine access
 * - Shows QR code for wireless install
 * - Or manually drag IPA to iPhone via Finder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.join(__dirname, '..');
const IOS_DIR = path.join(ROOT_DIR, 'ios');

// Load app.json for app name
const appConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app.json'), 'utf8'));
const APP_NAME = appConfig.expo?.name || 'App';

const EXPORT_DIR = path.join(IOS_DIR, 'build', 'export');
const IPA_PATH = path.join(EXPORT_DIR, `${APP_NAME}.ipa`);
const SECRETS_DIR = path.join(ROOT_DIR, 'secrets');
const DIAWI_TOKEN_PATH = path.join(SECRETS_DIR, 'diawi-token.txt');
const DIAWI_JSON_PATH = path.join(ROOT_DIR, 'builds', 'diawi.json');
const ENV_PATH = path.join(ROOT_DIR, '.env');

/**
 * Load .env file and return environment variables
 */
function loadEnvFile() {
  const envVars = {};

  if (!fs.existsSync(ENV_PATH)) {
    console.warn('⚠️  No .env file found - app may not work correctly');
    return envVars;
  }

  const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) continue;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
    }
  }

  return envVars;
}

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, {
    stdio: 'inherit',
    cwd: IOS_DIR,
    ...options
  });
}

function generateQR(text) {
  try {
    const qrcode = require('qrcode-terminal');
    qrcode.generate(text, { small: true });
  } catch (e) {
    // qrcode-terminal not available
  }
}

/**
 * Save build info to local JSON cache
 */
function saveToLocalJson(buildInfo) {
  try {
    // Ensure builds directory exists
    const buildsDir = path.dirname(DIAWI_JSON_PATH);
    if (!fs.existsSync(buildsDir)) {
      fs.mkdirSync(buildsDir, { recursive: true });
    }

    let data = {};
    if (fs.existsSync(DIAWI_JSON_PATH)) {
      data = JSON.parse(fs.readFileSync(DIAWI_JSON_PATH, 'utf-8'));
    }

    data[buildInfo.platform] = {
      url: buildInfo.diawiUrl,
      qrcode: buildInfo.qrcodeUrl,
      uploaded: new Date().toISOString(),
      note: buildInfo.note || 'Local Xcode build',
    };

    fs.writeFileSync(DIAWI_JSON_PATH, JSON.stringify(data, null, 2));
    console.log('💾 Saved to local cache (builds/diawi.json)');
  } catch (e) {
    console.warn('⚠️  Could not save to local JSON:', e.message);
  }
}

/**
 * Get build number from app.json
 */
function getBuildNumber() {
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return appJson.expo?.ios?.buildNumber || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extract hash from Diawi URL to construct QR code URL
 * e.g., https://i.diawi.com/ABC123 -> https://www.diawi.com/qrcode/ABC123.png
 */
function getDiawiQrcodeUrl(diawiUrl) {
  const match = diawiUrl.match(/diawi\.com\/([a-zA-Z0-9]+)$/);
  if (match) {
    return `https://www.diawi.com/qrcode/${match[1]}.png`;
  }
  return null;
}

async function uploadToDiawi(ipaPath) {
  // Check for token
  if (!fs.existsSync(DIAWI_TOKEN_PATH)) {
    throw new Error('No Diawi token found');
  }

  const token = fs.readFileSync(DIAWI_TOKEN_PATH, 'utf-8').trim();
  if (!token) {
    throw new Error('Diawi token is empty');
  }

  console.log('\n📤 Uploading to Diawi...');

  // Step 1: Upload file
  const uploadResult = execSync(
    `curl -s -X POST "https://upload.diawi.com/" -F "token=${token}" -F "file=@${ipaPath}" -F "wall_of_apps=0"`,
    { encoding: 'utf-8' }
  );
  const { job } = JSON.parse(uploadResult);

  if (!job) {
    throw new Error('No job ID returned from Diawi upload');
  }

  console.log('   Upload started, waiting for processing...');

  // Step 2: Poll for completion (max 60 attempts, 2s each = 2 min)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const statusResult = execSync(
      `curl -s "https://upload.diawi.com/status?token=${token}&job=${job}"`,
      { encoding: 'utf-8' }
    );
    const status = JSON.parse(statusResult);

    if (status.status === 2000) {
      console.log('   Processing complete!');
      return status.link;
    } else if (status.status === 4000) {
      throw new Error(`Diawi processing failed: ${status.message}`);
    }
    // status 2001 = still processing, continue polling
  }

  throw new Error('Diawi upload timed out');
}

async function main() {
  console.log('\n🔨 Building iOS app with Xcode\n');
  console.log('='.repeat(50));
  console.log('Building IdolSing for iOS');
  console.log('='.repeat(50));

  try {
    // Step 1: Clean
    console.log('\n📦 Step 1/4: Cleaning previous build...');
    try {
      run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} clean`, { stdio: 'pipe' });
    } catch (e) {
      // Ignore clean errors
    }

    // Step 2: Build
    console.log('\n🔧 Step 2/4: Building app...');

    // Load .env file
    const envVars = loadEnvFile();

    // Log loaded env vars (without showing sensitive values)
    const envKeys = Object.keys(envVars).filter(k => k.startsWith('EXPO_PUBLIC_'));
    if (envKeys.length > 0) {
      console.log(`   ✓ Loaded ${envKeys.length} environment variables from .env`);
    }

    const buildEnv = {
      ...process.env,
      ...envVars, // Include .env variables
      SENTRY_DISABLE_AUTO_UPLOAD: 'true',
      EX_UPDATES_NATIVE_DEBUG: '1',
    };

    run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} -destination "generic/platform=iOS" -configuration Debug -allowProvisioningUpdates build`, { env: buildEnv });

    // Step 3: Archive
    console.log('\n📦 Step 3/4: Creating archive...');
    run(`xcodebuild -workspace ${APP_NAME}.xcworkspace -scheme ${APP_NAME} -destination "generic/platform=iOS" -configuration Debug -archivePath build/${APP_NAME}.xcarchive archive -allowProvisioningUpdates`, { env: buildEnv });

    // Step 4: Export IPA
    console.log('\n📤 Step 4/4: Exporting IPA...');

    // Create export options plist if needed
    const exportOptionsPath = path.join(IOS_DIR, 'exportOptions.plist');
    if (!fs.existsSync(exportOptionsPath)) {
      const exportOptions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>destination</key>
    <string>export</string>
</dict>
</plist>`;
      fs.writeFileSync(exportOptionsPath, exportOptions);
    }

    // Remove old export if exists
    if (fs.existsSync(EXPORT_DIR)) {
      fs.rmSync(EXPORT_DIR, { recursive: true });
    }

    run(`xcodebuild -exportArchive -archivePath build/${APP_NAME}.xcarchive -exportPath build/export -exportOptionsPlist exportOptions.plist -allowProvisioningUpdates`);

    // Success!
    console.log('\n' + '='.repeat(50));
    console.log('🎉 BUILD SUCCEEDED!');
    console.log('='.repeat(50));
    console.log(`\n📁 IPA Location: ${IPA_PATH}`);

    // Get file size
    const stats = fs.statSync(IPA_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`📊 Size: ${sizeMB} MB`);

    // Try auto-upload to Diawi
    let diawiUrl = null;
    try {
      diawiUrl = await uploadToDiawi(IPA_PATH);
      const qrcodeUrl = getDiawiQrcodeUrl(diawiUrl);
      const buildNumber = getBuildNumber();

      console.log('\n' + '='.repeat(50));
      console.log('📲 SCAN TO INSTALL:');
      console.log('='.repeat(50));
      console.log(`\n🔗 ${diawiUrl}\n`);
      generateQR(diawiUrl);
      console.log('\nScan with iPhone camera to install!');

      // Save build info
      const buildInfo = {
        platform: 'ios',
        buildType: 'dev',
        diawiUrl,
        qrcodeUrl,
        buildNumber,
        note: 'Local Xcode build',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log('\n' + '─'.repeat(50));
      saveToLocalJson(buildInfo);
    } catch (e) {
      // No Diawi token - show manual instructions
      console.log('\n' + '─'.repeat(50));
      console.log('📱 TO INSTALL ON YOUR iPHONE:');
      console.log('─'.repeat(50));
      console.log('\nOption 1: USB Install');
      console.log('  1. Connect iPhone via USB');
      console.log('  2. Drag IdolSing.ipa to iPhone in Finder');
      console.log('');
      console.log('Option 2: QR Code (requires setup)');
      console.log('  Get free Diawi token: https://dashboard.diawi.com/signup');
      console.log('  Save token to: secrets/diawi-token.txt');
      console.log('  Then run build again for auto QR code!');
      console.log('');
      console.log('Option 3: Manual upload');
      console.log('  Upload IPA to https://installonair.com');
      console.log('');
    }

    // Open Finder to the export folder
    execSync(`open "${EXPORT_DIR}"`);

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Xcode is installed and Apple ID is added');
    console.error('  2. Run: open ios/IdolSing.xcworkspace');
    console.error('  3. Try building manually: Product → Build');
    process.exit(1);
  }
}

main();


