import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { ShortIdManager } from '../utils/short-ids.js';

/**
 * Parse indices from arguments
 * Supports: "1 2 3", "1-3", "1,2,3", or mixed "1 3-5 7"
 */
function parseIndices(args: string[]): number[] {
  const indices: Set<number> = new Set();

  for (const arg of args) {
    // Handle comma-separated: "1,2,3"
    const parts = arg.split(',');

    for (const part of parts) {
      const trimmed = part.trim();

      // Handle range: "1-5"
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            indices.add(i);
          }
        }
      } else {
        // Single number
        const num = parseInt(trimmed, 10);
        if (!isNaN(num)) {
          indices.add(num);
        }
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Match subtask by partial title (case-insensitive)
 */
function findSubtasksByTitle(
  subtasks: { id: string; title: string; done: boolean }[],
  searchTerms: string[]
): number[] {
  const indices: number[] = [];

  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    subtasks.forEach((subtask, index) => {
      if (subtask.title.toLowerCase().includes(lowerTerm)) {
        indices.push(index + 1); // 1-based
      }
    });
  }

  return [...new Set(indices)].sort((a, b) => a - b);
}

// Main subtask command with subcommands
export const subtaskCommand = new Command('subtask')
  .description('Manage subtasks within a task');

// LIST subcommand
subtaskCommand
  .command('list')
  .description('List subtasks for a task')
  .argument('<task-id>', 'Task ID, short # (1-99), or first 8 characters')
  .action(async (taskIdArg: string) => {
    const spinner = ora('Loading subtasks...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const shortIdManager = new ShortIdManager();

      // Resolve short ID to full ID
      let taskId = await shortIdManager.resolveId(taskIdArg);

      if (taskId.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(taskId));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID: ${taskIdArg}\n`));
          process.exit(1);
        }
        taskId = matchingTask.id;
      }

      const task = await taskOps.getTask(taskId);
      const subtasks = task.subtasks_json || [];

      spinner.stop();

      console.log();
      console.log(chalk.white.bold(task.title));
      console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}`));
      console.log();

      if (subtasks.length === 0) {
        console.log(chalk.gray('  No subtasks'));
      } else {
        const doneCount = subtasks.filter((s) => s.done).length;
        console.log(chalk.gray(`Subtasks: ${doneCount}/${subtasks.length} completed`));
        console.log();

        subtasks.forEach((subtask, index) => {
          const checkbox = subtask.done ? chalk.green('[x]') : chalk.gray('[ ]');
          const title = subtask.done
            ? chalk.strikethrough.gray(subtask.title)
            : chalk.white(subtask.title);
          console.log(`  ${chalk.cyan(String(index + 1).padStart(2, ' '))}. ${checkbox} ${title}`);
        });
      }

      console.log();
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to load subtasks'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });

// DONE subcommand
subtaskCommand
  .command('done')
  .description('Mark subtasks as complete')
  .argument('<task-id>', 'Task ID, short # (1-99), or first 8 characters')
  .argument('<indices...>', 'Subtask indices (1-based): "1 2 3", "1-5", "1,3,5", or partial title match')
  .action(async (taskIdArg: string, indicesArgs: string[]) => {
    const spinner = ora('Updating subtasks...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const shortIdManager = new ShortIdManager();

      // Resolve short ID to full ID
      let taskId = await shortIdManager.resolveId(taskIdArg);

      if (taskId.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(taskId));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID: ${taskIdArg}\n`));
          process.exit(1);
        }
        taskId = matchingTask.id;
      }

      const task = await taskOps.getTask(taskId);
      const subtasks = [...(task.subtasks_json || [])];

      if (subtasks.length === 0) {
        spinner.fail(chalk.yellow('No subtasks to update'));
        process.exit(1);
      }

      // Try to parse as numeric indices first
      let indices = parseIndices(indicesArgs);

      // If no numeric indices found, try title matching
      if (indices.length === 0) {
        indices = findSubtasksByTitle(subtasks, indicesArgs);
      }

      if (indices.length === 0) {
        spinner.fail(chalk.yellow('No matching subtasks found'));
        console.error(chalk.gray('\nProvide indices (1, 2, 3) or partial title matches.\n'));
        process.exit(1);
      }

      // Validate indices are in range
      const outOfRange = indices.filter((i) => i < 1 || i > subtasks.length);
      if (outOfRange.length > 0) {
        spinner.fail(chalk.red(`Invalid indices: ${outOfRange.join(', ')}`));
        console.error(chalk.gray(`\nValid range: 1-${subtasks.length}\n`));
        process.exit(1);
      }

      // Mark subtasks as done
      const updated: string[] = [];
      for (const idx of indices) {
        if (!subtasks[idx - 1].done) {
          subtasks[idx - 1].done = true;
          updated.push(subtasks[idx - 1].title);
        }
      }

      if (updated.length === 0) {
        spinner.succeed(chalk.yellow('All specified subtasks were already done'));
        process.exit(0);
      }

      // Update task with modified subtasks
      await taskOps.updateTask(taskId, { subtasks_json: subtasks });

      const doneCount = subtasks.filter((s) => s.done).length;
      spinner.succeed(chalk.green(`Marked ${updated.length} subtask(s) as done`));

      console.log();
      updated.forEach((title) => {
        console.log(chalk.green(`  ✓ ${title}`));
      });
      console.log();
      console.log(chalk.gray(`Progress: ${doneCount}/${subtasks.length} completed`));

      // If all done, suggest completing the task
      if (doneCount === subtasks.length) {
        console.log();
        console.log(chalk.cyan(`All subtasks complete! Run: vibetasks done ${taskId.substring(0, 8)}`));
      }

      console.log();
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to update subtasks'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });

// UNDO subcommand
subtaskCommand
  .command('undo')
  .description('Mark subtasks as incomplete')
  .argument('<task-id>', 'Task ID, short # (1-99), or first 8 characters')
  .argument('<indices...>', 'Subtask indices (1-based): "1 2 3", "1-5", "1,3,5", or partial title match')
  .action(async (taskIdArg: string, indicesArgs: string[]) => {
    const spinner = ora('Updating subtasks...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const shortIdManager = new ShortIdManager();

      // Resolve short ID to full ID
      let taskId = await shortIdManager.resolveId(taskIdArg);

      if (taskId.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(taskId));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID: ${taskIdArg}\n`));
          process.exit(1);
        }
        taskId = matchingTask.id;
      }

      const task = await taskOps.getTask(taskId);
      const subtasks = [...(task.subtasks_json || [])];

      if (subtasks.length === 0) {
        spinner.fail(chalk.yellow('No subtasks to update'));
        process.exit(1);
      }

      // Try to parse as numeric indices first
      let indices = parseIndices(indicesArgs);

      // If no numeric indices found, try title matching
      if (indices.length === 0) {
        indices = findSubtasksByTitle(subtasks, indicesArgs);
      }

      if (indices.length === 0) {
        spinner.fail(chalk.yellow('No matching subtasks found'));
        console.error(chalk.gray('\nProvide indices (1, 2, 3) or partial title matches.\n'));
        process.exit(1);
      }

      // Validate indices are in range
      const outOfRange = indices.filter((i) => i < 1 || i > subtasks.length);
      if (outOfRange.length > 0) {
        spinner.fail(chalk.red(`Invalid indices: ${outOfRange.join(', ')}`));
        console.error(chalk.gray(`\nValid range: 1-${subtasks.length}\n`));
        process.exit(1);
      }

      // Mark subtasks as not done
      const updated: string[] = [];
      for (const idx of indices) {
        if (subtasks[idx - 1].done) {
          subtasks[idx - 1].done = false;
          updated.push(subtasks[idx - 1].title);
        }
      }

      if (updated.length === 0) {
        spinner.succeed(chalk.yellow('All specified subtasks were already incomplete'));
        process.exit(0);
      }

      // Update task with modified subtasks
      await taskOps.updateTask(taskId, { subtasks_json: subtasks });

      const doneCount = subtasks.filter((s) => s.done).length;
      spinner.succeed(chalk.yellow(`Marked ${updated.length} subtask(s) as incomplete`));

      console.log();
      updated.forEach((title) => {
        console.log(chalk.yellow(`  ○ ${title}`));
      });
      console.log();
      console.log(chalk.gray(`Progress: ${doneCount}/${subtasks.length} completed`));
      console.log();
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to update subtasks'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });
