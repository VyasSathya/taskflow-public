# VibeTasks CLI - npm Publishing Guide

## 📦 Publishing to npm

This guide walks through publishing `@vibetasks/cli` and `@vibetasks/mcp-core` to npm.

---

## Prerequisites

1. **npm account** - Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **Automation token** - Required for OTP-free publishing (see below)

---

## Setting Up Automation Token (No OTP Required)

If you have 2FA enabled on your npm account, you need an **Automation** token to bypass OTP for publishing.

### Create Automation Token:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **"Generate New Token"** → **"Granular Access Token"**
3. Configure:
   - **Name**: `VibeTasks Automation`
   - **Expiration**: 90 days or longer
   - **Packages**: Select `@vibetasks` scope with Read and Write
   - **Environment**: Select **"Automation"** (bypasses 2FA!)
4. Copy the token (starts with `npm_`)

### Save Token to .npmrc:

```bash
# Replace YOUR_TOKEN with your actual token
echo //registry.npmjs.org/:_authToken=YOUR_TOKEN > ~/.npmrc
```

Example:
```bash
echo //registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN > ~/.npmrc
```

### Verify Setup:

```bash
npm whoami
# Should show your npm username
```

---

## Alternative: Login with OTP

If you prefer using OTP each time:

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- 2FA code (if enabled)

Verify you're logged in:
```bash
npm whoami
# Should show your npm username
```

---

## Step 2: Publish mcp-core (Dependency First)

The CLI depends on `@vibetasks/mcp-core`, so publish it first:

```bash
cd packages/mcp-core

# Build the package
npm run build

# Check what will be published
npm pack --dry-run

# Publish to npm
npm publish --access public
```

**Expected output:**
```
+ @vibetasks/mcp-core@0.1.0
```

Verify it's published:
```bash
npm view @vibetasks/mcp-core
```

---

## Step 3: Publish CLI

Now publish the main CLI package:

```bash
cd ../cli

# Build the package
npm run build

# Check what will be published
npm pack --dry-run

# Publish to npm
npm publish --access public
```

**Expected output:**
```
+ @vibetasks/cli@0.1.0
```

Verify it's published:
```bash
npm view @vibetasks/cli
```

---

## Step 4: Test Installation

Test installing from npm in a different location:

```bash
# Test global installation
npm install -g @vibetasks/cli

# Verify it works
vibetasks --version
# Should output: 0.1.0

vibetasks --help
# Should show all commands

# Test the auto-tagging feature
cd ~/Projects/vibetasks
vibetasks add "Test task from npm package"
# Should auto-detect project: "vibetasks"
```

---

## Step 5: Update Documentation

Once published, update these files:

### 1. Main README
```bash
# In vibetasks/README.md, add installation section:
```

```markdown
## 📦 Installation

### CLI
```bash
npm install -g @vibetasks/cli
```

### MCP Server
See [apps/mcp-server/README.md](apps/mcp-server/README.md)
```

### 2. IMPLEMENTATION-AUTO-TAGGING.md

Update the installation section to reference npm instead of local paths.

---

## Publishing Updates (Future Releases)

When you make changes and want to publish an update:

### 1. Update Version Number

```bash
# In packages/cli/package.json, bump version:
# 0.1.0 → 0.1.1 (patch - bug fixes)
# 0.1.0 → 0.2.0 (minor - new features)
# 0.1.0 → 1.0.0 (major - breaking changes)
```

Also update version in `packages/cli/bin/vibetasks.ts`:
```typescript
program
  .version('0.1.1'); // Match package.json
```

### 2. Build and Publish

```bash
cd packages/cli
npm run build
npm publish
```

### 3. Publish mcp-core (if it changed)

```bash
cd ../mcp-core
# Update version in package.json
npm run build
npm publish
```

---

## Version Management Best Practices

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.0 → 0.1.1): Bug fixes, no API changes
  ```bash
  npm version patch
  ```

- **MINOR** (0.1.0 → 0.2.0): New features, backwards compatible
  ```bash
  npm version minor
  ```

- **MAJOR** (0.1.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  ```

The `npm version` command automatically:
1. Updates package.json
2. Creates a git commit
3. Creates a git tag

Then just:
```bash
npm publish
git push --tags
```

---

## Package Contents

### @vibetasks/cli includes:

```
dist/
├── vibetasks.js        # Main CLI executable
└── (bundled deps)     # All dependencies bundled
```

### @vibetasks/mcp-core includes:

```
dist/
├── index.js           # Main exports
└── index.d.ts         # TypeScript definitions
```

---

## Troubleshooting

### "You must be logged in to publish packages"

```bash
npm login
```

### "You do not have permission to publish"

The package name might be taken. Try:
```bash
# Use scoped package with your npm username
# Change in package.json:
{
  "name": "@yourusername/vibetasks-cli"
}
```

### "Package name too similar to existing package"

Choose a different name:
- `vibetasks-cli-pro`
- `@yourusername/vibetasks`
- `tf-cli`

### "402 Payment Required" for scoped packages

Add to package.json:
```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### Build fails

Check dependencies are installed:
```bash
npm install
npm run build
```

---

## Post-Publishing Checklist

- [ ] Verify package on npm: `npm view @vibetasks/cli`
- [ ] Test global install: `npm install -g @vibetasks/cli`
- [ ] Test `vibetasks --version` works
- [ ] Test `vibetasks add` auto-detects project
- [ ] Test `vibetasks list` shows new filters
- [ ] Update GitHub README with npm install command
- [ ] Create GitHub release with version tag
- [ ] Tweet about the release! 🎉

---

## Package URLs

After publishing, packages will be available at:

- npm: https://www.npmjs.com/package/@vibetasks/cli
- npm (mcp-core): https://www.npmjs.com/package/@vibetasks/mcp-core
- GitHub: https://github.com/vyassathya/vibetasks

---

## Unpublishing (If Needed)

⚠️ **Warning:** Can only unpublish within 72 hours!

```bash
# Unpublish specific version
npm unpublish @vibetasks/cli@0.1.0

# Unpublish entire package (within 72 hours)
npm unpublish @vibetasks/cli --force
```

---

## Next Steps After Publishing

1. **Create GitHub Release**
   - Go to https://github.com/vyassathya/vibetasks/releases/new
   - Tag: `v0.1.0`
   - Title: `VibeTasks CLI v0.1.0 - Auto-Project Tagging`
   - Description: Copy from IMPLEMENTATION-AUTO-TAGGING.md

2. **Update Main README**
   - Add npm installation badge
   - Link to CLI documentation

3. **Share on Social Media**
   - Twitter/X
   - Dev.to
   - Reddit (r/commandline, r/productivity)
   - Hacker News (Show HN)

4. **Monitor Issues**
   - Check npm for download stats
   - Watch GitHub for issues
   - Respond to user feedback

---

## Success! 🎉

Your VibeTasks CLI is now published and available to developers worldwide!

```bash
npm install -g @vibetasks/cli
```

Users can now enjoy:
- ✅ Auto-project tagging
- ✅ AI detection
- ✅ Status flow (todo/vibing/done)
- ✅ Energy level matching
- ✅ Multi-project support
