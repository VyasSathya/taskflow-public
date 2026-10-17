/**
 * Error Command - Capture errors and create high-priority tasks
 * 
 * Usage:
 *   vibetasks error "TypeError: Cannot read property..."
 *   echo "error text" | vibetasks error
 *   npm run build 2>&1 | vibetasks error
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import {
  parseError,
  generateErrorTaskTitle,
  detectProjectFromError,
  type ErrorContext,
} from '@vibetasks/shared';

/**
 * Format error context into markdown notes for the task
 */
function formatErrorNotes(error: ErrorContext): string {
  const lines: string[] = [];

  lines.push('## Error Details');
  lines.push('');

  if (error.error_type) {
    lines.push(`**Type:** ${error.error_type}`);
  }
  if (error.category) {
    lines.push(`**Category:** ${error.category}`);
  }
  if (error.message) {
    lines.push(`**Message:** ${error.message}`);
  }
  if (error.file_path) {
    lines.push(`**File:** \`${error.file_path}\``);
    if (error.line_number) {
      lines.push(`**Line:** ${error.line_number}${error.column ? `:${error.column}` : ''}`);
    }
  }
  if (error.suggestion) {
    lines.push('');
    lines.push('### Suggestion');
    lines.push(error.suggestion);
  }
  if (error.stack_trace) {
    lines.push('');
    lines.push('### Stack Trace');
    lines.push('```');
    lines.push(error.stack_trace);
    lines.push('```');
  }

  lines.push('');
  lines.push('### Raw Error');
  lines.push('```');
  // Limit raw text to avoid massive notes
  const rawLines = error.raw_text.split('\n');
  if (rawLines.length > 30) {
    lines.push(rawLines.slice(0, 30).join('\n'));
    lines.push(`... (${rawLines.length - 30} more lines)`);
  } else {
    lines.push(error.raw_text);
  }
  lines.push('```');

  return lines.join('\n');
}

/**
 * Read from stdin if available
 */
async function readStdin(): Promise<string | null> {
  // Check if stdin has data (piped input)
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    
    process.stdin.on('end', () => {
      resolve(data || null);
    });

    // Timeout after 100ms if no data
    setTimeout(() => {
      if (!data) resolve(null);
    }, 100);
  });
}

export const errorCommand = new Command('error')
  .description('Capture an error and create a high-priority task')
  .argument('[error-text]', 'Error message/stack trace (or pipe from stdin)')
  .option('-p, --project <project>', 'Project name')
  .option('--clipboard', 'Read error from clipboard')
  .action(async (errorTextArg: string | undefined, options: { project?: string; clipboard?: boolean }) => {
    const spinner = ora();

    try {
      // Determine error text source
      let errorText = errorTextArg;

      // Try stdin if no argument
      if (!errorText) {
        const stdinData = await readStdin();
        if (stdinData) {
          errorText = stdinData;
        }
      }

      // Try clipboard if --clipboard flag or still no text
      if (!errorText && options.clipboard) {
        try {
          // Dynamic import for clipboard (may not be available in all environments)
          const clipboardy = await import('clipboardy');
          errorText = await clipboardy.default.read();
        } catch {
          console.log(chalk.yellow('Clipboard not available in this environment'));
        }
      }

      if (!errorText || !errorText.trim()) {
        console.log(chalk.yellow('\nUsage:'));
        console.log(chalk.gray('  vibetasks error "TypeError: Cannot read..."'));
        console.log(chalk.gray('  npm run build 2>&1 | vibetasks error'));
        console.log(chalk.gray('  vibetasks error --clipboard'));
        console.log('');
        process.exit(1);
      }

      spinner.start('Creating error task...');

      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // Parse error using shared error parser
      const errorContext = parseError(errorText, 'terminal');
      
      // Generate title and detect project from parsed error
      const title = errorContext 
        ? generateErrorTaskTitle(errorContext)
        : `Error: ${errorText.split('\n')[0].slice(0, 80)}`;
      
      const detectedProject = errorContext ? detectProjectFromError(errorContext) : undefined;
      const projectTag = options.project || detectedProject;

      // Format notes from error context
      const notes = errorContext 
        ? formatErrorNotes(errorContext)
        : `\`\`\`\n${errorText}\n\`\`\``;

      const task = await taskOps.createTask({
        title,
        notes,
        priority: 'high',
        status: 'todo',
        project_tag: projectTag,
        created_by: 'human',
        source_type: 'cli',
        error_context: errorContext || undefined,
      });

      spinner.succeed(chalk.green('Error captured!'));
      console.log('');
      console.log(chalk.white(`  ${title}`));
      if (projectTag) {
        console.log(chalk.blue(`  Project: ${projectTag}`));
      }
      console.log(chalk.gray(`  ID: ${task.id.slice(0, 8)}`));
      console.log(chalk.gray(`  Priority: high`));
      console.log('');
      console.log(chalk.gray('View your tasks: vibetasks list'));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to capture error'));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }
  });
