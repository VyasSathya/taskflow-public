/**
 * Vibing Command - Start working on a task
 * Moves a task from 'todo' to 'vibing' status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { ShortIdManager } from '../utils/short-ids.js';

const WIP_LIMIT = 3;

export const vibingCommand = new Command('vibing')
  .alias('start')
  .alias('v')
  .description('Start working on a task (move to vibing status)')
  .argument('[task-id]', 'Task ID or short # (1-99) to start vibing on')
  .option('-p, --pick', 'Pick from todo tasks interactively')
  .action(async (taskIdInput: string | undefined, options: { pick?: boolean }) => {
    const spinner = ora();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const shortIdManager = new ShortIdManager();

      // Resolve short ID to full ID if needed
      let taskId: string | undefined;
      if (taskIdInput) {
        taskId = await shortIdManager.resolveId(taskIdInput);
      }

      // Get current vibing tasks count
      const allTasks = await taskOps.getTasks('all');
      const vibingTasks = allTasks.filter(t => t.status === 'vibing' && !t.completed);

      // Check WIP limit
      if (vibingTasks.length >= WIP_LIMIT) {
        console.log(chalk.yellow('\n⚠ WIP Limit Warning'));
        console.log(chalk.gray(`  You already have ${vibingTasks.length} tasks in progress.`));
        console.log(chalk.gray('  Research shows 3+ concurrent tasks = 40% productivity loss.\n'));

        console.log(chalk.white('Currently vibing:'));
        vibingTasks.forEach((t, i) => {
          console.log(chalk.magenta(`  ${i + 1}. ${t.title}`));
        });
        console.log('');

        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Start another task anyway?',
          default: false,
        }]);

        if (!proceed) {
          console.log(chalk.gray('\nFocus on finishing what you started! Run `vibetasks done <id>` when ready.\n'));
          process.exit(0);
        }
      }

      // Interactive pick if no task ID provided or --pick flag
      if (!taskId || options.pick) {
        const todoTasks = allTasks.filter(t => t.status === 'todo' && !t.completed);

        if (todoTasks.length === 0) {
          console.log(chalk.yellow('\nNo todo tasks found. Add one with `vibetasks add "task title"`\n'));
          process.exit(0);
        }

        const { selectedTask } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedTask',
          message: 'Pick a task to start:',
          choices: todoTasks.map(t => ({
            name: `${t.title}${t.project_tag ? chalk.gray(` [${t.project_tag}]`) : ''}`,
            value: t.id,
          })),
        }]);

        taskId = selectedTask;
      }

      // Start vibing on the task
      spinner.start('Starting task...');

      await taskOps.updateTask(taskId!, {
        status: 'vibing',
        completed: false,
      });

      const task = allTasks.find(t => t.id === taskId);
      spinner.succeed(chalk.green('Now vibing on:'));
      console.log(chalk.white(`\n  ${task?.title || taskId}\n`));

      // Show helpful tips
      console.log(chalk.gray('  Tips:'));
      console.log(chalk.gray('  • Update context notes as you work'));
      console.log(chalk.gray('  • Run `vibetasks done ' + taskId!.slice(0, 8) + '` when finished'));
      console.log(chalk.gray('  • In Claude Code, say "show my vibing tasks"\n'));

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to start task'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });
