import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { ShortIdManager } from '../utils/short-ids.js';
import { getSessionManager } from '../utils/session-manager.js';

export const doneCommand = new Command('done')
  .description('Mark a task as complete')
  .argument('<id>', 'Task ID, short # (1-99), or first 8 characters')
  .option('-n, --notes <notes>', 'Completion notes - what was done, any final notes')
  .option('-c, --context <context>', 'Context notes (alias for --notes)')
  .action(async (id: string, options: { notes?: string; context?: string }) => {
    const spinner = ora('Completing task...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const shortIdManager = new ShortIdManager();

      // Resolve short ID (1-99) to full ID
      let taskId = await shortIdManager.resolveId(id);

      // If still a partial ID, find full match
      if (taskId.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(taskId));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID starting with: ${id}\n`));
          process.exit(1);
        }

        taskId = matchingTask.id;
      }

      // Update context notes if provided
      const contextNotes = options.notes || options.context;
      if (contextNotes) {
        await taskOps.updateTask(taskId, { context_notes: contextNotes });
      }

      const task = await taskOps.completeTask(taskId);

      // Log to session
      const sessionManager = getSessionManager();
      await sessionManager.logAction({
        type: 'task_completed',
        description: `Completed: "${task.title}"`,
        taskId: task.id,
        taskTitle: task.title,
      });

      spinner.succeed(chalk.green('Task completed!'));
      console.log(chalk.gray(`\n✓ ${task.title}`));
      if (contextNotes) {
        console.log(chalk.gray(`Notes: ${contextNotes}`));
      }
      console.log(chalk.gray(`Completed at: ${new Date().toLocaleString()}\n`));
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to complete task'));

      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: taskflow login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }

      process.exit(1);
    }
  });
