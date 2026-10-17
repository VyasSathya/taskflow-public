import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { detectProject } from '@vibetasks/shared/utils/project-detector';
import { generateErrorTaskTitle } from '@vibetasks/shared';
import {
  createClipboardMonitor,
  getErrorSummary,
  formatErrorForNotes,
  checkClipboardForError,
  ErrorInfo,
  ClipboardMonitor,
} from '../utils/clipboard-monitor.js';

interface WatchOptions {
  interval?: string;
  auto?: boolean;
  quiet?: boolean;
  project?: string;
}

export const watchCommand = new Command('watch')
  .description('Monitor clipboard for errors and offer to capture them as tasks')
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '1000')
  .option('-a, --auto', 'Auto-create tasks without prompting')
  .option('-q, --quiet', 'Minimal output (only show errors)')
  .option('--project <name>', 'Override auto-detected project')
  .action(async (options: WatchOptions) => {
    const interval = parseInt(options.interval || '1000', 10);

    // Header
    if (!options.quiet) {
      console.log();
      console.log(chalk.cyan.bold('VibeTasks Clipboard Monitor'));
      console.log(chalk.gray('Watching for errors in your clipboard...'));
      console.log();
    }

    // Initialize auth and task operations
    let authManager: AuthManager;
    let taskOps: TaskOperations;

    try {
      authManager = new AuthManager();
      taskOps = await TaskOperations.fromAuthManager(authManager);
    } catch (error: any) {
      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\nYou need to login first'));
        console.error(chalk.gray('Run: vibetasks login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }
      process.exit(1);
    }

    // Detect project
    let projectTag: string | undefined = options.project;
    if (!projectTag) {
      try {
        const detected = await detectProject(process.cwd());
        projectTag = detected.name;
        if (!options.quiet) {
          console.log(chalk.gray(`Project: ${chalk.white(projectTag)}`));
        }
      } catch {
        // No project detected
      }
    }

    // Track created tasks to avoid duplicates
    const recentErrors = new Set<string>();

    // Error handler
    const handleError = async (error: ErrorInfo) => {
      // Create a hash of the error to detect duplicates
      const errorHash = `${error.error_type || 'unknown'}:${(error.message || '').substring(0, 50)}`;
      if (recentErrors.has(errorHash)) {
        return; // Skip duplicate
      }

      console.log();
      console.log(chalk.red.bold('Error detected in clipboard!'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.yellow(getErrorSummary(error)));
      console.log();

      if (error.suggestion) {
        console.log(chalk.cyan('Suggestion: ') + error.suggestion);
        console.log();
      }

      // Auto mode: create task without prompting
      if (options.auto) {
        await createTaskFromError(error, taskOps, projectTag);
        recentErrors.add(errorHash);
        return;
      }

      // Interactive mode: prompt user
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Create task from this error', value: 'create' },
            { name: 'Show full error', value: 'show' },
            { name: 'Ignore', value: 'ignore' },
            { name: 'Stop watching', value: 'stop' },
          ],
        },
      ]);

      switch (action) {
        case 'create':
          await createTaskFromError(error, taskOps, projectTag);
          recentErrors.add(errorHash);
          break;

        case 'show':
          console.log();
          console.log(chalk.gray('─'.repeat(50)));
          console.log(error.raw_text);
          console.log(chalk.gray('─'.repeat(50)));
          console.log();

          // Prompt again after showing
          const { afterShow } = await inquirer.prompt([
            {
              type: 'list',
              name: 'afterShow',
              message: 'Now what?',
              choices: [
                { name: 'Create task from this error', value: 'create' },
                { name: 'Ignore', value: 'ignore' },
              ],
            },
          ]);

          if (afterShow === 'create') {
            await createTaskFromError(error, taskOps, projectTag);
            recentErrors.add(errorHash);
          }
          break;

        case 'stop':
          monitor.stop();
          process.exit(0);
          break;

        case 'ignore':
        default:
          if (!options.quiet) {
            console.log(chalk.gray('Error ignored, continuing to watch...'));
          }
          break;
      }

      console.log();
    };

    // Create monitor
    const monitor: ClipboardMonitor = createClipboardMonitor({
      interval,
      onError: handleError,
      onStart: () => {
        if (!options.quiet) {
          console.log(chalk.green('Started watching clipboard'));
          console.log(chalk.gray(`Interval: ${interval}ms`));
          if (options.auto) {
            console.log(chalk.yellow('Auto-create mode: ON'));
          }
          console.log();
          console.log(chalk.gray('Press Ctrl+C to stop'));
          console.log();
        }
      },
      onStop: () => {
        if (!options.quiet) {
          console.log();
          console.log(chalk.yellow('Stopped watching clipboard'));
        }
      },
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      monitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      monitor.stop();
      process.exit(0);
    });

    // Start monitoring
    await monitor.start();

    // Keep process alive
    await new Promise(() => {
      // This promise never resolves - we run until Ctrl+C
    });
  });

/**
 * Create a task from the detected error
 */
async function createTaskFromError(
  error: ErrorInfo,
  taskOps: TaskOperations,
  projectTag?: string
): Promise<void> {
  const spinner = ora('Creating task...').start();

  try {
    // Generate task title using shared function
    const title = generateErrorTaskTitle(error);
    const category = error.category || 'general';

    // Create task
    const task = await taskOps.createTask({
      title,
      notes: formatErrorForNotes(error),
      notes_format: 'markdown',
      priority: category === 'typescript' ? 'medium' : 'high',
      project_tag: projectTag,
      created_by: 'human', // User triggered this
      status: 'todo',
      source_type: 'cli',
      error_context: error,
    });

    // Add error-related tags
    const tagName = `error-${category}`;
    try {
      const tag = await taskOps.findOrCreateTag(tagName, getTagColor(category));
      await taskOps.linkTaskTags(task.id, [tag.id]);
    } catch {
      // Tag creation may fail, continue
    }

    spinner.succeed(chalk.green('Task created!'));
    console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}...`));
    console.log(chalk.white.bold(title));
  } catch (err: any) {
    spinner.fail(chalk.red('Failed to create task'));
    console.error(chalk.red(`Error: ${err.message}`));
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

/**
 * One-time check command (non-monitoring)
 */
export const checkCommand = new Command('check-clipboard')
  .description('Check clipboard once for errors')
  .action(async () => {
    console.log(chalk.gray('Checking clipboard...'));

    const error = await checkClipboardForError();

    if (!error) {
      console.log(chalk.green('No errors detected in clipboard.'));
      process.exit(0);
    }

    console.log();
    console.log(chalk.red.bold('Error detected!'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log(chalk.yellow(getErrorSummary(error)));
    console.log();

    if (error.suggestion) {
      console.log(chalk.cyan('Suggestion: ') + error.suggestion);
    }

    console.log();
    console.log(chalk.gray('Use `vibetasks watch` to monitor continuously.'));
    process.exit(0);
  });
