/**
 * Inbox Command - View and manage inbox items from all sources
 * 
 * Usage:
 *   vibetasks inbox              # List inbox items
 *   vibetasks inbox stats        # Show inbox statistics
 *   vibetasks inbox --source sentry  # Filter by source
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager, TaskOperations, SourceType } from '@vibetasks/core';

// Source type display names and colors
const sourceDisplay: Record<string, { label: string; color: (s: string) => string }> = {
  sentry: { label: 'Sentry', color: chalk.red },
  ci: { label: 'CI', color: chalk.yellow },
  github_bug: { label: 'GitHub Bug', color: chalk.magenta },
  github_feedback: { label: 'GitHub', color: chalk.magenta },
  email_bug: { label: 'Email Bug', color: chalk.blue },
  email_feedback: { label: 'Email', color: chalk.blue },
  slack_bug: { label: 'Slack Bug', color: chalk.cyan },
  slack_feedback: { label: 'Slack', color: chalk.cyan },
  manual: { label: 'Manual', color: chalk.gray },
};

/**
 * Get source type from task (inferred or explicit)
 */
function getSourceType(task: any): string {
  if (task.source_type) return task.source_type;
  if (task.sentry_issue_id) return 'sentry';
  if (task.github_issue_id) return task.title?.toLowerCase().includes('bug') ? 'github_bug' : 'github_feedback';
  if (task.email_message_id) return task.title?.toLowerCase().includes('bug') ? 'email_bug' : 'email_feedback';
  if (task.slack_message_id) return task.title?.toLowerCase().includes('bug') ? 'slack_bug' : 'slack_feedback';
  if (task.tags?.some((t: any) => t.name === 'ci')) return 'ci';
  return 'manual';
}

/**
 * Format source for display
 */
function formatSource(sourceType: string): string {
  const config = sourceDisplay[sourceType] || sourceDisplay.manual;
  return config.color(config.label);
}

export const inboxCommand = new Command('inbox')
  .description('View inbox items from all sources (Sentry, GitHub, Email, Slack, CI)')
  .option('-s, --source <source>', 'Filter by source: sentry, ci, github, email, slack, errors, feedback')
  .option('-p, --priority <priority>', 'Filter by priority: high, medium, low')
  .option('-a, --all', 'Include acknowledged items')
  .option('-l, --limit <number>', 'Maximum items to show', '20')
  .action(async (options: { source?: string; priority?: string; all?: boolean; limit: string }) => {
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // Map source filter to source types
      let sourceTypes: SourceType[] | undefined;
      if (options.source) {
        switch (options.source.toLowerCase()) {
          case 'sentry':
            sourceTypes = ['sentry'];
            break;
          case 'ci':
            sourceTypes = ['ci'];
            break;
          case 'github':
            sourceTypes = ['github_bug', 'github_feedback'];
            break;
          case 'email':
            sourceTypes = ['email_bug', 'email_feedback'];
            break;
          case 'slack':
            sourceTypes = ['slack_bug', 'slack_feedback'];
            break;
          case 'errors':
            sourceTypes = ['sentry', 'ci'];
            break;
          case 'feedback':
            sourceTypes = ['github_bug', 'github_feedback', 'email_bug', 'email_feedback', 'slack_bug', 'slack_feedback'];
            break;
          default:
            console.error(chalk.red(`Invalid source: ${options.source}`));
            console.error(chalk.gray('Valid sources: sentry, ci, github, email, slack, errors, feedback'));
            process.exit(1);
        }
      }

      // Validate priority
      let priority: 'high' | 'medium' | 'low' | undefined;
      if (options.priority) {
        if (!['high', 'medium', 'low'].includes(options.priority)) {
          console.error(chalk.red(`Invalid priority: ${options.priority}`));
          console.error(chalk.gray('Valid priorities: high, medium, low'));
          process.exit(1);
        }
        priority = options.priority as 'high' | 'medium' | 'low';
      }

      const limit = parseInt(options.limit, 10);
      const inboxItems = await taskOps.getInboxItems({
        source_type: sourceTypes,
        priority,
        unacknowledged_only: !options.all,
        limit,
      });

      if (inboxItems.length === 0) {
        console.log(chalk.green('\nInbox is empty! No items need attention.\n'));
        process.exit(0);
      }

      // Create table
      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Source'),
          chalk.cyan('Title'),
          chalk.cyan('Priority'),
          chalk.cyan('Status'),
        ],
        colWidths: [10, 14, 40, 10, 10],
        wordWrap: true,
      });

      const priorityColors: Record<string, (s: string) => string> = {
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue,
        none: chalk.gray,
      };

      const statusColors: Record<string, (s: string) => string> = {
        todo: chalk.gray,
        vibing: chalk.magenta,
        done: chalk.green,
        archived: chalk.dim,
      };

      inboxItems.forEach((item) => {
        const sourceType = getSourceType(item);
        const priorityColor = priorityColors[item.priority || 'none'];
        const statusColor = statusColors[item.status || 'todo'];
        const ack = item.context_notes?.includes('[AI_ACKNOWLEDGED]') ? chalk.dim(' (ack)') : '';

        table.push([
          item.id.substring(0, 8),
          formatSource(sourceType),
          item.title + ack,
          priorityColor(item.priority || 'none'),
          statusColor(item.status || 'todo'),
        ]);
      });

      console.log('\n' + chalk.bold('Inbox Items') + '\n');
      console.log(table.toString());
      console.log(chalk.gray(`\nShowing ${inboxItems.length} items${options.all ? ' (including acknowledged)' : ''}`));
      console.log(chalk.gray('Use: vibetasks inbox stats  for a summary'));
      console.log();

      process.exit(0);
    } catch (error: any) {
      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\nYou need to login first'));
        console.error(chalk.gray('Run: vibetasks login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }
      process.exit(1);
    }
  });

