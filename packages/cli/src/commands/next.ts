import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { ShortIdManager } from '../utils/short-ids.js';

// Priority order for sorting (high first)
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };

export const nextCommand = new Command('next')
  .description('Show and optionally start the highest priority task')
  .option('-s, --start', 'Start vibing on the task immediately')
  .option('--project <name>', 'Filter by project tag')
  .action(async (options: any) => {
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      let tasks = await taskOps.getTasks('all');

      // Filter out done/archived tasks
      tasks = tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && !t.completed);

      // Apply project filter
      if (options.project) {
        tasks = tasks.filter(t => t.project_tag === options.project);
      }

      // Sort by priority (high -> medium -> low -> none)
      tasks.sort((a, b) => {
        const priorityDiff = (PRIORITY_ORDER[a.priority || 'none'] || 3) - (PRIORITY_ORDER[b.priority || 'none'] || 3);
        if (priorityDiff !== 0) return priorityDiff;
        // Secondary sort: vibing tasks first, then by position
        if (a.status === 'vibing' && b.status !== 'vibing') return -1;
        if (b.status === 'vibing' && a.status !== 'vibing') return 1;
        return (a.position || 0) - (b.position || 0);
      });

      if (tasks.length === 0) {
        console.log(chalk.gray('\n🎉 No tasks in queue! You\'re all caught up.\n'));
        process.exit(0);
      }

      const nextTask = tasks[0];

      // If --start flag, start vibing on it
      if (options.start && nextTask.status !== 'vibing') {
        await taskOps.updateTask(nextTask.id, { status: 'vibing' });
        console.log(chalk.green(`\n⚡ Started vibing on task!\n`));
      }

      // Display the next task
      const priorityColors: Record<string, (text: string) => string> = {
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue,
        none: chalk.gray,
      };

      const priorityEmojis: Record<string, string> = {
        high: '🔴',
        medium: '🟡',
        low: '🔵',
        none: '⚪',
      };

      const statusColors: Record<string, (text: string) => string> = {
        todo: chalk.gray,
        vibing: chalk.magenta,
        done: chalk.green,
      };

      const priority = nextTask.priority || 'none';
      const priorityColor = priorityColors[priority];
      const priorityEmoji = priorityEmojis[priority];
      const statusColor = statusColors[nextTask.status || 'todo'];

      // Save short ID mapping
      const shortIdManager = new ShortIdManager();
      await shortIdManager.saveMappings([nextTask.id]);

      console.log('\n' + chalk.bold('━'.repeat(50)));
      console.log(chalk.bold.cyan('\n📍 NEXT UP:\n'));

      // Title
      console.log(chalk.bold.white(`   ${nextTask.title}`));
      console.log();

      // Priority and Status
      console.log(`   ${priorityEmoji} Priority: ${priorityColor(priority.charAt(0).toUpperCase() + priority.slice(1))}`);
      console.log(`   📊 Status: ${statusColor(nextTask.status || 'todo')}`);

      // Project
      if (nextTask.project_tag) {
        console.log(`   📁 Project: ${chalk.blue(nextTask.project_tag)}`);
      }

      // Due date
      if (nextTask.due_date) {
        const dueDate = new Date(nextTask.due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        const dateStr = nextTask.due_date.split('T')[0];
        console.log(`   📅 Due: ${isOverdue ? chalk.red(dateStr + ' (OVERDUE)') : chalk.gray(dateStr)}`);
      }

      // Context notes
      if (nextTask.context_notes) {
        console.log(`\n   ${chalk.blue('💬 Context:')}`);
        console.log(chalk.gray(`   ${nextTask.context_notes}`));
      }

      // Subtasks
      const subtasks = (nextTask as any).subtasks_json || (nextTask as any).subtasks || [];
      if (subtasks.length > 0) {
        const doneCount = subtasks.filter((s: any) => s.done).length;
        console.log(`\n   ${chalk.cyan('✓ Subtasks:')} ${doneCount}/${subtasks.length} done`);
        subtasks.slice(0, 5).forEach((s: any) => {
          const icon = s.done ? chalk.green('✓') : chalk.gray('○');
          const text = s.done ? chalk.strikethrough.gray(s.title) : s.title;
          console.log(`     ${icon} ${text}`);
        });
        if (subtasks.length > 5) {
          console.log(chalk.gray(`     ... and ${subtasks.length - 5} more`));
        }
      }

      console.log('\n' + chalk.bold('━'.repeat(50)));

      // Quick actions
      console.log(chalk.gray('\n  Quick actions:'));
      if (nextTask.status !== 'vibing') {
        console.log(chalk.gray(`  • ${chalk.cyan('vibetasks next --start')} - Start vibing on this task`));
      }
      console.log(chalk.gray(`  • ${chalk.cyan('vibetasks vibing 1')} - Start working (short ID #1)`));
      console.log(chalk.gray(`  • ${chalk.cyan('vibetasks done 1')} - Mark as done`));
      console.log();

      process.exit(0);
    } catch (error: any) {
      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: vibetasks login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }
      process.exit(1);
    }
  });
