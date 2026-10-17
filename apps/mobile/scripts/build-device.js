#!/usr/bin/env node
/**
 * Build and install iOS app directly to connected device
 * macOS only - requires Xcode
 * Usage: node scripts/build-device.js
 *
 * NOTE: Update APP_NAME, WORKSPACE_NAME, and TEAM_ID for your project
 */

const { execSync } = require('child_process');
const path = require('path');

// iOS builds only work on macOS
if (process.platform !== 'darwin') {
  console.error('❌ iOS builds only work on macOS with Xcode.');
  console.log('💡 For Android builds, use: pnpm android');
  process.exit(1);
}

// ============================================
// CONFIGURE THESE FOR YOUR PROJECT
// ============================================
const APP_NAME = 'TaskFlow';              // From app.json expo.name
const WORKSPACE_NAME = 'TaskFlow';        // Usually same as APP_NAME
const TEAM_ID = 'YOUR_TEAM_ID';             // Your Apple Developer Team ID
// ============================================

const projectRoot = path.join(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, {
    stdio: 'inherit',
    cwd: options.cwd || projectRoot,
    env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }
  });
}

function runCapture(cmd, options = {}) {
  return execSync(cmd, {
    cwd: options.cwd || projectRoot,
    env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
    encoding: 'utf8'
  });
}

async function main() {
  console.log(`🔧 Building ${APP_NAME} for device...\n`);

  // Get connected device
  console.log('📱 Finding connected device...');
  const deviceList = runCapture('xcrun devicectl list devices 2>/dev/null');
  const deviceMatch = deviceList.match(/([A-F0-9-]{36})\s+available \(paired\)/);

  if (!deviceMatch) {
    console.error('❌ No paired device found. Connect your iPhone and trust it.');
    process.exit(1);
  }

  const deviceId = deviceMatch[1];
  console.log(`✅ Found device: ${deviceId}\n`);

  // Install pods if needed
  console.log('📦 Installing CocoaPods...');
  run('pod install', { cwd: iosDir });

  // Build
  console.log('\n🏗️  Building app...');
  run(`xcodebuild -workspace ${WORKSPACE_NAME}.xcworkspace -scheme ${APP_NAME} -destination "generic/platform=iOS" -configuration Debug -allowProvisioningUpdates DEVELOPMENT_TEAM=${TEAM_ID} build`, { cwd: iosDir });

  // Find built app
  const derivedData = runCapture('echo ~/Library/Developer/Xcode/DerivedData').trim();
  const appPath = `${derivedData}/${APP_NAME}-*/Build/Products/Debug-iphoneos/${APP_NAME}.app`.replace('~', process.env.HOME);

  // Get actual path
  const actualAppPath = runCapture(`ls -d ${appPath} 2>/dev/null | head -1`).trim();

  if (!actualAppPath) {
    console.error('❌ Built app not found');
    process.exit(1);
  }

  // Install to device
  console.log('\n📲 Installing to device...');
  run(`xcrun devicectl device install app --device ${deviceId} "${actualAppPath}"`);

  console.log(`\n✅ Done! Open ${APP_NAME} on your device.`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
