import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { daemonConfigManager, DaemonConfig } from '../utils/daemon-config.js';
import {
  detectError,
  getErrorSummary,
  formatErrorForNotes,
  ErrorInfo,
} from '../utils/clipboard-monitor.js';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { generateErrorTaskTitle } from '@vibetasks/shared';

// Get directory for the daemon worker script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * VibeTasks Daemon Command
 *
 * Background service that:
 * - Registers global keyboard shortcut (Ctrl+Alt+E by default)
 * - Captures clipboard content when triggered
 * - Parses for errors
 * - Shows system notifications
 * - Optionally creates tasks from errors
 */
export const daemonCommand = new Command('daemon')
  .description('Manage the VibeTasks error capture daemon')
  .addCommand(createStartCommand())
  .addCommand(createStopCommand())
  .addCommand(createStatusCommand())
  .addCommand(createConfigureCommand())
  .addCommand(createCaptureCommand());

/**
 * Start daemon command
 */
function createStartCommand(): Command {
  return new Command('start')
    .description('Start the error capture daemon')
    .option('-f, --foreground', 'Run in foreground (useful for debugging)')
    .option('--no-notify', 'Disable startup notification')
    .action(async (options) => {
      const spinner = ora('Starting VibeTasks daemon...').start();

      try {
        // Check if already running
        if (await daemonConfigManager.isDaemonRunning()) {
          spinner.warn(chalk.yellow('Daemon is already running'));
          const pid = await daemonConfigManager.getPid();
          console.log(chalk.gray(`PID: ${pid}`));
          process.exit(0);
        }

        const config = await daemonConfigManager.getConfig();

        if (!config.enabled) {
          spinner.fail(chalk.red('Daemon is disabled in configuration'));
          console.log(chalk.gray('Run: vibetasks daemon configure --enable'));
          process.exit(1);
        }

        if (options.foreground) {
          spinner.succeed(chalk.green('Starting daemon in foreground mode'));
          console.log(chalk.gray('Press Ctrl+C to stop\n'));
          await runDaemonForeground(config);
        } else {
          // Start daemon as background process
          const daemonProcess = await startDaemonBackground(config);

          if (daemonProcess && daemonProcess.pid) {
            await daemonConfigManager.savePid(daemonProcess.pid);
            spinner.succeed(chalk.green('VibeTasks daemon started'));
            console.log(chalk.gray(`PID: ${daemonProcess.pid}`));
            console.log(chalk.cyan(`Keyboard shortcut: ${config.keyboard_shortcut}`));
            console.log(chalk.gray('\nThe daemon is now running in the background.'));
            console.log(chalk.gray('Use "vibetasks daemon stop" to stop it.'));
          } else {
            throw new Error('Failed to start daemon process');
          }
        }

        process.exit(0);
      } catch (error: any) {
        spinner.fail(chalk.red('Failed to start daemon'));
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Stop daemon command
 */
function createStopCommand(): Command {
  return new Command('stop')
    .description('Stop the error capture daemon')
    .action(async () => {
      const spinner = ora('Stopping VibeTasks daemon...').start();

      try {
        const pid = await daemonConfigManager.getPid();

        if (!pid) {
          spinner.warn(chalk.yellow('Daemon is not running'));
          process.exit(0);
        }

        try {
          // Send SIGTERM to gracefully stop the daemon
          process.kill(pid, 'SIGTERM');

          // Wait a moment for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check if still running and force kill if needed
          try {
            process.kill(pid, 0); // Check if process exists
            process.kill(pid, 'SIGKILL'); // Force kill
          } catch {
            // Process already stopped
          }

          await daemonConfigManager.removePid();
          spinner.succeed(chalk.green('VibeTasks daemon stopped'));
        } catch (error: any) {
          if (error.code === 'ESRCH') {
            // Process doesn't exist
            await daemonConfigManager.removePid();
            spinner.warn(chalk.yellow('Daemon was not running (stale PID file removed)'));
          } else {
            throw error;
          }
        }

        process.exit(0);
      } catch (error: any) {
        spinner.fail(chalk.red('Failed to stop daemon'));
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Status command
 */
function createStatusCommand(): Command {
  return new Command('status')
    .description('Check daemon status')
    .action(async () => {
      try {
        const isRunning = await daemonConfigManager.isDaemonRunning();
        const config = await daemonConfigManager.getConfig();
        const pid = await daemonConfigManager.getPid();

        console.log(chalk.blue.bold('\nVibeTasks Daemon Status\n'));

        if (isRunning) {
          console.log(chalk.green('  Status: Running'));
          console.log(chalk.gray(`  PID: ${pid}`));
        } else {
          console.log(chalk.yellow('  Status: Stopped'));
        }

        console.log(chalk.gray(`  Enabled: ${config.enabled ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Keyboard Shortcut: ${config.keyboard_shortcut}`));
        console.log(chalk.gray(`  Auto-start: ${config.auto_start ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Auto-create tasks: ${config.auto_create_task ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Config path: ${daemonConfigManager.getConfigDir()}`));
        console.log();

        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Configure command
 */
function createConfigureCommand(): Command {
  return new Command('configure')
    .description('Configure daemon settings')
    .option('--enable', 'Enable the daemon')
    .option('--disable', 'Disable the daemon')
    .option('--shortcut <keys>', 'Set keyboard shortcut (e.g., "Ctrl+Alt+E")')
    .option('--auto-start <bool>', 'Enable/disable auto-start on login')
    .option('--auto-task <bool>', 'Automatically create tasks from errors')
    .option('--notification-duration <ms>', 'Notification display duration in ms')
    .option('--reset', 'Reset to default configuration')
    .action(async (options) => {
      try {
        if (options.reset) {
          const { DEFAULT_DAEMON_CONFIG } = await import('../utils/daemon-config.js');
          await daemonConfigManager.saveConfig(DEFAULT_DAEMON_CONFIG);
          console.log(chalk.green('\nConfiguration reset to defaults\n'));
          process.exit(0);
        }

        const updates: Partial<DaemonConfig> = {};

        if (options.enable) updates.enabled = true;
        if (options.disable) updates.enabled = false;
        if (options.shortcut) updates.keyboard_shortcut = options.shortcut;
        if (options.autoStart !== undefined) updates.auto_start = options.autoStart === 'true';
        if (options.autoTask !== undefined) updates.auto_create_task = options.autoTask === 'true';
        if (options.notificationDuration) updates.notification_duration = parseInt(options.notificationDuration, 10);

        if (Object.keys(updates).length === 0) {
          // Show current config
          const config = await daemonConfigManager.getConfig();
          console.log(chalk.blue.bold('\nDaemon Configuration\n'));
          console.log(JSON.stringify(config, null, 2));
          console.log();
        } else {
          await daemonConfigManager.saveConfig(updates);
          console.log(chalk.green('\nConfiguration updated\n'));

          // If daemon is running, remind to restart
          if (await daemonConfigManager.isDaemonRunning()) {
            console.log(chalk.yellow('Note: Restart the daemon for changes to take effect'));
            console.log(chalk.gray('Run: vibetasks daemon stop && vibetasks daemon start\n'));
          }
        }

        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Manual capture command (for testing without keyboard shortcut)
 */
function createCaptureCommand(): Command {
  return new Command('capture')
    .description('Manually capture clipboard and check for errors')
    .option('--create-task', 'Create a task from the captured error')
    .option('--raw', 'Show raw clipboard content')
    .action(async (options) => {
      const spinner = ora('Capturing clipboard...').start();

      try {
        // Dynamic import for clipboardy (ESM module)
        const clipboard = await import('clipboardy');
        const content = await clipboard.default.read();

        spinner.stop();

        if (!content || content.trim().length === 0) {
          console.log(chalk.yellow('\nClipboard is empty\n'));
          process.exit(0);
        }

        if (options.raw) {
          console.log(chalk.blue.bold('\nClipboard Content:\n'));
          console.log(content);
          console.log();
        }

        const error = detectError(content);

        if (!error) {
          console.log(chalk.yellow('\nNo error detected in clipboard content\n'));
          if (!options.raw) {
            console.log(chalk.gray('First 200 characters:'));
            console.log(chalk.gray(content.substring(0, 200) + (content.length > 200 ? '...' : '')));
            console.log();
          }
          process.exit(0);
        }

        console.log(chalk.red.bold('\nError Detected!\n'));
        console.log(chalk.cyan('Type: ') + chalk.white(error.error_type || 'Unknown'));
        console.log(chalk.cyan('Category: ') + chalk.white(error.category || 'general'));
        console.log(chalk.cyan('Message: ') + chalk.white(error.message || ''));

        if (error.file_path) {
          console.log(chalk.cyan('File: ') + chalk.white(error.file_path));
          if (error.line_number) {
            console.log(chalk.cyan('Line: ') + chalk.white(error.line_number.toString()) +
              (error.column ? chalk.gray(`:${error.column}`) : ''));
          }
        }

        if (error.suggestion) {
          console.log(chalk.green('\nSuggestion: ') + chalk.white(error.suggestion));
        }

        if (error.stack_trace) {
          console.log(chalk.cyan('\nStack Trace (first 5 lines):'));
          const stackLines = error.stack_trace.split('\n').slice(0, 5);
          stackLines.forEach((line: string) => {
            console.log(chalk.gray('  ' + line));
          });
        }

        if (options.createTask) {
          console.log();
          await createTaskFromError(error);
        }

        console.log();
        process.exit(0);
      } catch (error: any) {
        spinner.fail(chalk.red('Failed to capture clipboard'));
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

/**
 * Start daemon as background process
 */
async function startDaemonBackground(config: DaemonConfig): Promise<ChildProcess | null> {
  // Get the path to the daemon worker script
  const workerPath = path.resolve(__dirname, '..', 'daemon-worker.js');

  // Spawn detached process
  const child = spawn(process.execPath, [workerPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      VIBETASKS_DAEMON: 'true',
      VIBETASKS_SHORTCUT: config.keyboard_shortcut,
    },
  });

  // Unref to allow parent to exit
  child.unref();

  return child;
}

/**
 * Run daemon in foreground mode
 */
async function runDaemonForeground(config: DaemonConfig): Promise<void> {
  console.log(chalk.blue.bold('VibeTasks Error Capture Daemon'));
  console.log(chalk.gray(`Keyboard shortcut: ${config.keyboard_shortcut}`));
  console.log(chalk.gray('Listening for keyboard shortcut...\n'));

  // Import keyboard listener
  let keyListener: any;

  try {
    // Try node-global-key-listener first (better Windows support)
    const { GlobalKeyboardListener } = await import('node-global-key-listener');
    keyListener = new GlobalKeyboardListener();
    console.log(chalk.green('Using node-global-key-listener'));

    const shortcut = daemonConfigManager.parseShortcut(config.keyboard_shortcut);
    let modifiersPressed = { ctrl: false, alt: false, shift: false };

    keyListener.addListener((event: any, down: any) => {
      const keyName = event.name?.toUpperCase() || '';

      // Track modifier state
      if (event.name === 'LEFT CTRL' || event.name === 'RIGHT CTRL') {
        modifiersPressed.ctrl = event.state === 'DOWN';
      }
      if (event.name === 'LEFT ALT' || event.name === 'RIGHT ALT') {
        modifiersPressed.alt = event.state === 'DOWN';
      }
      if (event.name === 'LEFT SHIFT' || event.name === 'RIGHT SHIFT') {
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
        console.log(chalk.cyan(`\n[${new Date().toLocaleTimeString()}] Shortcut triggered!`));
        handleShortcutTriggered(config).catch((err) => {
          console.error(chalk.red(`Error handling shortcut: ${err.message}`));
        });
      }
    });
  } catch (error: any) {
    console.log(chalk.yellow(`Note: node-global-key-listener not available: ${error.message}`));
    console.log(chalk.gray('Install with: npm install node-global-key-listener'));
    console.log(chalk.gray('\nFalling back to manual capture mode.'));
    console.log(chalk.gray('Use "vibetasks daemon capture" to manually capture clipboard.\n'));

    // Keep process alive in fallback mode
    await new Promise(() => {});
  }

  // Handle shutdown signals
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nShutting down daemon...'));
    if (keyListener && keyListener.kill) {
      keyListener.kill();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\nReceived SIGTERM, shutting down...'));
    if (keyListener && keyListener.kill) {
      keyListener.kill();
    }
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Handle keyboard shortcut being triggered
 */
async function handleShortcutTriggered(config: DaemonConfig): Promise<void> {
  try {
    // Import clipboardy
    const clipboard = await import('clipboardy');
    const content = await clipboard.default.read();

    if (!content || content.trim().length === 0) {
      await showNotification('VibeTasks', 'Clipboard is empty', 'info');
      return;
    }

    const error = detectError(content);

    if (!error) {
      await showNotification('VibeTasks', 'No error detected in clipboard', 'info');
      console.log(chalk.gray('Clipboard content did not match error patterns'));
      return;
    }

    const summary = getErrorSummary(error);
    console.log(chalk.red('Error detected:'));
    console.log(chalk.white(summary));

    // Show notification
    await showNotification(
      'VibeTasks: Error Detected',
      summary,
      'error',
      config.notification_duration
    );

    // Auto-create task if configured
    if (config.auto_create_task) {
      console.log(chalk.cyan('Creating task...'));
      await createTaskFromError(error);
    }
  } catch (err: any) {
    console.error(chalk.red(`Error: ${err.message}`));
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

    // Use Windows-specific options
    const options: any = {
      title,
      message: message.substring(0, 256), // Windows limits notification length
      sound: type === 'error',
      wait: false,
    };

    // On Windows, use appId for better notification grouping
    if (process.platform === 'win32') {
      options.appID = 'VibeTasks';
    }

    notifier.default.notify(options);
  } catch (error: any) {
    // Fallback to console output if notifications not available
    console.log(chalk.blue(`[Notification] ${title}: ${message}`));
  }
}

// generateTaskTitle now uses the shared generateErrorTaskTitle from @vibetasks/shared

/**
 * Create a task from a parsed error
 */
async function createTaskFromError(error: ErrorInfo): Promise<void> {
  const spinner = ora('Creating task from error...').start();

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

    // Add error-related tag
    const tagName = `error-${category}`;
    try {
      const tag = await taskOps.findOrCreateTag(tagName, getTagColor(category));
      await taskOps.linkTaskTags(task.id, [tag.id]);
    } catch {
      // Tag creation may fail, continue
    }

    spinner.succeed(chalk.green('Task created!'));
    console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}...`));
    console.log(chalk.white.bold(task.title));

    await showNotification(
      'VibeTasks: Task Created',
      `Created: ${title.substring(0, 100)}`,
      'success'
    );
  } catch (err: any) {
    spinner.fail(chalk.red('Failed to create task'));

    if (err.message.includes('Not authenticated')) {
      console.log(chalk.yellow('You need to login first: vibetasks login'));
    } else {
      console.log(chalk.red(`Error: ${err.message}`));
    }
  }
}

/**
 * Get tag color for error category
 */
function getTagColor(category: string): string {
  const colors: Record<string, string> = {
    nodejs: '#68A063', // Node green
    npm: '#CB3837', // npm red
    expo: '#000020', // Expo dark
    'react-native': '#61DAFB', // React blue
    webpack: '#8DD6F9', // Webpack blue
    typescript: '#3178C6', // TS blue
    python: '#3776AB', // Python blue
    generic: '#FF6B6B', // Generic red
  };
  return colors[category] || '#FF6B6B';
}
