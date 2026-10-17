#!/usr/bin/env node
/**
 * Build and install Android app directly to connected device (USB or Wireless)
 * Cross-platform: Works on macOS, Linux, and Windows
 *
 * Usage:
 *   node scripts/build-device-android.js          # Auto-detect device
 *   node scripts/build-device-android.js pair     # Pair new wireless device
 *   node scripts/build-device-android.js connect  # Connect to paired device
 *
 * Wireless Debugging (Android 11+):
 *   1. Enable Developer Options on phone
 *   2. Enable "Wireless debugging" in Developer Options
 *   3. Run: pnpm android:pair (one-time)
 *   4. Run: pnpm android:connect (each session)
 *   5. Run: pnpm android (build & install)
 *
 * NOTE: Update PACKAGE_NAME for your project
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ============================================
// CONFIGURE THIS FOR YOUR PROJECT
// ============================================
const APP_NAME = 'MyApp';                 // Display name for logs (from app.json expo.name)
const PACKAGE_NAME = 'com.yourcompany.myapp'; // Android package name from app.json
// ============================================

const isWindows = process.platform === 'win32';
const projectRoot = path.join(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');

// Cross-platform gradle command
const gradleCmd = isWindows ? 'gradlew.bat' : './gradlew';

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, {
    stdio: 'inherit',
    cwd: options.cwd || projectRoot,
    shell: isWindows ? true : '/bin/bash',
  });
}

function runCapture(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: options.cwd || projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows ? true : '/bin/bash',
    });
  } catch (e) {
    return e.stdout || '';
  }
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function pairDevice() {
  console.log('📱 Wireless Pairing Mode\n');
  console.log('On your Android device:');
  console.log('  1. Go to Settings > Developer Options > Wireless debugging');
  console.log('  2. Tap "Pair device with pairing code"');
  console.log('  3. Note the IP:Port and Pairing code shown\n');

  const ipPort = await prompt('Enter IP:Port (e.g., 192.168.1.100:37123): ');
  const code = await prompt('Enter pairing code: ');

  if (!ipPort || !code) {
    console.error('❌ IP:Port and pairing code required');
    process.exit(1);
  }

  console.log('\n🔗 Pairing...');
  const result = spawnSync('adb', ['pair', ipPort, code], {
    stdio: 'inherit',
    encoding: 'utf8'
  });

  if (result.status === 0) {
    console.log('\n✅ Paired successfully! Now run: pnpm android:connect');
  } else {
    console.error('\n❌ Pairing failed. Check IP:Port and code.');
  }
}

async function connectDevice() {
  console.log('📱 Wireless Connect Mode\n');
  console.log('On your Android device:');
  console.log('  1. Go to Settings > Developer Options > Wireless debugging');
  console.log('  2. Note the IP address & Port shown (NOT the pairing port)\n');

  const ipPort = await prompt('Enter IP:Port (e.g., 192.168.1.100:43567): ');

  if (!ipPort) {
    console.error('❌ IP:Port required');
    process.exit(1);
  }

  console.log('\n🔗 Connecting...');
  run(`adb connect ${ipPort}`);
  console.log('\n✅ Connected! Now run: pnpm android');
}

function getConnectedDevice() {
  const devices = runCapture('adb devices -l').trim();
  const lines = devices.split('\n').slice(1);

  for (const line of lines) {
    if (line.includes('device') && !line.includes('offline') && !line.includes('unauthorized')) {
      const parts = line.split(/\s+/);
      const deviceId = parts[0];
      const model = line.match(/model:(\S+)/)?.[1] || 'Unknown';
      return { deviceId, model, isWireless: deviceId.includes(':') };
    }
  }
  return null;
}

async function buildAndInstall() {
  console.log(`🔧 Building ${APP_NAME} for Android...\n`);

  // Check for connected device
  console.log('📱 Finding connected device...');
  const device = getConnectedDevice();

  if (!device) {
    console.log('\n❌ No Android device found.\n');
    console.log('Options:');
    console.log('  USB: Connect device and enable USB debugging');
    console.log('  Wireless: Run "pnpm android:pair" then "pnpm android:connect"\n');
    process.exit(1);
  }

  const connType = device.isWireless ? '(wireless)' : '(USB)';
  console.log(`✅ Found: ${device.model} ${connType} [${device.deviceId}]\n`);

  // Check if android folder exists
  if (!fs.existsSync(androidDir)) {
    console.log('📦 Running expo prebuild for Android...');
    run('npx expo prebuild --platform android');
  }

  // Build debug APK
  console.log('\n🏗️  Building debug APK...');
  run(gradleCmd + ' assembleDebug', { cwd: androidDir });

  // Find built APK
  const apkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');

  if (!fs.existsSync(apkPath)) {
    console.error('❌ Built APK not found at:', apkPath);
    process.exit(1);
  }

  // Install to device
  console.log('\n📲 Installing to device...');
  run(`adb -s ${device.deviceId} install -r "${apkPath}"`);

  // Launch the app
  console.log('\n🚀 Launching app...');
  run(`adb -s ${device.deviceId} shell am start -n ${PACKAGE_NAME}/.MainActivity`);

  console.log(`\n✅ Done! ${APP_NAME} is running on your device.`);
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'pair':
      await pairDevice();
      break;
    case 'connect':
      await connectDevice();
      break;
    default:
      await buildAndInstall();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
