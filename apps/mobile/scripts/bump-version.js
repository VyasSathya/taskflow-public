#!/usr/bin/env node
/**
 * Bump version numbers in app.json
 *
 * Usage: node scripts/bump-version.js
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

async function main() {
  console.log('\n📦 Bumping version numbers...\n');

  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

  // Parse current version
  const currentVersion = appJson.expo.version || '1.0.0';
  const parts = currentVersion.split('.');

  // Increment patch version
  parts[2] = parseInt(parts[2] || 0, 10) + 1;
  const newVersion = parts.join('.');

  appJson.expo.version = newVersion;

  console.log(`  Version: ${currentVersion} → ${newVersion}`);

  // Write back
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log('\n✅ Updated app.json\n');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
