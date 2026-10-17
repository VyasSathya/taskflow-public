#!/usr/bin/env node
/**
 * Cross-platform Node.js version checker
 * Ensures Node 22+ is being used
 */

const REQUIRED_MAJOR = 22;

const currentVersion = process.version;
const majorVersion = parseInt(currentVersion.match(/^v(\d+)/)[1], 10);

if (majorVersion < REQUIRED_MAJOR) {
  console.error('\n❌ ERROR: Node.js version mismatch');
  console.error(`   Required: Node ${REQUIRED_MAJOR}+`);
  console.error(`   Current:  ${currentVersion}\n`);
  console.error('Please upgrade Node.js:');
  console.error('  • macOS/Linux: Run "nvm use 22" or "nvm install 22"');
  console.error('  • Windows: Run "nvm use 22" or "nvm install 22"\n');
  process.exit(1);
}

console.log(`✓ Node.js ${currentVersion} (meets requirement: ${REQUIRED_MAJOR}+)`);
