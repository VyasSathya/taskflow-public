import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { AuthManager, TaskOperations } from '@vibetasks/core';

export const deleteCommand = new Command('delete')
  .description('Delete a task')
  .argument('<id>', 'Task ID (full or first 8 characters)')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (id: string, options: any) => {
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // Find full ID if short ID provided
      let taskId = id;
      let taskTitle = '';

      if (id.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(id));

        if (!matchingTask) {
          console.error(chalk.red('\nTask not found'));
          console.error(chalk.gray(`No task found with ID starting with: ${id}\n`));
          process.exit(1);
        }

        taskId = matchingTask.id;
        taskTitle = matchingTask.title;
      } else {
        const task = await taskOps.getTask(taskId);
        taskTitle = task.title;
      }

      // Confirm deletion unless --yes flag
      if (!options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Delete task: "${taskTitle}"?`,
            default: false,
          },
        ]);

        if (!answers.confirm) {
          console.log(chalk.gray('\nDeletion cancelled.\n'));
          process.exit(0);
        }
      }

      const spinner = ora('Deleting task...').start();
      await taskOps.deleteTask(taskId);

      spinner.succeed(chalk.green('Task deleted!'));
      console.log(chalk.gray(`\n✗ ${taskTitle}\n`));
      process.exit(0);
    } catch (error: any) {
      console.error(chalk.red('\nFailed to delete task'));

      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: taskflow login\n'));
      } else {
        console.error(chalk.red(`Error: ${error.message}\n`));
      }

      process.exit(1);
    }
  });
