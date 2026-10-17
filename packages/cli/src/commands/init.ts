/**
 * TaskFlow Init Command
 * Auto-detect project and ask user to confirm
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager } from '@vibetasks/core';
import { detectProject, ProjectInfo } from '@vibetasks/shared/utils/project-detector';

export const initCommand = new Command('init')
  .description('Initialize TaskFlow for current project (auto-detect from git)')
  .option('--name <name>', 'Manually specify project name')
  .action(async (options) => {
    const spinner = ora('Detecting project...').start();

    try {
      const authManager = new AuthManager();

      // Auto-detect project
      const cwd = process.cwd();
      let project: ProjectInfo;

      if (options.name) {
        // Manual override
        project = {
          name: options.name,
          source: 'manual',
          path: cwd,
        };
        spinner.succeed(chalk.green('Using manual project name'));
      } else {
        // Auto-detect
        project = await detectProject(cwd);
        spinner.succeed(chalk.green('Project detected!'));
      }

      // Show what was detected
      console.log(chalk.white('\n📁 Project Info:'));
      console.log(chalk.gray(`   Name: ${chalk.white(project.name)}`));
      console.log(chalk.gray(`   Source: ${chalk.white(project.source)}`));
      console.log(chalk.gray(`   Path: ${chalk.white(project.path)}\n`));

      // Ask for confirmation
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Tag all tasks created from this directory as "${project.name}"?`,
          default: true,
        },
      ]);

      if (!answers.confirm) {
        console.log(chalk.gray('\nCancelled. Tasks will use default project.\n'));
        process.exit(0);
      }

      // Save project mapping
      await authManager.setConfig(`project_${cwd}`, project.name);

      console.log(chalk.green('\n✓ Project initialized!'));
      console.log(
        chalk.gray(
          `\nAll tasks created from ${chalk.white(cwd)} will be tagged as ${chalk.white(project.name)}\n`
        )
      );
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.gray('  • Run taskflow add "Your task" to create tasks'));
      console.log(chalk.gray('  • Tasks will automatically be tagged with this project'));
      console.log(chalk.gray('  • Use taskflow list --project to filter by project\n'));

      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to initialize project'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });
