# Share Sheet Integration for VibeTasks

This document explains how the Share Sheet integration works and how to test it.

## Overview

VibeTasks now supports receiving shared content from other apps through:
- **iOS Share Sheet** (Share Extension)
- **Android Share Intent**

When users share text, URLs, or images to VibeTasks, it opens the app with a modal to create a task from the shared content.

## Supported Content Types

### Text & URLs
- Plain text from any app
- URLs from browsers, notes, etc.
- Error messages from terminals, consoles, or IDE output

### Images
- Screenshots
- Photos from gallery
- Up to 5 images at once

### Error Detection
The app intelligently detects error content and:
- Sets high priority automatically
- Formats the error in code blocks
- Attempts to detect the project from file paths

Supported error patterns:
- `TypeError`, `ReferenceError`, `SyntaxError`
- TypeScript errors (`error TS...`)
- npm errors (`npm ERR!`)
- Build failures (`Failed to compile`, `Build failed`)
- Python exceptions (`Traceback`, `Exception:`)

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Other Apps    │────▶│  Share Sheet/Intent  │────▶│    VibeTasks    │
│ (Browser, Notes │     │  (iOS Extension /    │     │   (Main App)    │
│  IDE, Terminal) │     │   Android Intent)    │     │                 │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │ share-handler   │
                                                     │    screen       │
                                                     │                 │
                                                     │ - Parse content │
                                                     │ - Edit title    │
                                                     │ - Set priority  │
                                                     │ - Create task   │
                                                     └─────────────────┘
```

## Files

### Core Files
- `app/share-handler.tsx` - Share handler screen (modal)
- `lib/hooks/useShareIntent.ts` - Custom hook for parsing share content
- `lib/stores/share-intent-store.ts` - Global state for share intent
- `components/share/ShareIntentHandler.tsx` - Component to handle navigation

### Configuration
- `app.json` - Plugin configuration for `expo-share-intent`
- `patches/xcode+3.0.1.patch` - Required patch for iOS build

## Testing

### Prerequisites

1. Install dependencies:
   ```bash
   cd apps/mobile
   pnpm install
   ```

2. Build the development client (Share Intent requires native code):
   ```bash
   # Clean previous builds
   rm -rf ios android

   # Prebuild for both platforms
   npx expo prebuild --clean

   # Run on iOS simulator
   npx expo run:ios

   # OR run on Android emulator
   npx expo run:android
   ```

### iOS Testing

1. Open Safari on the iOS Simulator
2. Navigate to any webpage
3. Tap the Share button
4. Scroll to find "VibeTasks Share" in the share sheet
5. Tap it - VibeTasks should open with the shared URL

**Alternative - Share Text:**
1. Open Notes app
2. Write some text (or paste an error message)
3. Select the text
4. Tap Share
5. Choose "VibeTasks Share"

### Android Testing

1. Open Chrome on the Android Emulator
2. Navigate to any webpage
3. Tap the 3-dot menu
4. Tap "Share"
5. Select "TaskFlow" from the share options
6. VibeTasks should open with the shared URL

**Alternative - Share from any app:**
1. Long-press on any text
2. Tap "Share"
3. Select "TaskFlow"

### Testing Error Detection

Share the following text to test error detection:

```
TypeError: Cannot read property 'map' of undefined
    at TaskList (apps/mobile/components/TaskList.tsx:45:12)
    at renderWithHooks (node_modules/react/cjs/react.development.js:1234:22)
```

Expected behavior:
- Title should be: "TypeError: Cannot read property 'map' of undefined"
- Priority should be set to "High"
- Project should be detected as "mobile"
- Notes should contain the full error in a code block

### Testing Screenshot Share

1. Take a screenshot on the device/simulator
2. Open the Photos app
3. Select the screenshot
4. Tap Share
5. Choose VibeTasks
6. You should see the image preview in the share handler

## Configuration Options

The plugin is configured in `app.json`:

```json
[
  "expo-share-intent",
  {
    "iosActivationRules": {
      "NSExtensionActivationSupportsText": true,
      "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
      "NSExtensionActivationSupportsWebPageWithMaxCount": 1,
      "NSExtensionActivationSupportsImageWithMaxCount": 5
    },
    "androidIntentFilters": ["text/*", "image/*"],
    "androidMultiIntentFilters": ["image/*"],
    "iosShareExtensionName": "VibeTasks Share"
  }
]
```

### iOS Activation Rules
- `NSExtensionActivationSupportsText` - Allow sharing plain text
- `NSExtensionActivationSupportsWebURLWithMaxCount` - Allow sharing URLs
- `NSExtensionActivationSupportsWebPageWithMaxCount` - Allow sharing from web pages
- `NSExtensionActivationSupportsImageWithMaxCount` - Allow sharing images

### Android Intent Filters
- `text/*` - Accept any text content
- `image/*` - Accept any image content

## Troubleshooting

### Share Extension Not Appearing (iOS)

1. Ensure you've run `npx expo prebuild --clean`
2. Check that the extension is listed in Xcode targets
3. Verify the app group identifier matches

### Share Intent Not Working (Android)

1. Check that the app was rebuilt after adding the plugin
2. Verify intent filters in `AndroidManifest.xml`
3. Ensure the app has proper permissions

### Build Errors

If you see errors related to `xcode` module:
1. Ensure `patches/xcode+3.0.1.patch` exists
2. Run `pnpm install` to trigger postinstall
3. Delete `ios/` folder and run `npx expo prebuild` again

## Notes

- This feature requires a development build (not Expo Go)
- The share handler screen is presented as a modal
- Users must be authenticated to create tasks
- Unauthenticated users are prompted to sign in
