import { Command } from 'commander';
import chalk from 'chalk';
import { getSessionManager } from '../utils/session-manager.js';
import { detectProject } from '@vibetasks/shared/utils/project-detector';

export const sessionCommand = new Command('session')
  .description('Manage AI sessions for crash recovery and handoffs')
  .addCommand(
    new Command('start')
      .description('Start a new session')
      .action(async () => {
        const sessionManager = getSessionManager();
        const project = await detectProject();
        const session = await sessionManager.startSession(project?.name);

        console.log(chalk.green('✓ Session started'));
        console.log();
        console.log(chalk.cyan('Session ID:'), chalk.bold(session.id));
        console.log(chalk.gray('Full ID:'), session.fullId.slice(0, 8));
        if (session.project) {
          console.log(chalk.gray('Project:'), session.project);
        }
        console.log();
        console.log(chalk.yellow('Tip:'), 'If the AI crashes, tell the next one:');
        console.log(chalk.white(`  "Continue from session ${session.id}"`));
      })
  )
  .addCommand(
    new Command('current')
      .alias('status')
      .description('Show current session status')
      .action(async () => {
        const sessionManager = getSessionManager();
        const session = await sessionManager.getCurrentSession();

        if (!session) {
          console.log(chalk.yellow('No active session'));
          console.log(chalk.gray('Start one with: vibetasks session start'));
          return;
        }

        console.log(chalk.cyan('Current Session:'), chalk.bold(session.id));
        console.log(chalk.gray('Started:'), new Date(session.startedAt).toLocaleString());
        if (session.project) {
          console.log(chalk.gray('Project:'), session.project);
        }
        console.log(chalk.gray('Actions:'), session.actions.length);
        console.log();

        // Show recent actions
        if (session.actions.length > 0) {
          console.log(chalk.cyan('Recent actions:'));
          const recent = session.actions.slice(-5);
          for (const action of recent) {
            const time = new Date(action.timestamp).toLocaleTimeString();
            const icon = {
              task_created: '➕',
              task_completed: '✓',
              task_updated: '📝',
              file_modified: '📄',
              note: '💬',
            }[action.type];
            console.log(chalk.gray(`  ${icon} [${time}]`), action.description);
          }
          if (session.actions.length > 5) {
            console.log(chalk.gray(`  ... and ${session.actions.length - 5} more`));
          }
        }
      })
  )
  .addCommand(
    new Command('end')
      .description('End the current session')
      .option('-s, --summary <text>', 'Add a summary of what was done')
      .action(async (options: { summary?: string }) => {
        const sessionManager = getSessionManager();
        const session = await sessionManager.endSession(options.summary);

        if (!session) {
          console.log(chalk.yellow('No active session to end'));
          return;
        }

        console.log(chalk.green('✓ Session ended:'), chalk.bold(session.id));
        console.log(chalk.gray('Duration:'), formatDuration(session.startedAt, session.endedAt!));
        console.log(chalk.gray('Actions:'), session.actions.length);
        if (options.summary) {
          console.log(chalk.gray('Summary:'), options.summary);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List recent sessions')
      .option('-n, --limit <number>', 'Number of sessions to show', '10')
      .action(async (options: { limit: string }) => {
        const sessionManager = getSessionManager();
        const sessions = await sessionManager.getRecentSessions(parseInt(options.limit));

        if (sessions.length === 0) {
          console.log(chalk.yellow('No sessions found'));
          return;
        }

        console.log(chalk.cyan('Recent Sessions:'));
        console.log();

        for (const session of sessions) {
          const status = session.endedAt ? chalk.gray('ended') : chalk.green('active');
          const date = new Date(session.startedAt).toLocaleDateString();
          const actions = session.actions.length;

          console.log(
            chalk.bold(session.id),
            status,
            chalk.gray(`| ${date} | ${actions} actions`),
            session.project ? chalk.blue(`[${session.project}]`) : ''
          );
        }
      })
  )
  .addCommand(
    new Command('show')
      .alias('handoff')
      .description('Show session details for handoff to next AI')
      .argument('<session-id>', 'Session ID (partial match supported)')
      .action(async (sessionId: string) => {
        const sessionManager = getSessionManager();
        const handoff = await sessionManager.getSessionHandoff(sessionId);
        console.log(handoff);
      })
  )
  .addCommand(
    new Command('log')
      .description('Log an action or note to the current session')
      .argument('<message>', 'Note to log')
      .action(async (message: string) => {
        const sessionManager = getSessionManager();
        await sessionManager.logAction({
          type: 'note',
          description: message,
        });
        console.log(chalk.green('✓ Logged to session'));
      })
  );

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
