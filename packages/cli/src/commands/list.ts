import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager, TaskOperations, TaskFilter } from '@vibetasks/core';
import { ShortIdManager } from '../utils/short-ids.js';

export const listCommand = new Command('list')
  .description('List tasks')
  .argument('[filter]', 'Filter: all, today, upcoming, completed', 'all')
  .option('-l, --limit <number>', 'Maximum number of tasks to show', '50')
  .option('--project <name>', 'Filter by project tag')
  .option('--created-by <source>', 'Filter by creator: ai or human')
  .option('--status <status>', 'Filter by status: todo, vibing, done')
  .option('--short-ids', 'Show short numeric IDs (1-99) for easy reference')
  .action(async (filter: string, options: any) => {
    try {
      // Validate filter
      const validFilters: TaskFilter[] = ['all', 'today', 'upcoming', 'completed'];
      if (!validFilters.includes(filter as TaskFilter)) {
        console.error(chalk.red(`Invalid filter: ${filter}`));
        console.error(chalk.gray(`Valid filters: ${validFilters.join(', ')}`));
        process.exit(1);
      }

      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      let tasks = await taskOps.getTasks(filter as TaskFilter);

      // Apply additional filters
      if (options.project) {
        tasks = tasks.filter(t => t.project_tag === options.project);
      }

      if (options.createdBy) {
        const validSources = ['ai', 'human'];
        if (!validSources.includes(options.createdBy)) {
          console.error(chalk.red(`Invalid created-by filter. Must be: ai or human`));
          process.exit(1);
        }
        tasks = tasks.filter(t => t.created_by === options.createdBy);
      }

      if (options.status) {
        const validStatuses = ['todo', 'vibing', 'done'];
        if (!validStatuses.includes(options.status)) {
          console.error(chalk.red(`Invalid status filter. Must be: todo, vibing, or done`));
          process.exit(1);
        }
        tasks = tasks.filter(t => t.status === options.status);
      }

      if (tasks.length === 0) {
        const filterMessages: Record<TaskFilter, string> = {
          all: 'No active tasks found',
          today: 'No tasks due today',
          upcoming: 'No upcoming tasks',
          completed: 'No completed tasks',
          archived: 'No archived tasks',
        };
        console.log(chalk.gray(`\n${filterMessages[filter as TaskFilter] || 'No tasks found'}.\n`));
        process.exit(0);
      }

      // Limit results
      const limit = parseInt(options.limit, 10);
      const displayTasks = tasks.slice(0, limit);

      // Initialize short ID manager and save mappings
      const shortIdManager = new ShortIdManager();
      if (options.shortIds) {
        await shortIdManager.saveMappings(displayTasks.map(t => t.id));
      }

      // Create table
      const table = new Table({
        head: options.shortIds
          ? [
              chalk.cyan('#'),
              chalk.cyan('Status'),
              chalk.cyan('Title'),
              chalk.cyan('Progress'),
              chalk.cyan('Due'),
            ]
          : [
              chalk.cyan('ID'),
              chalk.cyan('Status'),
              chalk.cyan('Title'),
              chalk.cyan('Project'),
              chalk.cyan('Priority'),
              chalk.cyan('Due'),
            ],
        colWidths: options.shortIds ? [5, 10, 40, 12, 12] : [10, 10, 35, 15, 10, 12],
        wordWrap: true,
      });

      displayTasks.forEach((task, index) => {
        const priorityColors = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
          none: chalk.gray,
        };

        const statusColors: Record<string, (text: string) => string> = {
          todo: chalk.gray,
          vibing: chalk.magenta,
          done: chalk.green,
          archived: chalk.dim,
        };

        const statusEmojis: Record<string, string> = {
          todo: '📋',
          vibing: '⚡',
          done: '✓',
          archived: '📦',
        };

        const priorityColor = priorityColors[task.priority || 'none'];
        const statusColor = statusColors[task.status || 'todo'];

        const shortId = chalk.yellow.bold(`${index + 1}`);
        const id = task.id.substring(0, 8);
        const status = statusColor(`${statusEmojis[task.status || 'todo']} ${task.status || 'todo'}`);
        const title = task.status === 'done' ? chalk.strikethrough(task.title) : task.title;
        const titleWithAI = task.created_by === 'ai' ? `🤖 ${title}` : title;
        const project = task.project_tag ? chalk.blue(task.project_tag) : chalk.gray('-');
        const priority = priorityColor(task.priority || 'none');
        const dueDate = task.due_date ? task.due_date.split('T')[0] : chalk.gray('-');

        // Calculate subtask progress
        const subtasks = (task as any).subtasks_json || (task as any).subtasks || [];
        const doneCount = subtasks.filter((s: any) => s.done).length;
        const totalCount = subtasks.length;
        const progress = totalCount > 0 ? chalk.cyan(`${doneCount}/${totalCount}`) : chalk.gray('-');

        if (options.shortIds) {
          table.push([shortId, status, titleWithAI, progress, dueDate]);
        } else {
          table.push([id, status, titleWithAI, project, priority, dueDate]);
        }
      });

      console.log('\n' + table.toString());

      // Show total count
      const filterLabels: Record<TaskFilter, string> = {
        all: 'active',
        today: 'today',
        upcoming: 'upcoming',
        completed: 'completed',
        archived: 'archived',
      };

      console.log(chalk.gray(`\nTotal: ${tasks.length} ${filterLabels[filter as TaskFilter]} task${tasks.length === 1 ? '' : 's'}`));

      if (tasks.length > limit) {
        console.log(chalk.yellow(`Showing ${limit} of ${tasks.length} tasks. Use --limit to show more.`));
      }

      if (options.shortIds) {
        console.log(chalk.gray(`\nUse: vibetasks vibing <#> to start working on a task`));
      }

      console.log(); // Empty line
      process.exit(0);
    } catch (error: any) {
      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: taskflow login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }
      process.exit(1);
    }
  });