// Stats subcommand
export const inboxStatsCommand = new Command('stats')
  .description('Show inbox statistics')
  .action(async () => {
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      
      const stats = await taskOps.getInboxStats();

      console.log('\n' + chalk.bold('Inbox Statistics') + '\n');

      // Overall stats
      console.log(chalk.white(`Total items: ${stats.total}`));
      console.log(chalk.white(`Unacknowledged: ${stats.unacknowledged}`));
      console.log();

      // By source
      console.log(chalk.cyan('By Source:'));
      const sources = Object.entries(stats.by_source).filter(([_, count]) => count > 0);
      if (sources.length === 0) {
        console.log(chalk.gray('  No items from any source'));
      } else {
        for (const [source, count] of sources) {
          const config = sourceDisplay[source] || sourceDisplay.manual;
          console.log(`  ${config.color(config.label)}: ${count}`);
        }
      }
      console.log();

      // By priority
      console.log(chalk.cyan('By Priority:'));
      const priorities = Object.entries(stats.by_priority).filter(([_, count]) => count > 0);
      if (priorities.length === 0) {
        console.log(chalk.gray('  No prioritized items'));
      } else {
        const priorityColors: Record<string, (s: string) => string> = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
          none: chalk.gray,
        };
        for (const [priority, count] of priorities) {
          const color = priorityColors[priority] || chalk.gray;
          console.log(`  ${color(priority)}: ${count}`);
        }
      }
      console.log();

      // Status indicator
      if (stats.needs_attention) {
        console.log(chalk.yellow('Needs attention! Use: vibetasks inbox'));
      } else {
        console.log(chalk.green('Inbox is under control!'));
      }
      console.log();

      process.exit(0);
    } catch (error: any) {
      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\nYou need to login first'));
        console.error(chalk.gray('Run: vibetasks login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }
      process.exit(1);
    }
  });

// Add stats as subcommand
inboxCommand.addCommand(inboxStatsCommand);
