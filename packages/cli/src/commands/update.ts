import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { parseDate } from '../utils/date-parser.js';

export const updateCommand = new Command('update')
  .description('Update a task')
  .argument('<id>', 'Task ID (full or first 8 characters)')
  .option('-t, --title <title>', 'New title')
  .option('-n, --notes <notes>', 'New notes')
  .option('-d, --due <date>', 'New due date')
  .option('-p, --priority <level>', 'New priority: low, medium, high, none')
  .option('-s, --status <status>', 'New status: todo, vibing, done')
  .option('--project <name>', 'New project tag')
  .option('-e, --energy <level>', 'Energy required: low, medium, high')
  .option('-c, --context <notes>', 'Update context notes')
  .action(async (id: string, options: any) => {
    if (!options.title && !options.notes && !options.due && !options.priority && !options.status && !options.project && !options.energy && !options.context) {
      console.error(chalk.red('\nError: No updates specified'));
      console.error(chalk.gray('Provide at least one option: --title, --notes, --due, --priority, --status, --project, --energy, or --context\n'));
      process.exit(1);
    }

    const spinner = ora('Updating task...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // Find full ID if short ID provided
      let taskId = id;
      if (id.length < 32) {
        const allTasks = await taskOps.getTasks('all');
        const matchingTask = allTasks.find((t) => t.id.startsWith(id));

        if (!matchingTask) {
          spinner.fail(chalk.red('Task not found'));
          console.error(chalk.gray(`\nNo task found with ID starting with: ${id}\n`));
          process.exit(1);
        }

        taskId = matchingTask.id;
      }

      const updates: any = {};

      if (options.title) updates.title = options.title;
      if (options.notes) updates.notes = options.notes;
      if (options.due) updates.due_date = parseDate(options.due);
      if (options.context) updates.context_notes = options.context;
      if (options.project) updates.project_tag = options.project;

      if (options.priority) {
        const validPriorities = ['none', 'low', 'medium', 'high'];
        if (!validPriorities.includes(options.priority)) {
          throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
        }
        updates.priority = options.priority;
      }

      if (options.status) {
        const validStatuses = ['todo', 'vibing', 'done'];
        if (!validStatuses.includes(options.status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        updates.status = options.status;
      }

      if (options.energy) {
        const validEnergy = ['low', 'medium', 'high'];
        if (!validEnergy.includes(options.energy)) {
          throw new Error(`Invalid energy level. Must be one of: ${validEnergy.join(', ')}`);
        }
        updates.energy_required = options.energy;
      }

      const task = await taskOps.updateTask(taskId, updates);

      spinner.succeed(chalk.green('Task updated!'));
      console.log(chalk.gray(`\n✓ ${task.title}\n`));
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to update task'));

      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: taskflow login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }

      process.exit(1);
    }
  });
