#!/usr/bin/env node
/**
 * VibeTasks Daemon Worker
 *
 * This script runs as a background process to:
 * - Listen for global keyboard shortcuts
 * - Capture clipboard content
 * - Parse for errors
 * - Show notifications
 * - Optionally create tasks
 *
 * It is spawned by `vibetasks daemon start` and runs independently.
 */

import { daemonConfigManager } from './utils/daemon-config.js';
import {
  detectError,
  getErrorSummary,
  formatErrorForNotes,
  ErrorInfo,
} from './utils/clipboard-monitor.js';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { generateErrorTaskTitle } from '@vibetasks/shared';

// Logging helper for background process
function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`${timestamp} ${prefix} ${message}`);
}

// Main daemon loop
async function main(): Promise<void> {
  log('VibeTasks daemon worker starting...');

  const config = await daemonConfigManager.getConfig();
  const shortcut = daemonConfigManager.parseShortcut(config.keyboard_shortcut);

  log(`Configured shortcut: ${config.keyboard_shortcut}`);
  log(`Parsed: Ctrl=${shortcut.ctrl} Alt=${shortcut.alt} Shift=${shortcut.shift} Key=${shortcut.key}`);

  // Try to set up keyboard listener
  let keyListener: any = null;

  try {
    const { GlobalKeyboardListener } = await import('node-global-key-listener');
    keyListener = new GlobalKeyboardListener();

    let modifiersPressed = { ctrl: false, alt: false, shift: false };
    let lastTriggerTime = 0;
    const debounceMs = 500; // Prevent multiple triggers

    keyListener.addListener((event: any, down: any) => {
      const keyName = (event.name || '').toUpperCase();

      // Track modifier state
      if (keyName.includes('CTRL')) {
        modifiersPressed.ctrl = event.state === 'DOWN';
      }
      if (keyName.includes('ALT')) {
        modifiersPressed.alt = event.state === 'DOWN';
      }
      if (keyName.includes('SHIFT')) {
        modifiersPressed.shift = event.state === 'DOWN';
      }

      // Check if shortcut key is pressed with correct modifiers
      if (
        event.state === 'DOWN' &&
        keyName === shortcut.key.toUpperCase() &&
        modifiersPressed.ctrl === shortcut.ctrl &&
        modifiersPressed.alt === shortcut.alt &&
        modifiersPressed.shift === shortcut.shift
      ) {
        const now = Date.now();
        if (now - lastTriggerTime > debounceMs) {
          lastTriggerTime = now;
          log('Keyboard shortcut triggered!');
          handleShortcutTriggered(config).catch((err) => {
            log(`Error handling shortcut: ${err.message}`, 'error');
          });
        }
      }
    });

    log('Keyboard listener initialized successfully');
    log('Daemon is now listening for keyboard shortcuts...');

    // Show startup notification
    await showNotification(
      'VibeTasks Daemon',
      `Running! Press ${config.keyboard_shortcut} to capture errors.`,
      'info'
    );

  } catch (error: any) {
    log(`Failed to initialize keyboard listener: ${error.message}`, 'error');
    log('The daemon will continue running but keyboard shortcuts will not work.', 'warn');
    log('Install node-global-key-listener: npm install node-global-key-listener', 'warn');
  }

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down...');
    await cleanup(keyListener);
  });

  process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down...');
    await cleanup(keyListener);
  });

  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'error');
    log(error.stack || '', 'error');
  });

  process.on('unhandledRejection', (reason) => {
    log(`Unhandled rejection: ${reason}`, 'error');
  });

  // Keep the process alive
  await new Promise(() => {});
}

/**
 * Cleanup before exit
 */
async function cleanup(keyListener: any): Promise<void> {
  if (keyListener && keyListener.kill) {
    keyListener.kill();
  }
  await daemonConfigManager.removePid();
  log('Daemon shutdown complete');
  process.exit(0);
}

/**
 * Handle keyboard shortcut being triggered
 */
async function handleShortcutTriggered(config: any): Promise<void> {
  try {
    // Import clipboardy
    const clipboard = await import('clipboardy');
    const content = await clipboard.default.read();

    if (!content || content.trim().length === 0) {
      log('Clipboard is empty');
      await showNotification('VibeTasks', 'Clipboard is empty', 'info');
      return;
    }

    log(`Clipboard captured: ${content.length} characters`);

    const error = detectError(content);

    if (!error) {
      log('No error pattern detected in clipboard');
      await showNotification('VibeTasks', 'No error detected in clipboard', 'info');
      return;
    }

    log(`Error detected: ${error.error_type || 'Unknown'} - ${(error.message || '').substring(0, 50)}...`);

    const summary = getErrorSummary(error);

    // Show notification
    await showNotification(
      'VibeTasks: Error Detected',
      summary,
      'error',
      config.notification_duration
    );

    // Auto-create task if configured
    if (config.auto_create_task) {
      log('Auto-creating task from error...');
      await createTaskFromError(error);
    }
  } catch (err: any) {
    log(`Error in shortcut handler: ${err.message}`, 'error');
    await showNotification('VibeTasks Error', err.message, 'error');
  }
}

/**
 * Show system notification
 */
async function showNotification(
  title: string,
  message: string,
  type: 'info' | 'error' | 'success' = 'info',
  duration?: number
): Promise<void> {
  try {
    const notifier = await import('node-notifier');

    const options: any = {
      title,
      message: message.substring(0, 256),
      sound: type === 'error',
      wait: false,
    };

    // Windows-specific options
    if (process.platform === 'win32') {
      options.appID = 'VibeTasks';
    }

    notifier.default.notify(options);
    log(`Notification shown: ${title}`);
  } catch (error: any) {
    log(`Failed to show notification: ${error.message}`, 'warn');
  }
}

// generateTaskTitle is now imported from @vibetasks/shared as generateErrorTaskTitle

/**
 * Create a task from a parsed error
 */
async function createTaskFromError(error: ErrorInfo): Promise<void> {
  try {
    const authManager = new AuthManager();
    const taskOps = await TaskOperations.fromAuthManager(authManager);

    const title = generateErrorTaskTitle(error);
    const notes = formatErrorForNotes(error);
    const category = error.category || 'general';

    const task = await taskOps.createTask({
      title,
      notes,
      notes_format: 'markdown',
      priority: category === 'typescript' ? 'medium' : 'high',
      created_by: 'ai',
      status: 'todo',
      source_type: 'cli',
      error_context: error,
    });

    log(`Task created: ${task.id}`);
    await showNotification(
      'VibeTasks: Task Created',
      `Created: ${title.substring(0, 100)}`,
      'success'
    );
  } catch (err: any) {
    log(`Failed to create task: ${err.message}`, 'error');

    if (err.message.includes('Not authenticated')) {
      log('User not authenticated. Task creation skipped.', 'warn');
    }
  }
}

// Run the daemon
main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
