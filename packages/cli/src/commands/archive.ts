/**
 * Archive Command - Archive completed tasks or manage archived tasks
 * Moves tasks to archived status (hidden from default views)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AuthManager, TaskOperations } from '@vibetasks/core';

export const archiveCommand = new Command('archive')
  .description('Archive a task or manage archived tasks')
  .argument('[task-id]', 'Task ID to archive (full or first 8 characters)')
  .option('-l, --list', 'List all archived tasks')
  .option('-u, --unarchive <id>', 'Unarchive a task by ID')
  .option('--pick', 'Pick from completed tasks to archive')
  .action(async (taskId: string | undefined, options: { list?: boolean; unarchive?: string; pick?: boolean }) => {
    const spinner = ora();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // List archived tasks
      if (options.list) {
        spinner.start('Fetching archived tasks...');
        const archivedTasks = await taskOps.getArchivedTasks();
        spinner.stop();

        if (archivedTasks.length === 0) {
          console.log(chalk.yellow('\nNo archived tasks found.\n'));
          process.exit(0);
        }

        console.log(chalk.white('\nArchived Tasks:\n'));
        archivedTasks.forEach((task, index) => {
          const archivedDate = task.archived_at
            ? new Date(task.archived_at).toLocaleDateString()
            : 'Unknown';
          console.log(
            chalk.gray(`${index + 1}. `) +
            chalk.white(task.title) +
            chalk.gray(` [${task.id.slice(0, 8)}]`) +
            chalk.gray(` - Archived: ${archivedDate}`)
          );
        });
        console.log(chalk.gray(`\nTotal: ${archivedTasks.length} archived tasks\n`));
        console.log(chalk.gray('To restore a task: vibetasks archive --unarchive <id>\n'));
        process.exit(0);
      }

      // Unarchive a task
      if (options.unarchive) {
        spinner.start('Restoring task...');

        let targetId = options.unarchive;
        if (targetId.length < 32) {
          const archivedTasks = await taskOps.getArchivedTasks();
          const matchingTask = archivedTasks.find((t) => t.id.startsWith(targetId));

          if (!matchingTask) {
            spinner.fail(chalk.red('Archived task not found'));
            console.error(chalk.gray(`\nNo archived task found with ID starting with: ${targetId}\n`));
            process.exit(1);
          }
          targetId = matchingTask.id;
        }

        const task = await taskOps.unarchiveTask(targetId);
        spinner.succeed(chalk.green('Task restored!'));
        console.log(chalk.gray(`\nRestored: ${task.title}`));
        console.log(chalk.gray(`Status set to: done\n`));
        process.exit(0);
      }

      // Interactive pick from completed tasks
      if (options.pick || !taskId) {
        const allTasks = await taskOps.getTasks('completed');

        if (allTasks.length === 0) {
          console.log(chalk.yellow('\nNo completed tasks to archive. Complete some tasks first!\n'));
          process.exit(0);
        }

        const { selectedTask } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedTask',
          message: 'Pick a completed task to archive:',
          choices: allTasks.map(t => ({
            name: `${t.title}${t.completed_at ? chalk.gray(` - Completed: ${new Date(t.completed_at).toLocaleDateString()}`) : ''}`,
            value: t.id,
          })),
        }]);

        taskId = selectedTask;
      }

      // Archive the task
      if (!taskId) {
        console.log(chalk.yellow('\nUsage: vibetasks archive <task-id>'));
        console.log(chalk.gray('  or: vibetasks archive --pick'));
        console.log(chalk.gray('  or: vibetasks archive --list'));
        console.log(chalk.gray('  or: vibetasks archive --unarchive <id>\n'));
        process.exit(1);
      }

      // TypeScript narrowing: taskId is now definitely a string
      const validTaskId: string = taskId;

      spinner.start('Archiving task...');

      // If user provided short ID, find full ID
      let targetId: string = validTaskId;
      if (validTaskId.length < 32) {
        const allTasks = await taskOps.getTasks('all', true); // Include archived to search all
        const matchingTask = allTasks.find((t) => t.id.startsWith(validTaskId));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID starting with: ${taskId}\n`));
          process.exit(1);
        }

        targetId = matchingTask.id;
      }

      const task = await taskOps.archiveTask(targetId);

      spinner.succeed(chalk.green('Task archived!'));
      console.log(chalk.gray(`\nArchived: ${task.title}`));
      console.log(chalk.gray(`Archived at: ${new Date().toLocaleString()}`));
      console.log(chalk.gray('\nTo view archived tasks: vibetasks archive --list'));
      console.log(chalk.gray(`To restore: vibetasks archive --unarchive ${targetId.slice(0, 8)}\n`));
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Operation failed'));

      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\nYou need to login first'));
        console.error(chalk.gray('Run: vibetasks login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }

      process.exit(1);
    }
  });
