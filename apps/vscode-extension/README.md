# VibeTasks - Error Capture for VS Code

Capture VS Code errors and diagnostics as VibeTasks tasks with a single keyboard shortcut. Never lose track of an error again.

## Features

- **Instant Error Capture**: Press `Cmd+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows/Linux) to capture the error at your cursor
- **Batch Capture**: Capture all errors in a file with `Cmd+Shift+Alt+E`
- **Smart Detection**: Automatically detects TypeScript, ESLint, and other language server diagnostics
- **Rich Context**: Includes code snippets, file location, and error details in task notes
- **Project Auto-Detection**: Automatically tags tasks with your workspace folder name
- **Status Bar Integration**: See error count and quick access to capture

## Installation

### From VSIX (Local Development)

1. Build the extension:
   ```bash
   cd apps/vscode-extension
   npm install
   npm run compile
   npm run package
   ```

2. Install in VS Code:
   - Open VS Code
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Extensions: Install from VSIX"
   - Select the generated `.vsix` file

### From Marketplace (Coming Soon)

Search for "VibeTasks" in the VS Code Extensions marketplace.

## Usage

### Capture Single Error

1. Place your cursor on a line with an error (red squiggly)
2. Press `Cmd+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows/Linux)
3. A VibeTasks task is created with:
   - Error message as the title
   - File location and code snippet in notes
   - High priority by default
   - Project tag from workspace folder

### Capture All Errors in File

1. Open a file with errors
2. Press `Cmd+Shift+Alt+E` (Mac) or `Ctrl+Shift+Alt+E` (Windows/Linux)
3. Confirm to create tasks for all errors, or choose "Select Errors" to pick specific ones

### Capture Selected Text

1. Select any error text in your editor
2. Press `Cmd+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows/Linux)
3. The selected text is captured as a task

### Right-Click Menu

Right-click in the editor and select "VibeTasks: Capture Current Error" to capture the error at your cursor.

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `VibeTasks: Capture Current Error` | `Cmd+Shift+E` | Capture error at cursor position |
| `VibeTasks: Capture All Errors in File` | `Cmd+Shift+Alt+E` | Capture all errors in current file |
| `VibeTasks: Select Errors to Capture` | - | Show quick pick to select specific errors |
| `VibeTasks: Login` | - | Login to VibeTasks |
| `VibeTasks: Logout` | - | Logout from VibeTasks |
| `VibeTasks: Show Status` | - | Show current authentication status |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `vibetasks.defaultProject` | `""` | Default project tag (auto-detected if empty) |
| `vibetasks.defaultPriority` | `"high"` | Default priority for captured errors |
| `vibetasks.showStatusBar` | `true` | Show error count in status bar |
| `vibetasks.includeWarnings` | `false` | Include warnings when capturing all errors |

## Authentication

The extension uses secure storage (VS Code's SecretStorage API) to store your authentication tokens. Your credentials are never stored in plain text.

### First-Time Login

1. Press `Cmd+Shift+P` and type "VibeTasks: Login"
2. Enter your VibeTasks email and password
3. You're now authenticated and can capture errors

### Token Refresh

The extension automatically refreshes expired tokens. If your session expires and cannot be refreshed, you'll be prompted to login again.

## Supported Diagnostics

The extension captures diagnostics from:

- **TypeScript/JavaScript**: Type errors, syntax errors
- **ESLint**: Linting warnings and errors
- **Other Language Servers**: Any diagnostics provided by installed language extensions

## Task Format

Captured tasks include:

```markdown
**Location:** `src/components/Button.tsx:42:5`
**Severity:** Error
**Source:** ts 2345

**Error Message:**
```
Argument of type 'string' is not assignable to parameter of type 'number'.
```

**Code Context:**
```tsx
  40 |   const handleClick = () => {
  41 |     // Process the value
> 42 |     processValue("invalid");
  43 |   };
  44 |
```
```

## Development

### Setup

```bash
cd apps/vscode-extension
npm install
```

### Watch Mode

```bash
npm run watch
```

Then press F5 in VS Code to launch the Extension Development Host.

### Build

```bash
npm run compile
```

### Package

```bash
npm run package
```

## Troubleshooting

### "Not logged in" message

Run `VibeTasks: Login` command and enter your credentials.

### No errors detected

Make sure you have language extensions installed (TypeScript, ESLint, etc.) and they are reporting errors. Check the Problems panel (Cmd+Shift+M) to see if VS Code detects any issues.

### Status bar not showing

Check that `vibetasks.showStatusBar` is set to `true` in your settings.

## Privacy

- Authentication tokens are stored securely using VS Code's SecretStorage API
- Error data is only sent when you explicitly capture an error
- No telemetry or analytics are collected by this extension

## Support

- [VibeTasks Documentation](https://vibetasks.com/docs)
- [GitHub Issues](https://github.com/vyassathya/vibetasks/issues)
- [Discord Community](https://discord.gg/vibetasks)

## License

MIT
