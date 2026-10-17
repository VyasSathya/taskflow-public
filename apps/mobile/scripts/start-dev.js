#!/usr/bin/env node
/**
 * Cross-platform dev server starter
 * Handles Node version check and starts Expo dev server
 */

const { execSync } = require('child_process');
const path = require('path');

// Check Node version first
try {
  execSync('node scripts/check-node-version.js', { stdio: 'inherit', cwd: __dirname + '/..' });
} catch (error) {
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'default'; // default, tunnel, web

// Build expo command - port 8243 (TaskFlow custom port)
let command = 'npx expo start --dev-client --clear --port 8243';

if (mode === 'tunnel') {
  command = 'npx expo start --dev-client --tunnel --clear --port 8243';
} else if (mode === 'web') {
  command = 'npx expo start --web --port 8243';
}

console.log(`\n🚀 Starting Expo dev server (${mode} mode)...\n`);

try {
  execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  process.exit(error.status || 1);
}
