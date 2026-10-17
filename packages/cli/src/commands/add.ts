import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager, TaskOperations } from '@vibetasks/core';
import { parseDate } from '../utils/date-parser.js';
import { detectProject } from '@vibetasks/shared/utils/project-detector';
import { randomUUID } from 'crypto';
import { getSessionManager } from '../utils/session-manager.js';

export const addCommand = new Command('add')
  .description('Add a new task')
  .argument('<title>', 'Task title')
  .option('-n, --notes <notes>', 'Task notes (markdown supported)')
  .option('-d, --due <date>', 'Due date (YYYY-MM-DD, "today", "tomorrow", "+3d")')
  .option('-p, --priority <level>', 'Priority: low, medium, high', 'none')
  .option('-t, --tags <tags...>', 'Tags (space-separated)')
  .option('-s, --subtasks <subtasks...>', 'Subtasks (space-separated, use quotes for multi-word)')
  .option('--project <name>', 'Override auto-detected project')
  .option('-e, --energy <level>', 'Energy required: low, medium, high')
  .action(async (title: string, options: any) => {
    const spinner = ora('Creating task...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // AUTO-DETECT PROJECT FROM CURRENT DIRECTORY
      let projectTag: string | undefined;

      if (options.project) {
        // Manual override
        projectTag = options.project;
      } else {
        // Auto-detect from git/package.json/directory
        try {
          const detected = await detectProject(process.cwd());
          projectTag = detected.name;

          // Show what was detected (only in verbose mode)
          if (process.env.TASKFLOW_VERBOSE) {
            console.log(chalk.gray(`Detected project: ${projectTag} (${detected.source})`));
          }
        } catch (error) {
          // Detection failed, continue without project tag
          if (process.env.TASKFLOW_VERBOSE) {
            console.log(chalk.gray('Could not detect project'));
          }
        }
      }

      // DETECT IF CREATED BY AI OR HUMAN
      const createdBy = isRunningInClaudeCode() ? 'ai' : 'human';

      // Parse due date (defaults to today if not specified)
      let dueDate: string | undefined;
      if (options.due) {
        dueDate = parseDate(options.due);
      } else {
        // Default to today
        dueDate = parseDate('today');
      }

      // Validate priority
      const validPriorities = ['none', 'low', 'medium', 'high'];
      if (!validPriorities.includes(options.priority)) {
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }

      // Validate energy level if provided
      if (options.energy) {
        const validEnergy = ['low', 'medium', 'high'];
        if (!validEnergy.includes(options.energy)) {
          throw new Error(`Invalid energy level. Must be one of: ${validEnergy.join(', ')}`);
        }
      }

      // Build subtasks JSON array if provided
      const subtasksJson = options.subtasks?.map((subtaskTitle: string) => ({
        id: randomUUID(),
        title: subtaskTitle,
        done: false,
      })) || [];

      // Create task with auto-detected project and AI tracking
      const task = await taskOps.createTask({
        title,
        notes: options.notes,
        notes_format: 'markdown',
        due_date: dueDate,
        priority: options.priority,
        project_tag: projectTag, // AUTO-TAGGED!
        created_by: createdBy, // ai or human
        status: createdBy === 'ai' ? 'vibing' : 'todo', // AI tasks start vibing
        energy_required: options.energy,
        subtasks_json: subtasksJson,
      });

      // Handle tags if provided
      if (options.tags && options.tags.length > 0) {
        const tagIds: string[] = [];
        for (const tagName of options.tags) {
          const tag = await taskOps.findOrCreateTag(tagName);
          tagIds.push(tag.id);
        }
        await taskOps.linkTaskTags(task.id, tagIds);
      }

      spinner.succeed(chalk.green('Task created!'));

      // Log to session if AI-created
      if (createdBy === 'ai') {
        const sessionManager = getSessionManager();
        await sessionManager.logAction({
          type: 'task_created',
          description: `Created task: "${title}"`,
          taskId: task.id,
          taskTitle: title,
        });
      }

      // Display task details
      console.log();
      if (projectTag) {
        console.log(chalk.gray(`📁 Project: ${chalk.white(projectTag)}`));
      }
      if (createdBy === 'ai') {
        console.log(chalk.gray(`🤖 Created by: ${chalk.cyan('AI')}`));
        console.log(chalk.gray(`⚡ Status: ${chalk.magenta('vibing')}`));
      }
      console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}...`));
      console.log(chalk.white.bold(task.title));

      if (task.notes) {
        console.log(chalk.gray(`Notes: ${task.notes.substring(0, 50)}${task.notes.length > 50 ? '...' : ''}`));
      }

      if (task.priority && task.priority !== 'none') {
        const priorityColors = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
        };
        console.log(priorityColors[task.priority](`Priority: ${task.priority.toUpperCase()}`));
      }

      if (task.energy_required) {
        const energyEmoji = { low: '🔋', medium: '⚡', high: '🔥' };
        console.log(chalk.gray(`Energy: ${energyEmoji[task.energy_required]} ${task.energy_required}`));
      }

      if (task.due_date) {
        console.log(chalk.blue(`Due: ${task.due_date.split('T')[0]}`));
      }

      if (options.tags && options.tags.length > 0) {
        console.log(chalk.magenta(`Tags: ${options.tags.join(', ')}`));
      }

      if (subtasksJson.length > 0) {
        console.log(chalk.cyan(`Subtasks: ${subtasksJson.length}`));
        subtasksJson.forEach((st: any, i: number) => {
          console.log(chalk.gray(`  ${i + 1}. ${st.title}`));
        });
      }

      console.log(); // Empty line
      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create task'));

      if (error.message.includes('Not authenticated')) {
        console.error(chalk.yellow('\n⚠️  You need to login first'));
        console.error(chalk.gray('Run: taskflow login\n'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}\n`));
      }

      process.exit(1);
    }
  });

/**
 * Detect if running inside Claude Code
 * Checks multiple environment variables to identify AI sessions
 */
function isRunningInClaudeCode(): boolean {
  return !!(
    process.env.CLAUDE_CODE_SESSION ||
    process.env.ANTHROPIC_CLI_SESSION ||
    process.env.TERM_PROGRAM?.includes('claude') ||
    process.env.TERM_PROGRAM?.includes('anthropic')
  );
}
