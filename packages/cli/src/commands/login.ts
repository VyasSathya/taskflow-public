import { Command } from 'commander';
import chalk from 'chalk';
import { loginWithBrowser } from '../utils/browser-auth.js';

export const loginCommand = new Command('login')
  .description('Authenticate with VibeTasks via browser (Google OAuth)')
  .option('-b, --browser', 'Login via browser (default)')
  .action(async () => {
    // VibeTasks uses Google OAuth - always use browser login
    console.log(chalk.blue.bold('\n🔐 VibeTasks Login\n'));
    console.log(chalk.gray('Opening browser for Google sign-in...\n'));
    await loginWithBrowser();
  });
