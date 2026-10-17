#!/usr/bin/env node
/**
 * Show builds - displays EAS build status with QR codes and Diawi builds
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let qrcode;
try {
  qrcode = require('qrcode-terminal');
} catch {
  qrcode = null;
}

const DIAWI_JSON_PATH = path.join(__dirname, '..', 'builds', 'diawi.json');

// Get app slug from app.json
function getAppSlug() {
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return appJson.expo?.slug || 'idolsing';
  } catch {
    return 'idolsing';
  }
}

// Get build numbers from app.json
function getLocalBuildNumbers() {
  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return {
      ios: appJson.expo?.ios?.buildNumber || '?',
      android: appJson.expo?.android?.versionCode || '?',
    };
  } catch {
    return { ios: '?', android: '?' };
  }
}

// Fetch Diawi builds from local cache
async function fetchDiawi() {
  try {
    if (!fs.existsSync(DIAWI_JSON_PATH)) {
      return {};
    }
    const localData = JSON.parse(fs.readFileSync(DIAWI_JSON_PATH, 'utf-8'));
    const buildNumbers = getLocalBuildNumbers();
    const result = {};
    if (localData.ios?.url) {
      result.ios = { url: localData.ios.url, time: localData.ios.uploaded, build: buildNumbers.ios };
    }
    if (localData.android?.url) {
      result.android = { url: localData.android.url, time: localData.android.uploaded, build: buildNumbers.android };
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchEAS() {
  try {
    const output = execSync('npx eas build:list --limit 10 --json --non-interactive', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const jsonStart = output.indexOf('[');
    return JSON.parse(jsonStart >= 0 ? output.slice(jsonStart) : output);
  } catch {
    return [];
  }
}

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function icon(status) {
  if (status === 'FINISHED') return '\x1b[32m✓\x1b[0m';
  if (status === 'ERRORED') return '\x1b[31m✗\x1b[0m';
  if (['IN_PROGRESS', 'IN_QUEUE', 'NEW'].includes(status)) return '\x1b[33m○\x1b[0m';
  return '?';
}

async function main() {
  const slug = getAppSlug();

  console.log('\n\x1b[1;35m═══════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1;35m  🎤 IDOLSING BUILDS\x1b[0m');
  console.log('\x1b[1;35m═══════════════════════════════════════════════════════════════\x1b[0m\n');

  const [eas, diawi] = await Promise.all([fetchEAS(), fetchDiawi()]);

  if (eas.length === 0) {
    console.log('  No builds found. Run "pnpm build:devs" to create your first build.\n');
    return;
  }

  // Find builds by type
  const findBuild = (filter) => {
    const finished = eas.find(b => b.status === 'FINISHED' && filter(b));
    if (finished) return finished;
    return eas.find(filter);
  };

  const builds = {
    iosDev: findBuild(b => b.platform === 'IOS' && b.buildProfile === 'development'),
    iosProd: findBuild(b => b.platform === 'IOS' && b.buildProfile === 'production'),
    androidDev: findBuild(b => b.platform === 'ANDROID' && b.buildProfile === 'development'),
    androidApk: findBuild(b => b.platform === 'ANDROID' && b.buildProfile === 'production-apk'),
    androidProd: findBuild(b => b.platform === 'ANDROID' && b.buildProfile === 'production'),
  };

  // Show Diawi builds first (local Xcode builds)
  if (diawi.ios || diawi.android) {
    console.log('\x1b[1;35m  DIAWI BUILDS\x1b[0m \x1b[90m(Local Xcode builds)\x1b[0m\n');

    if (diawi.ios) {
      console.log(`  \x1b[32m✓\x1b[0m \x1b[1miOS #${diawi.ios.build}\x1b[0m  ${diawi.ios.url}`);
      console.log(`             \x1b[90m${timeAgo(diawi.ios.time)} ago\x1b[0m\n`);
      if (qrcode) {
        qrcode.generate(diawi.ios.url, { small: true });
        console.log('');
      }
    }

    if (diawi.android) {
      console.log(`  \x1b[32m✓\x1b[0m \x1b[1mAndroid #${diawi.android.build}\x1b[0m  ${diawi.android.url}`);
      console.log(`             \x1b[90m${timeAgo(diawi.android.time)} ago\x1b[0m\n`);
      if (qrcode) {
        qrcode.generate(diawi.android.url, { small: true });
        console.log('');
      }
    }
  }

  // Table header
  console.log('\x1b[1;33m  EAS BUILDS\x1b[0m\n');
  console.log('  \x1b[90m┌─────────────────┬────────┬───────┐\x1b[0m');
  console.log('  \x1b[90m│\x1b[0m \x1b[1mTYPE\x1b[0m            \x1b[90m│\x1b[0m \x1b[1mSTATUS\x1b[0m \x1b[90m│\x1b[0m \x1b[1mAGE\x1b[0m   \x1b[90m│\x1b[0m');
  console.log('  \x1b[90m├─────────────────┼────────┼───────┤\x1b[0m');

  const rows = [
    { label: 'iOS Dev', build: builds.iosDev },
    { label: 'iOS Prod', build: builds.iosProd },
    { label: 'Android Dev', build: builds.androidDev },
    { label: 'Android APK', build: builds.androidApk },
    { label: 'Android Prod', build: builds.androidProd },
  ];

  for (const { label, build } of rows) {
    if (build) {
      const status = icon(build.status);
      const age = timeAgo(build.completedAt || build.createdAt).padEnd(5);
      console.log(`  \x1b[90m│\x1b[0m ${label.padEnd(15)} \x1b[90m│\x1b[0m   ${status}    \x1b[90m│\x1b[0m ${age} \x1b[90m│\x1b[0m`);
    } else {
      console.log(`  \x1b[90m│\x1b[0m ${label.padEnd(15)} \x1b[90m│\x1b[0m   \x1b[90m-\x1b[0m    \x1b[90m│\x1b[0m \x1b[90m-\x1b[0m     \x1b[90m│\x1b[0m`);
    }
  }

  console.log('  \x1b[90m└─────────────────┴────────┴───────┘\x1b[0m\n');

  // QR codes for finished builds
  if (qrcode) {
    console.log('\x1b[1;32m  QR CODES\x1b[0m \x1b[90m(scan to install)\x1b[0m\n');

    for (const { label, build } of rows) {
      if (build?.status === 'FINISHED' && build.id) {
        const accountName = build.project?.ownerAccount?.name || 'your-expo-account';
        const projectName = build.project?.slug || slug;
        const url = `https://expo.dev/accounts/${accountName}/projects/${projectName}/builds/${build.id}`;
        console.log(`  \x1b[35m${label}\x1b[0m`);
        console.log(`  ${url}\n`);
        qrcode.generate(url, { small: true });
        console.log('');
      }
    }
  }

  // Direct links
  console.log('\x1b[1;37m  COMMANDS\x1b[0m\n');
  console.log('  pnpm build:devs      Build iOS + Android dev clients');
  console.log('  pnpm testflight      Release iOS to TestFlight');
  console.log('  pnpm release:android Release Android to Play Store');
  console.log('  pnpm build:android:apk  Build shareable APK');
  console.log('');
}

main().catch(console.error);
