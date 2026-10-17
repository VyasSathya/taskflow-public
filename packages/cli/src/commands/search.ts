import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager, TaskOperations } from '@vibetasks/core';

export const searchCommand = new Command('search')
  .description('Search tasks by title')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .action(async (query: string, options: any) => {
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const limit = parseInt(options.limit, 10);
      const tasks = await taskOps.searchTasks(query, limit);

      if (tasks.length === 0) {
        console.log(chalk.gray(`\nNo tasks found matching: "${query}"\n`));
        process.exit(0);
      }

      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Title'),
          chalk.cyan('Priority'),
          chalk.cyan('Due Date'),
        ],
        colWidths: [12, 50, 10, 12],
        wordWrap: true,
      });

      tasks.forEach((task) => {
        const priorityColors = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
          none: chalk.gray,
        };

        const priorityColor = priorityColors[task.priority || 'none'];

        table.push([
          task.id.substring(0, 8),
          task.title,
          priorityColor(task.priority || 'none'),
          task.due_date ? task.due_date.split('T')[0] : chalk.gray('-'),
        ]);
      });

      console.log('\n' + table.toString());
      console.log(chalk.gray(`\nFound ${tasks.length} task${tasks.length === 1 ? '' : 's'} matching "${query}"\n`));
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
