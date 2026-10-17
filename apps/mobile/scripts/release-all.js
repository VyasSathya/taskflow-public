#!/usr/bin/env node
/**
 * SHIP IT - Build and release everything
 *
 * 1. Build iOS Dev → EAS
 * 2. Build Android Dev → EAS
 * 3. Build Android APK → EAS (for sharing)
 * 4. Submit to stores (optional)
 *
 * Usage: pnpm ship
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     🚀 FULL RELEASE                        ║');
  console.log('║                                                            ║');
  console.log('║  This will build and release:                              ║');
  console.log('║  1. iOS Dev Client → EAS                                   ║');
  console.log('║  2. Android Dev Client → EAS                               ║');
  console.log('║  3. Android APK → EAS (shareable)                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // Step 0: Bump version
    console.log('\n' + '═'.repeat(60));
    console.log('  STEP 0: Bumping version numbers');
    console.log('═'.repeat(60));
    run('node scripts/bump-version.js');

    // Step 1: iOS Dev
    console.log('\n' + '═'.repeat(60));
    console.log('  STEP 1/3: iOS Dev Client');
    console.log('═'.repeat(60));
    run('eas build --profile development --platform ios --non-interactive');

    // Step 2: Android Dev
    console.log('\n' + '═'.repeat(60));
    console.log('  STEP 2/3: Android Dev Client');
    console.log('═'.repeat(60));
    run('eas build --profile development --platform android --non-interactive');

    // Step 3: Android APK
    console.log('\n' + '═'.repeat(60));
    console.log('  STEP 3/3: Android APK (shareable)');
    console.log('═'.repeat(60));
    run('eas build --profile production-apk --platform android --non-interactive');

    // Done!
    const duration = Math.round((Date.now() - startTime) / 60000);

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  🎉 ALL BUILDS COMPLETE!                   ║');
    console.log(`║                    Total time: ${duration} minutes`.padEnd(59) + '║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Show builds with QR codes
    run('node scripts/show-builds.js');

  } catch (error) {
    console.error('\n❌ Release failed:', error.message);
    process.exit(1);
  }
}

main();
