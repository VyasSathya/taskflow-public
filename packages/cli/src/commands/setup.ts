/**
 * VibeTasks Unified Setup Command
 *
 * Single interactive wizard that handles:
 * 1. Authentication (browser-based)
 * 2. Claude Code MCP configuration
 * 3. Project initialization (optional)
 * 4. Verification
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthManager, TaskOperations, createSupabaseClient } from '@vibetasks/core';
import { detectProject, ProjectInfo } from '@vibetasks/shared/utils/project-detector';

const execAsync = promisify(exec);

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = (process.env.SUPABASE_URL || '');
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  let command: string;

  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  try {
    await execAsync(command);
  } catch (error) {
    // Silent fail - we'll show the URL manually
  }
}

async function getAvailablePort(startPort: number = 3737): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(error);
      }
    });
  });
}

function getClaudeConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'claude-code', 'config.json');
}

async function claudeCodeConfigExists(): Promise<boolean> {
  try {
    const configDir = path.dirname(getClaudeConfigPath());
    await fs.access(configDir);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// STEP 1: WELCOME
// ============================================================================

function showWelcome(): void {
  console.log('\n');
  console.log(chalk.bold.magenta('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.white('               VibeTasks Setup Wizard'));
  console.log(chalk.bold.magenta('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.gray('  This wizard will set up VibeTasks in about 2 minutes:'));
  console.log('');
  console.log(chalk.white('  1.') + chalk.gray(' Authenticate with your account'));
  console.log(chalk.white('  2.') + chalk.gray(' Configure Claude Code integration'));
  console.log(chalk.white('  3.') + chalk.gray(' Initialize project (optional)'));
  console.log(chalk.white('  4.') + chalk.gray(' Verify everything works'));
  console.log('');
}

// ============================================================================
// STEP 2: AUTHENTICATION
// ============================================================================

interface AuthResult {
  success: boolean;
  email?: string;
  storageLocation?: string;
  skipped?: boolean;
}

async function checkExistingAuth(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const authManager = new AuthManager();
    const token = await authManager.getAccessToken();
    if (!token) return { authenticated: false };

    // Try to get user info
    const supabaseUrl = (await authManager.getConfig('supabase_url')) || SUPABASE_URL;
    const supabaseKey = (await authManager.getConfig('supabase_key')) || SUPABASE_ANON_KEY;

    const supabase = createSupabaseClient({ supabaseUrl, supabaseKey, accessToken: token });
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email) {
      return { authenticated: true, email: user.email };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

async function runBrowserAuth(): Promise<AuthResult> {
  const port = await getAvailablePort();

  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const server = createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      if (req.url?.startsWith('/callback')) {
        const url = new URL(req.url, `http://localhost:${port}`);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const email = url.searchParams.get('email');
        const supabaseUrl = url.searchParams.get('supabase_url');
        const supabaseKey = url.searchParams.get('supabase_key');

        if (!accessToken || !refreshToken || !email) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(getErrorHtml('Missing authentication data'));
          if (timeoutId) clearTimeout(timeoutId);
          server.close(() => resolve({ success: false }));
          return;
        }

        try {
          const authManager = new AuthManager();
          await authManager.setAccessToken(accessToken);
          await authManager.setRefreshToken(refreshToken);
          if (supabaseUrl) await authManager.setConfig('supabase_url', supabaseUrl);
          if (supabaseKey) await authManager.setConfig('supabase_key', supabaseKey);

          const storageMethod = authManager.getStorageMethod();
          const storageLocation = storageMethod === 'keychain'
            ? 'system keychain'
            : authManager['configManager'].getConfigPath();

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getSuccessHtml(email));

          if (timeoutId) clearTimeout(timeoutId);
          server.close(() => resolve({ success: true, email, storageLocation }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(getErrorHtml('Failed to store tokens'));
          if (timeoutId) clearTimeout(timeoutId);
          server.close(() => resolve({ success: false }));
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(port, async () => {
      const taskflowPort = process.env.TASKFLOW_WEB_PORT || '2843';
      const authUrl = `http://localhost:${taskflowPort}/cli-auth?port=${port}`;

      console.log(chalk.gray(`\n  If browser doesn't open, visit:`));
      console.log(chalk.cyan(`  ${authUrl}\n`));

      await openBrowser(authUrl);
    });

    server.on('error', () => {
      resolve({ success: false });
    });

    // 3 minute timeout
    timeoutId = setTimeout(() => {
      server.close(() => resolve({ success: false }));
    }, 3 * 60 * 1000);
  });
}

async function stepAuthentication(): Promise<AuthResult> {
  console.log(chalk.bold.blue('\n━━━ Step 1: Authentication ━━━\n'));

  // Check if already authenticated
  const existing = await checkExistingAuth();
  if (existing.authenticated) {
    console.log(chalk.green('  ✓') + chalk.white(` Already logged in as ${chalk.cyan(existing.email)}`));

    const { reauth } = await inquirer.prompt([{
      type: 'confirm',
      name: 'reauth',
      message: 'Re-authenticate with a different account?',
      default: false,
    }]);

    if (!reauth) {
      return { success: true, email: existing.email, skipped: true };
    }
  }

  // Show auth options
  const { authMethod } = await inquirer.prompt([{
    type: 'list',
    name: 'authMethod',
    message: 'How would you like to authenticate?',
    choices: [
      { name: 'Browser login (recommended)', value: 'browser' },
      { name: 'Email & password', value: 'terminal' },
    ],
  }]);

  if (authMethod === 'browser') {
    const spinner = ora('Opening browser for authentication...').start();
    spinner.stop();
    console.log(chalk.gray('  Waiting for browser authentication...\n'));

    const result = await runBrowserAuth();

    if (result.success) {
      console.log(chalk.green('\n  ✓') + chalk.white(` Logged in as ${chalk.cyan(result.email)}`));
      console.log(chalk.gray(`    Tokens stored in: ${result.storageLocation}`));
    } else {
      console.log(chalk.red('\n  ✗ Authentication failed or timed out'));
    }

    return result;
  } else {
    // Terminal auth
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: (input: string) => input.includes('@') || 'Please enter a valid email',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: (input: string) => input.length >= 6 || 'Password must be at least 6 characters',
      },
    ]);

    const spinner = ora('Authenticating...').start();

    try {
      const authManager = new AuthManager();
      await authManager.setConfig('supabase_url', SUPABASE_URL);
      await authManager.setConfig('supabase_key', SUPABASE_ANON_KEY);

      const supabase = createSupabaseClient({
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: answers.email,
        password: answers.password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      await authManager.setAccessToken(data.session.access_token);
      await authManager.setRefreshToken(data.session.refresh_token);

      const storageMethod = authManager.getStorageMethod();
      const storageLocation = storageMethod === 'keychain'
        ? 'system keychain'
        : authManager['configManager'].getConfigPath();

      spinner.succeed(chalk.green('Authenticated successfully'));
      console.log(chalk.gray(`    Tokens stored in: ${storageLocation}`));

      return { success: true, email: answers.email, storageLocation };
    } catch (error: any) {
      spinner.fail(chalk.red('Authentication failed'));
      console.log(chalk.red(`    ${error.message}`));
      return { success: false };
    }
  }
}

// ============================================================================
// STEP 3: CLAUDE CODE CONFIGURATION
// ============================================================================

interface ClaudeConfigResult {
  success: boolean;
  configured?: boolean;
  skipped?: boolean;
  configPath?: string;
}

async function stepClaudeCodeConfig(): Promise<ClaudeConfigResult> {
  console.log(chalk.bold.blue('\n━━━ Step 2: Claude Code Integration ━━━\n'));

  const hasClaudeCode = await claudeCodeConfigExists();

  if (!hasClaudeCode) {
    console.log(chalk.yellow('  ⚠') + chalk.gray(' Claude Code config directory not found'));
    console.log(chalk.gray('    Run this command again after installing Claude Code'));

    const { createAnyway } = await inquirer.prompt([{
      type: 'confirm',
      name: 'createAnyway',
      message: 'Create config directory anyway?',
      default: false,
    }]);

    if (!createAnyway) {
      return { success: true, skipped: true };
    }
  }

  const { configure } = await inquirer.prompt([{
    type: 'confirm',
    name: 'configure',
    message: 'Configure VibeTasks MCP server for Claude Code?',
    default: true,
  }]);

  if (!configure) {
    return { success: true, skipped: true };
  }

  const spinner = ora('Configuring Claude Code...').start();

  try {
    const configPath = getClaudeConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Read existing config
    let config: any = {};
    try {
      const existing = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existing);
    } catch {
      // No existing config
    }

    // Initialize structures
    if (!config.mcpServers) config.mcpServers = {};
    if (!config.hooks) config.hooks = {};
    if (!config.hooks.SessionStart) config.hooks.SessionStart = [];
    if (!config.hooks.Stop) config.hooks.Stop = [];

    // Check if vibetasks is installed globally
    let mcpCommand = 'vibetasks-mcp';
    let mcpArgs: string[] = [];

    // Try to find the global installation
    try {
      if (process.platform === 'win32') {
        await execAsync('where vibetasks-mcp');
      } else {
        await execAsync('which vibetasks-mcp');
      }
    } catch {
      // Not found globally, use npx
      mcpCommand = 'npx';
      mcpArgs = ['@vibetasks/mcp-server'];
    }

    // Add MCP server config
    config.mcpServers.vibetasks = {
      command: mcpCommand,
      ...(mcpArgs.length > 0 && { args: mcpArgs }),
      env: {
        TASKFLOW_SUPABASE_URL: SUPABASE_URL,
        TASKFLOW_SUPABASE_KEY: SUPABASE_ANON_KEY,
      },
    };

    // Check if hooks already exist
    const hasSessionStartHook = config.hooks.SessionStart.some(
      (h: any) => h.command === mcpCommand || h.command === 'vibetasks-mcp'
    );
    const hasStopHook = config.hooks.Stop.some(
      (h: any) => h.command === mcpCommand || h.command === 'vibetasks-mcp'
    );

    // Add SessionStart hook
    if (!hasSessionStartHook) {
      config.hooks.SessionStart.push({
        type: 'command',
        command: mcpCommand,
        ...(mcpArgs.length > 0 && { args: mcpArgs }),
        env: {
          CLAUDE_HOOK_TYPE: 'SessionStart',
          TASKFLOW_SUPABASE_URL: SUPABASE_URL,
        },
      });
    }

    // Add Stop hook
    if (!hasStopHook) {
      config.hooks.Stop.push({
        type: 'command',
        command: mcpCommand,
        ...(mcpArgs.length > 0 && { args: mcpArgs }),
        env: {
          CLAUDE_HOOK_TYPE: 'SessionEnd',
          TASKFLOW_SUPABASE_URL: SUPABASE_URL,
        },
      });
    }

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    spinner.succeed(chalk.green('Claude Code configured'));
    console.log(chalk.gray(`    Config: ${configPath}`));
    console.log(chalk.gray('    Added: MCP server, SessionStart hook, SessionEnd hook'));

    return { success: true, configured: true, configPath };
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to configure Claude Code'));
    console.log(chalk.red(`    ${error.message}`));
    return { success: false };
  }
}

// ============================================================================
// STEP 4: PROJECT INITIALIZATION
// ============================================================================

interface ProjectResult {
  success: boolean;
  projectName?: string;
  skipped?: boolean;
}

async function stepProjectInit(): Promise<ProjectResult> {
  console.log(chalk.bold.blue('\n━━━ Step 3: Project Setup (Optional) ━━━\n'));

  const spinner = ora('Detecting project...').start();

  let project: ProjectInfo;
  try {
    project = await detectProject(process.cwd());
    spinner.succeed(chalk.green(`Detected: ${project.name}`));
    console.log(chalk.gray(`    Source: ${project.source}`));
    console.log(chalk.gray(`    Path: ${project.path}`));
  } catch {
    spinner.info(chalk.gray('No project detected in current directory'));
    return { success: true, skipped: true };
  }

  const { setupProject } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupProject',
    message: `Auto-tag tasks created here as "${project.name}"?`,
    default: true,
  }]);

  if (!setupProject) {
    return { success: true, skipped: true };
  }

  try {
    const authManager = new AuthManager();
    await authManager.setConfig(`project_${process.cwd()}`, project.name);

    console.log(chalk.green('\n  ✓') + chalk.white(` Project "${project.name}" configured`));
    return { success: true, projectName: project.name };
  } catch (error: any) {
    console.log(chalk.yellow('\n  ⚠') + chalk.gray(` Could not save project config: ${error.message}`));
    return { success: true, skipped: true };
  }
}

// ============================================================================
// STEP 5: VERIFICATION
// ============================================================================

interface VerifyResult {
  supabaseConnected: boolean;
  taskCount?: number;
  mcpConfigured: boolean;
}

async function stepVerify(): Promise<VerifyResult> {
  console.log(chalk.bold.blue('\n━━━ Step 4: Verification ━━━\n'));

  const result: VerifyResult = {
    supabaseConnected: false,
    mcpConfigured: false,
  };

  // Check Supabase connection
  const supabaseSpinner = ora('Testing Supabase connection...').start();
  try {
    const authManager = new AuthManager();
    const taskOps = await TaskOperations.fromAuthManager(authManager);
    const tasks = await taskOps.getTasks('all');

    result.supabaseConnected = true;
    result.taskCount = tasks.length;
    supabaseSpinner.succeed(chalk.green(`Supabase connected (${tasks.length} tasks found)`));
  } catch (error: any) {
    supabaseSpinner.fail(chalk.red('Supabase connection failed'));
    console.log(chalk.gray(`    ${error.message}`));
  }

  // Check MCP config
  const mcpSpinner = ora('Checking MCP configuration...').start();
  try {
    const configPath = getClaudeConfigPath();
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (config.mcpServers?.vibetasks) {
      result.mcpConfigured = true;
      mcpSpinner.succeed(chalk.green('MCP server configured'));
    } else {
      mcpSpinner.warn(chalk.yellow('MCP server not found in config'));
    }
  } catch {
    mcpSpinner.warn(chalk.yellow('Could not read Claude Code config'));
  }

  return result;
}

// ============================================================================
// COMPLETION SCREEN
// ============================================================================

function showCompletion(auth: AuthResult, claude: ClaudeConfigResult, project: ProjectResult, verify: VerifyResult): void {
  console.log('\n');
  console.log(chalk.bold.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.white('               Setup Complete!'));
  console.log(chalk.bold.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // Summary
  console.log(chalk.white('  Summary:'));
  console.log(`  ${auth.success ? chalk.green('✓') : chalk.red('✗')} Authentication: ${auth.email || 'Not configured'}`);
  console.log(`  ${claude.configured ? chalk.green('✓') : chalk.yellow('○')} Claude Code: ${claude.configured ? 'Configured' : 'Skipped'}`);
  console.log(`  ${project.projectName ? chalk.green('✓') : chalk.yellow('○')} Project: ${project.projectName || 'None'}`);
  console.log(`  ${verify.supabaseConnected ? chalk.green('✓') : chalk.red('✗')} Connection: ${verify.supabaseConnected ? `${verify.taskCount} tasks` : 'Failed'}`);
  console.log('');

  // Next steps
  if (claude.configured) {
    console.log(chalk.yellow('  ⚡ Important: Restart Claude Code to activate MCP server'));
    console.log('');
  }

  console.log(chalk.white('  What you can do now:'));
  console.log('');
  console.log(chalk.gray('    CLI Commands:'));
  console.log(chalk.cyan('    $ vibetasks add "My first task"'));
  console.log(chalk.cyan('    $ vibetasks list'));
  console.log(chalk.cyan('    $ vibetasks done <task-id>'));
  console.log('');

  if (claude.configured) {
    console.log(chalk.gray('    In Claude Code (after restart):'));
    console.log(chalk.cyan('    "Create a task to fix the login bug"'));
    console.log(chalk.cyan('    "Show my tasks for today"'));
    console.log(chalk.cyan('    "What should I work on next?"'));
  }

  console.log('');
  console.log(chalk.gray('  Need help? https://github.com/vyasapps/vibetasks'));
  console.log('');
}

// ============================================================================
// HTML TEMPLATES
// ============================================================================

function getSuccessHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>VibeTasks - Setup Success</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center; padding: 60px 40px; background: white;
      border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 450px;
    }
    .check { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #2d3748; font-size: 24px; margin-bottom: 8px; }
    .email { color: #667eea; font-weight: 600; margin-bottom: 20px; }
    p { color: #718096; line-height: 1.6; }
    .badge {
      display: inline-block; background: #f0fdf4; color: #15803d;
      padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="check">✓</div>
    <h1>Authentication Successful!</h1>
    <p class="email">${email}</p>
    <p>Return to your terminal to continue setup.</p>
    <div class="badge">You can close this window</div>
  </div>
</body>
</html>`;
}

function getErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>VibeTasks - Error</title>
  <style>
    body {
      font-family: system-ui; display: flex; align-items: center;
      justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;
    }
    .container {
      text-align: center; padding: 40px; background: white;
      border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #e53e3e; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authentication Failed</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

// ============================================================================
// MAIN COMMAND
// ============================================================================

// ============================================================================
// NON-INTERACTIVE SETUP (for CI/Claude Code)
// ============================================================================

async function runNonInteractiveSetup(): Promise<void> {
  console.log(chalk.bold.magenta('\n━━━ VibeTasks Auto Setup ━━━\n'));

  // Step 1: Check existing auth
  console.log(chalk.gray('Checking authentication...'));
  const existing = await checkExistingAuth();

  let authResult: AuthResult;
  if (existing.authenticated) {
    console.log(chalk.green('✓') + ` Already authenticated as ${chalk.cyan(existing.email)}`);
    authResult = { success: true, email: existing.email, skipped: true };
  } else {
    console.log(chalk.yellow('⚠') + ' Not authenticated');
    console.log(chalk.gray('  Run: vibetasks login'));
    authResult = { success: false };
  }

  // Step 2: Configure Claude Code (always do this)
  console.log(chalk.gray('\nConfiguring Claude Code MCP server...'));

  const configPath = getClaudeConfigPath();
  const configDir = path.dirname(configPath);

  try {
    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Read existing config
    let config: any = {};
    try {
      const existingConfig = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existingConfig);
    } catch {
      // No existing config
    }

    // Initialize structures
    if (!config.mcpServers) config.mcpServers = {};

    // Check if vibetasks-mcp is installed globally
    let mcpCommand = 'vibetasks-mcp';
    let mcpArgs: string[] = [];

    try {
      if (process.platform === 'win32') {
        await execAsync('where vibetasks-mcp');
      } else {
        await execAsync('which vibetasks-mcp');
      }
    } catch {
      // Not found globally, use npx
      mcpCommand = 'npx';
      mcpArgs = ['@vibetasks/mcp-server'];
    }

    // Add MCP server config
    config.mcpServers.vibetasks = {
      command: mcpCommand,
      ...(mcpArgs.length > 0 && { args: mcpArgs }),
    };

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log(chalk.green('✓') + ' MCP server configured');
    console.log(chalk.gray(`  Config: ${configPath}`));
  } catch (error: any) {
    console.log(chalk.red('✗') + ` Failed to configure: ${error.message}`);
  }

  // Step 3: Verify connection if authenticated
  if (authResult.success) {
    console.log(chalk.gray('\nVerifying connection...'));
    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);
      const tasks = await taskOps.getTasks('all');
      console.log(chalk.green('✓') + ` Connected (${tasks.length} tasks)`);
    } catch (error: any) {
      console.log(chalk.yellow('⚠') + ` Connection test failed: ${error.message}`);
    }
  }

  // Done
  console.log(chalk.bold.green('\n━━━ Setup Complete ━━━\n'));

  if (!authResult.success) {
    console.log(chalk.yellow('Next step: Run "vibetasks login" to authenticate\n'));
  } else {
    console.log(chalk.yellow('⚡ Restart Claude Code to activate MCP server\n'));
  }

  console.log(chalk.gray('Available commands:'));
  console.log(chalk.cyan('  vibetasks add "task title"') + chalk.gray('  - Create a task'));
  console.log(chalk.cyan('  vibetasks list') + chalk.gray('              - Show tasks'));
  console.log(chalk.cyan('  vibetasks login') + chalk.gray('             - Authenticate'));
  console.log('');
}

export const setupCommand = new Command('setup')
  .description('Interactive setup wizard for VibeTasks')
  .option('--skip-auth', 'Skip authentication step')
  .option('--skip-claude', 'Skip Claude Code configuration')
  .option('--skip-project', 'Skip project initialization')
  .option('--skip-verify', 'Skip verification step')
  .option('--auto', 'Non-interactive mode (for CI/automation)')
  .option('--non-interactive', 'Alias for --auto')
  .action(async (options) => {
    // Check if running in non-interactive environment
    const isNonInteractive = options.auto || options.nonInteractive || !process.stdin.isTTY;

    if (isNonInteractive) {
      await runNonInteractiveSetup();
      process.exit(0);
    }

    showWelcome();

    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Ready to begin setup?',
      default: true,
    }]);

    if (!proceed) {
      console.log(chalk.gray('\nSetup cancelled. Run `vibetasks setup` anytime to continue.\n'));
      process.exit(0);
    }

    // Step 1: Authentication
    let authResult: AuthResult = { success: false };
    if (!options.skipAuth) {
      authResult = await stepAuthentication();
      if (!authResult.success) {
        console.log(chalk.red('\n✗ Authentication is required to continue.'));
        console.log(chalk.gray('  Run `vibetasks setup` to try again.\n'));
        process.exit(1);
      }
    } else {
      authResult = { success: true, skipped: true };
    }

    // Step 2: Claude Code Config
    let claudeResult: ClaudeConfigResult = { success: true, skipped: true };
    if (!options.skipClaude) {
      claudeResult = await stepClaudeCodeConfig();
    }

    // Step 3: Project Init
    let projectResult: ProjectResult = { success: true, skipped: true };
    if (!options.skipProject) {
      projectResult = await stepProjectInit();
    }

    // Step 4: Verification
    let verifyResult: VerifyResult = { supabaseConnected: false, mcpConfigured: false };
    if (!options.skipVerify && authResult.success && !authResult.skipped) {
      verifyResult = await stepVerify();
    } else if (authResult.skipped) {
      // Still verify if already authenticated
      verifyResult = await stepVerify();
    }

    // Show completion
    showCompletion(authResult, claudeResult, projectResult, verifyResult);

    process.exit(0);
  });
