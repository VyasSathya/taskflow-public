# VibeTasks Browser Extension

Capture DevTools console errors and send them directly to VibeTasks for tracking.

## Features

- **Right-click to capture**: Select error text in DevTools Console, right-click, and choose "Send to VibeTasks"
- **Automatic error detection**: Extension captures console.error and unhandled exceptions
- **Smart parsing**: Extracts error type, file location, and creates meaningful task titles
- **DevTools panel**: Dedicated VibeTasks panel in DevTools for quick error capture
- **Project auto-detection**: Automatically detects project from URL/file paths
- **Cross-browser**: Works on Chrome and Firefox (MV3 compatible)

## Installation

### Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `apps/browser-extension` folder
5. The VibeTasks icon should appear in your toolbar

### Firefox (Developer Mode)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select any file in the `apps/browser-extension` folder (e.g., `manifest.json`)
4. The VibeTasks icon should appear in your toolbar

## Setup

1. Click the VibeTasks extension icon in your toolbar
2. Click "Sign In to VibeTasks"
3. Log in with your VibeTasks account
4. Once connected, you're ready to capture errors!

## Usage

### Method 1: Right-click Selection

1. Open DevTools (F12)
2. Go to the Console tab
3. Select an error message (text selection)
4. Right-click and choose "Send to VibeTasks"
5. A toast notification confirms the error was captured

### Method 2: DevTools Panel

1. Open DevTools (F12)
2. Click on the "VibeTasks" tab (or find it in the sidebar)
3. Paste or type the error in the text area
4. Optionally set project and priority
5. Click "Send to VibeTasks"

### Method 3: Quick Capture (Popup)

1. Click the VibeTasks extension icon
2. Paste the error in the "Quick Capture" section
3. Click "Send Error"

### Method 4: Page Context Menu

1. Right-click anywhere on a page
2. Choose "Capture page errors to VibeTasks"
3. All captured console errors from the page will be sent

## Settings

Click the extension icon to access settings:

- **Show Notifications**: Toggle toast notifications on/off
- **Auto-detect Project**: Automatically detect project from page URL
- **Default Project**: Set a default project for all captured errors

## How Errors are Processed

The extension:

1. **Parses the error** - Identifies error type (TypeError, SyntaxError, etc.)
2. **Extracts location** - Finds file path and line number from stack trace
3. **Detects project** - Looks for project hints in file paths or URL
4. **Creates task** with:
   - Title: Summarized error message (max 80 chars)
   - Notes: Full stack trace in markdown code block
   - Priority: High (errors should be fixed!)
   - Project: Auto-detected or from settings

## Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension manifest (MV3)
├── icons/                  # Extension icons
│   ├── icon.svg           # Source SVG
│   └── icon{16,32,48,128}.png
├── src/
│   ├── background.js      # Service worker (handles messaging)
│   ├── content.js         # Content script (captures errors)
│   ├── popup.html/js      # Extension popup UI
│   ├── devtools.html/js   # DevTools integration
│   ├── devtools-panel.html/js  # DevTools panel UI
│   ├── config.js          # Configuration and storage helpers
│   ├── supabase.js        # Supabase client for task creation
│   ├── error-parser.js    # Error parsing utilities
│   └── auth-listener.js   # Auth callback handler
└── scripts/
    └── create-placeholder-icons.js
```

### Building Icons

For production, replace placeholder icons with proper PNG files:

```bash
# Using ImageMagick
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 32x32 icons/icon32.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

Or use an online SVG to PNG converter.

### Testing

1. Load the extension in developer mode
2. Open any website
3. Open DevTools Console
4. Run: `console.error('Test error')`
5. Right-click the error and send to VibeTasks

## API Integration

The extension communicates with VibeTasks via Supabase:

- **Authentication**: Uses same Supabase auth as VibeTasks web/CLI
- **Task Creation**: Inserts directly into `tasks` table
- **No additional backend required**: Uses existing VibeTasks infrastructure

## Troubleshooting

### "Not connected" error
- Click the extension icon and sign in again
- Make sure you have a VibeTasks account

### Context menu not appearing
- Make sure you've selected text before right-clicking
- Try refreshing the page

### DevTools panel not showing
- Close and reopen DevTools
- Check that the extension is enabled

### Errors not being captured
- Refresh the page (content script needs to load)
- Check that the extension has permissions for the site

## Browser Compatibility

| Feature | Chrome | Firefox | Edge |
|---------|--------|---------|------|
| Context menu | ✅ | ✅ | ✅ |
| DevTools panel | ✅ | ✅ | ✅ |
| Error capture | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |

## Privacy

- The extension only captures errors you explicitly send
- No automatic data collection or tracking
- Authentication tokens are stored locally in browser storage
- Only communicates with VibeTasks Supabase backend

## License

Part of the VibeTasks project.
