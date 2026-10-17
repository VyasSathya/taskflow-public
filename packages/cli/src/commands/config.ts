import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from '@vibetasks/core';

export const configCommand = new Command('config')
  .description('View or set configuration')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(async (key?: string, value?: string) => {
    try {
      const authManager = new AuthManager();

      // If no key provided, show all config
      if (!key) {
        const configManager = authManager['configManager'];
        const config = await configManager.getConfig();
        const configPath = configManager.getConfigPath();

        console.log(chalk.blue.bold('\n📋 TaskFlow Configuration\n'));
        console.log(chalk.gray(`Location: ${configPath}\n`));

        if (Object.keys(config).length === 0) {
          console.log(chalk.gray('No configuration set.\n'));
          process.exit(0);
        }

        Object.entries(config).forEach(([k, v]) => {
          // Hide sensitive values
          if (k.includes('token') || k.includes('key')) {
            console.log(`${chalk.cyan(k)}: ${chalk.gray('[hidden]')}`);
          } else {
            console.log(`${chalk.cyan(k)}: ${chalk.white(String(v))}`);
          }
        });

        console.log();
        process.exit(0);
      }

      // If key but no value, show single value
      if (!value) {
        const val = await authManager.getConfig(key);

        if (val === undefined) {
          console.log(chalk.gray(`\nConfiguration key "${key}" not set.\n`));
        } else {
          // Hide sensitive values
          if (key.includes('token') || key.includes('key')) {
            console.log(chalk.gray(`\n${key}: [hidden]\n`));
          } else {
            console.log(chalk.white(`\n${key}: ${val}\n`));
          }
        }
        process.exit(0);
      }

      // Set configuration value
      await authManager.setConfig(key, value);
      console.log(chalk.green(`\n✓ Configuration updated: ${key} = ${value}\n`));
      process.exit(0);
    } catch (error: any) {
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });
