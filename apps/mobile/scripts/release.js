#!/usr/bin/env node
/**
 * Release Script
 *
 * Builds and releases to TestFlight (iOS) and/or Play Store (Android)
 *
 * Usage:
 *   pnpm release           # Release both platforms
 *   pnpm release --ios     # iOS only (TestFlight)
 *   pnpm release --android # Android only (Play Store)
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const IOS_ONLY = args.includes('--ios');
const ANDROID_ONLY = args.includes('--android');
const BOTH = !IOS_ONLY && !ANDROID_ONLY;

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 RELEASE');
  console.log('='.repeat(50));

  if (BOTH || IOS_ONLY) {
    console.log('\n🍎 Building iOS for TestFlight...');
    run('eas build --profile production --platform ios --auto-submit --non-interactive');
  }

  if (BOTH || ANDROID_ONLY) {
    console.log('\n🤖 Building Android for Play Store...');
    run('eas build --profile production --platform android --auto-submit --non-interactive');

    console.log('\n📦 Building Android APK (shareable)...');
    run('eas build --profile production-apk --platform android --non-interactive');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ RELEASE COMPLETE');
  console.log('='.repeat(50));
  console.log('\n📱 Check status:');
  console.log('   iOS:     https://appstoreconnect.apple.com/apps');
  console.log('   Android: https://play.google.com/console\n');

  // Show builds
  run('node scripts/show-builds.js');
}

main().catch(e => {
  console.error('\n❌ Release failed:', e.message);
  process.exit(1);
});
