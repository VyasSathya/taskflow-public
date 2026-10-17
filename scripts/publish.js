#!/usr/bin/env node

/**
 * VibeTasks Publish Script
 * Bumps versions and publishes all packages to npm in the correct order
 *
 * Usage:
 *   node scripts/publish.js patch   # Bug fixes (0.4.0 -> 0.4.1)
 *   node scripts/publish.js minor   # New features (0.4.0 -> 0.5.0)
 *   node scripts/publish.js major   # Breaking changes (0.4.0 -> 1.0.0)
 *
 * Prerequisites:
 *   - Token must be set in ~/.npmrc (or NPM_TOKEN env var)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Package order matters - dependencies first
const PACKAGES = [
  { name: '@vibetasks/shared', path: 'packages/shared' },
  { name: '@vibetasks/core', path: 'packages/mcp-core' },
  { name: '@vibetasks/cli', path: 'packages/cli' },
  { name: '@vibetasks/mcp-server', path: 'apps/mcp-server' },
];

// Dependency map - which packages depend on which
const DEPS = {
  '@vibetasks/cli': ['@vibetasks/core', '@vibetasks/shared'],
  '@vibetasks/mcp-server': ['@vibetasks/core'],
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Invalid bump type: ${type}`);
  }
}

function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
    return true;
  } catch (e) {
    return false;
  }
}

// Token read from the NPM_TOKEN environment variable if missing from ~/.npmrc
const NPM_TOKEN = process.env.NPM_TOKEN || '';

function ensureNpmToken() {
  const npmrcPath = join(homedir(), '.npmrc');

  if (existsSync(npmrcPath)) {
    const content = readFileSync(npmrcPath, 'utf8');
    if (content.includes('_authToken=npm_')) {
      console.log('  ~/.npmrc token found\n');
      return true;
    }
  }

  // Set the token
  console.log('  Setting npm token in ~/.npmrc...\n');
  writeFileSync(npmrcPath, `//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n`);
  return true;
}

async function main() {
  const bumpType = process.argv[2] || 'patch';

  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: node scripts/publish.js [patch|minor|major]');
    process.exit(1);
  }

  console.log(`\n VibeTasks Publish - ${bumpType} release\n`);

  // Ensure token is set
  console.log('Checking npm token...');
  ensureNpmToken();

  // Step 1: Bump all versions
  console.log('📦 Bumping versions...\n');
  const newVersions = {};

  for (const pkg of PACKAGES) {
    const pkgPath = join(ROOT, pkg.path, 'package.json');
    const pkgJson = readJson(pkgPath);
    const oldVersion = pkgJson.version;
    const newVersion = bumpVersion(oldVersion, bumpType);

    pkgJson.version = newVersion;
    newVersions[pkg.name] = newVersion;

    writeJson(pkgPath, pkgJson);
    console.log(`  ${pkg.name}: ${oldVersion} -> ${newVersion}`);
  }

  // Step 2: Update dependency versions
  console.log('\n🔗 Updating dependencies...\n');

  for (const [pkgName, deps] of Object.entries(DEPS)) {
    const pkg = PACKAGES.find(p => p.name === pkgName);
    const pkgPath = join(ROOT, pkg.path, 'package.json');
    const pkgJson = readJson(pkgPath);

    for (const dep of deps) {
      if (pkgJson.dependencies?.[dep]) {
        pkgJson.dependencies[dep] = `^${newVersions[dep]}`;
        console.log(`  ${pkgName} -> ${dep}@^${newVersions[dep]}`);
      }
    }

    writeJson(pkgPath, pkgJson);
  }

  // Step 3: Build all packages
  console.log('\n🔨 Building packages...\n');

  for (const pkg of PACKAGES) {
    console.log(`  Building ${pkg.name}...`);
    if (!run('npm run build', join(ROOT, pkg.path))) {
      console.error(`\n❌ Build failed for ${pkg.name}`);
      process.exit(1);
    }
  }

  // Step 4: Publish all packages
  console.log('\n📤 Publishing to npm...\n');

  for (const pkg of PACKAGES) {
    console.log(`  Publishing ${pkg.name}@${newVersions[pkg.name]}...`);
    if (!run('npm publish --access public', join(ROOT, pkg.path))) {
      console.error(`\n❌ Publish failed for ${pkg.name}`);
      console.log('You may need to run: npm login');
      process.exit(1);
    }
  }

  // Success!
  console.log('\n✅ All packages published successfully!\n');
  console.log('New versions:');
  for (const [name, version] of Object.entries(newVersions)) {
    console.log(`  ${name}@${version}`);
  }
  console.log('\nUsers can update with:');
  console.log('  npm install -g @vibetasks/cli @vibetasks/mcp-server\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
