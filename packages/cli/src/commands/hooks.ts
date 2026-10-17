import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Claude Code hook configuration for vibetasks integration
 */
interface ClaudeHookConfig {
  hooks: {
    SubagentStop: {
      command: string;
      timeout: number;
      input: {
        todoState: boolean;
      };
    }[];
  };
}

/**
 * Get the path to the Claude Code settings directory
 */
function getClaudeSettingsPath(): string {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(os.homedir(), '.claude');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), '.claude');
  } else {
    // Linux and others
    return path.join(os.homedir(), '.claude');
  }
}

/**
 * Get the path to the vibetasks hooks directory
 */
function getVibetasksHooksPath(): string {
  // The hook script will be installed alongside the CLI
  const cliRoot = path.dirname(path.dirname(path.dirname(new URL(import.meta.url).pathname)));
  // Handle Windows paths
  const normalizedPath = process.platform === 'win32' && cliRoot.startsWith('/')
    ? cliRoot.slice(1)
    : cliRoot;
  return path.join(normalizedPath, 'hooks');
}

export const hooksCommand = new Command('hooks')
  .description('Manage hooks integration (git and Claude Code)');

// Subcommand: install git hooks
hooksCommand
  .command('install')
  .description('Install git hooks in current repository')
  .action(async () => {
    const spinner = ora('Installing git hooks...').start();

    try {
      // Check if we're in a git repository
      const gitDir = path.join(process.cwd(), '.git');

      try {
        await fs.access(gitDir);
      } catch {
        spinner.fail(chalk.red('Not a git repository'));
        console.error(chalk.gray('\nRun this command from the root of a git repository.\n'));
        process.exit(1);
      }

      const hooksDir = path.join(gitDir, 'hooks');
      await fs.mkdir(hooksDir, { recursive: true });

      // Create post-commit hook
      const postCommitPath = path.join(hooksDir, 'post-commit');

      const hookScript = `#!/bin/sh
# VibeTasks post-commit hook
# Automatically updates tasks based on commit messages

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Parse task ID from commit message [TASK-xxx]
TASK_ID=$(echo "$COMMIT_MSG" | grep -oP '\\[TASK-\\K[a-zA-Z0-9-]+(?=\\])' || true)

if [ -n "$TASK_ID" ]; then
  # Check if commit marks task as complete
  IS_COMPLETE=$(echo "$COMMIT_MSG" | grep -i '\\[COMPLETE\\]\\|\\[DONE\\]' || true)

  if [ -n "$IS_COMPLETE" ]; then
    # Mark task as complete
    vibetasks done "$TASK_ID" 2>/dev/null || true
  else
    # Add commit info to task notes
    COMMIT_HASH=$(git log -1 --pretty=%h)
    COMMIT_TYPE=$(echo "$COMMIT_MSG" | grep -oP '^\\w+(?=:)' || echo "update")

    # Update task with commit reference (silently, don't block commit)
    vibetasks update "$TASK_ID" --notes "Commit $COMMIT_HASH: $COMMIT_TYPE" 2>/dev/null || true
  fi
fi

exit 0
`;

      await fs.writeFile(postCommitPath, hookScript, { mode: 0o755 });

      spinner.succeed(chalk.green('Git hooks installed!'));

      console.log(chalk.gray('\n  Post-commit hook created'));
      console.log(chalk.gray('  Location:'), postCommitPath);
      console.log(chalk.blue.bold('\n  How to use:\n'));
      console.log(chalk.white('  1. Link commits to tasks:'));
      console.log(chalk.gray('     git commit -m "feat: Add login [TASK-abc123]"'));
      console.log(chalk.white('\n  2. Auto-complete tasks:'));
      console.log(chalk.gray('     git commit -m "feat: Complete feature [TASK-abc123] [COMPLETE]"'));
      console.log();
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to install hooks'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });

// Subcommand: install Claude Code hooks
hooksCommand
  .command('claude')
  .description('Generate Claude Code hook configuration for TodoWrite sync')
  .option('--project <path>', 'Project path (defaults to current directory)')
  .option('--output', 'Output config to stdout instead of installing')
  .action(async (options: { project?: string; output?: boolean }) => {
    const spinner = ora('Generating Claude Code hook configuration...').start();

    try {
      const projectPath = options.project || process.cwd();
      const hooksPath = getVibetasksHooksPath();
      const syncScriptPath = path.join(hooksPath, 'sync-todos.js');

      // Generate the hook configuration
      const hookConfig: ClaudeHookConfig = {
        hooks: {
          SubagentStop: [
            {
              command: `node "${syncScriptPath.replace(/\\/g, '/')}"`,
              timeout: 10000,
              input: {
                todoState: true,
              },
            },
          ],
        },
      };

      if (options.output) {
        // Just output the config to stdout
        spinner.stop();
        console.log(JSON.stringify(hookConfig, null, 2));
        process.exit(0);
      }

      // Check if .claude directory exists in project
      const claudeDir = path.join(projectPath, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });

      // Read existing settings.json or create new
      const settingsPath = path.join(claudeDir, 'settings.json');
      let existingSettings: any = {};

      try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        existingSettings = JSON.parse(data);
      } catch {
        // File doesn't exist or invalid JSON, start fresh
      }

      // Merge hook configuration
      existingSettings.hooks = existingSettings.hooks || {};
      existingSettings.hooks.SubagentStop = existingSettings.hooks.SubagentStop || [];

      // Check if vibetasks hook already exists
      const existingHookIndex = existingSettings.hooks.SubagentStop.findIndex(
        (h: any) => h.command?.includes('sync-todos.js')
      );

      if (existingHookIndex >= 0) {
        // Update existing hook
        existingSettings.hooks.SubagentStop[existingHookIndex] = hookConfig.hooks.SubagentStop[0];
        spinner.text = 'Updating existing Claude Code hook...';
      } else {
        // Add new hook
        existingSettings.hooks.SubagentStop.push(hookConfig.hooks.SubagentStop[0]);
      }

      // Write settings.json
      await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf-8');

      spinner.succeed(chalk.green('Claude Code hooks configured!'));

      console.log(chalk.gray('\n  Configuration written to:'));
      console.log(chalk.white(`  ${settingsPath}`));
      console.log(chalk.gray('\n  Hook script location:'));
      console.log(chalk.white(`  ${syncScriptPath}`));

      console.log(chalk.blue.bold('\n  How it works:\n'));
      console.log(chalk.white('  1. When Claude marks a TodoWrite item as completed'));
      console.log(chalk.white('  2. The SubagentStop hook triggers'));
      console.log(chalk.white('  3. sync-todos.js syncs status to vibetasks'));
      console.log(chalk.gray('\n  Status mapping:'));
      console.log(chalk.gray('    pending     -> todo'));
      console.log(chalk.gray('    in_progress -> vibing'));
      console.log(chalk.gray('    completed   -> done'));

      console.log(chalk.yellow.bold('\n  Note: Ensure vibetasks MCP is configured in Claude Code.'));
      console.log(chalk.gray('  Run: vibetasks setup claude\n'));

      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to configure Claude Code hooks'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });

// Subcommand: show hook status
hooksCommand
  .command('status')
  .description('Show status of installed hooks')
  .action(async () => {
    console.log(chalk.blue.bold('\n  VibeTasks Hooks Status\n'));

    // Check git hooks
    const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
    const postCommitPath = path.join(gitHooksDir, 'post-commit');

    try {
      const content = await fs.readFile(postCommitPath, 'utf-8');
      if (content.includes('vibetasks') || content.includes('VibeTasks')) {
        console.log(chalk.green('  [x] Git post-commit hook installed'));
      } else {
        console.log(chalk.yellow('  [ ] Git post-commit hook (exists but not vibetasks)'));
      }
    } catch {
      console.log(chalk.gray('  [ ] Git post-commit hook not installed'));
    }

    // Check Claude Code hooks
    const claudeSettingsPath = path.join(process.cwd(), '.claude', 'settings.json');

    try {
      const content = await fs.readFile(claudeSettingsPath, 'utf-8');
      const settings = JSON.parse(content);

      if (settings.hooks?.SubagentStop?.some((h: any) => h.command?.includes('sync-todos'))) {
        console.log(chalk.green('  [x] Claude Code SubagentStop hook configured'));
      } else {
        console.log(chalk.gray('  [ ] Claude Code SubagentStop hook not configured'));
      }
    } catch {
      console.log(chalk.gray('  [ ] Claude Code hooks not configured'));
    }

    console.log(chalk.gray('\n  To install hooks:'));
    console.log(chalk.gray('    Git:    vibetasks hooks install'));
    console.log(chalk.gray('    Claude: vibetasks hooks claude\n'));

    process.exit(0);
  });
