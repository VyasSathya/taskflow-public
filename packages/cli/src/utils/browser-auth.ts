import { createServer, IncomingMessage, ServerResponse } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';
import chalk from 'chalk';
import { AuthManager } from '@vibetasks/core';

const execAsync = promisify(exec);

// Open URL in default browser (cross-platform)
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
    console.log(chalk.yellow(`\nCouldn't open browser automatically. Please visit:\n${url}\n`));
  }
}

interface AuthCallbackData {
  access_token: string;
  refresh_token: string;
  email: string;
  supabase_url?: string;
  supabase_key?: string;
}

// Determine the best auth URL based on environment
function getAuthBaseUrl(): string {
  // Check for explicit override first
  if (process.env.VIBETASKS_AUTH_URL) {
    return process.env.VIBETASKS_AUTH_URL;
  }

  // Check for local development port
  if (process.env.TASKFLOW_WEB_PORT) {
    return `http://localhost:${process.env.TASKFLOW_WEB_PORT}`;
  }

  // Default to production
  return 'https://vibetasks.dev';
}

export async function loginWithBrowser(): Promise<void> {
  console.log(chalk.blue.bold('\n🔐 VibeTasks Browser Login\n'));

  const spinner = ora('Starting local server...').start();

  // Find available port
  const port = await getAvailablePort();

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Handle OPTIONS for CORS
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      // Handle callback
      if (req.url?.startsWith('/callback')) {
        const url = new URL(req.url, `http://localhost:${port}`);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const email = url.searchParams.get('email');
        const supabaseUrl = url.searchParams.get('supabase_url');
        const supabaseKey = url.searchParams.get('supabase_key');

        if (!accessToken || !refreshToken || !email) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; margin: 0 0 16px 0; }
                p { color: #666; margin: 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Authentication Failed</h1>
                <p>Missing required authentication data.</p>
                <p style="margin-top: 16px;">You can close this window.</p>
              </div>
            </body>
            </html>
          `);

          spinner.fail(chalk.red('Authentication failed - missing data'));
          if (timeoutId) clearTimeout(timeoutId);
          server.close(() => {
            process.exit(1);
          });
          reject(new Error('Authentication failed'));
          return;
        }

        try {
          // Store tokens
          const authManager = new AuthManager();
          await authManager.setAccessToken(accessToken);
          await authManager.setRefreshToken(refreshToken);

          // Store Supabase config if provided
          if (supabaseUrl) {
            await authManager.setConfig('supabase_url', supabaseUrl);
          }
          if (supabaseKey) {
            await authManager.setConfig('supabase_key', supabaseKey);
          }

          const storageMethod = authManager.getStorageMethod();
          const storageLocation = storageMethod === 'keychain'
            ? 'system keychain'
            : authManager['configManager'].getConfigPath();

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Successful</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 20px;
                }
                .container {
                  text-align: center;
                  padding: 60px 40px;
                  background: white;
                  border-radius: 20px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 450px;
                  width: 100%;
                }
                .checkmark {
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  display: block;
                  stroke-width: 3;
                  stroke: #4CAF50;
                  stroke-miterlimit: 10;
                  margin: 0 auto 24px;
                  animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
                }
                .checkmark-circle {
                  stroke-dasharray: 166;
                  stroke-dashoffset: 166;
                  stroke-width: 3;
                  stroke-miterlimit: 10;
                  stroke: #4CAF50;
                  fill: none;
                  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }
                .checkmark-check {
                  transform-origin: 50% 50%;
                  stroke-dasharray: 48;
                  stroke-dashoffset: 48;
                  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                }
                @keyframes stroke {
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes scale {
                  0%, 100% { transform: none; }
                  50% { transform: scale3d(1.1, 1.1, 1); }
                }
                h1 {
                  color: #2d3748;
                  font-size: 28px;
                  font-weight: 700;
                  margin-bottom: 12px;
                }
                .email {
                  font-weight: 600;
                  color: #667eea;
                  font-size: 16px;
                  margin-bottom: 24px;
                }
                .message {
                  color: #718096;
                  font-size: 15px;
                  line-height: 1.6;
                }
                .success-badge {
                  display: inline-block;
                  background: #f0fdf4;
                  color: #15803d;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  margin-top: 20px;
                }
                .button-group {
                  margin-top: 32px;
                  display: flex;
                  gap: 12px;
                  justify-content: center;
                }
                .button {
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-decoration: none;
                  display: inline-block;
                }
                .button-primary {
                  background: #667eea;
                  color: white;
                  border: none;
                }
                .button-primary:hover {
                  background: #5568d3;
                  transform: translateY(-1px);
                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .button-secondary {
                  background: #f7fafc;
                  color: #4a5568;
                  border: 2px solid #e2e8f0;
                }
                .button-secondary:hover {
                  background: #edf2f7;
                  border-color: #cbd5e0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
                <h1>Authentication Successful!</h1>
                <p class="email">${email}</p>
                <p class="message">
                  Your VibeTasks CLI is now connected to your account.<br>
                  You can close this window and return to your terminal.
                </p>
                <div class="success-badge">Ready to use</div>
                <div class="button-group">
                  <a href="https://vibetasks.dev/dashboard" class="button button-primary">Go to Dashboard</a>
                  <button onclick="window.close()" class="button button-secondary">Close Window</button>
                </div>
              </div>
            </body>
            </html>
          `);

          spinner.succeed(chalk.green('Successfully authenticated!'));
          console.log(chalk.gray(`\nLogged in as: ${email}`));
          console.log(chalk.gray(`Tokens stored in: ${storageLocation}`));
          console.log(chalk.blue.bold('\n✨ You can now use VibeTasks CLI commands\n'));

          // Clear timeout and resolve immediately
          if (timeoutId) clearTimeout(timeoutId);
          resolve();

          // Close server and exit process (CLI tools should exit explicitly)
          server.close(() => {
            process.exit(0);
          });
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Storage Error</title>
              <style>
                body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; margin: 0 0 16px 0; }
                p { color: #666; margin: 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Storage Error</h1>
                <p>Failed to store authentication tokens.</p>
                <p style="margin-top: 16px;">You can close this window.</p>
              </div>
            </body>
            </html>
          `);

          spinner.fail(chalk.red('Failed to store tokens'));
          console.error(chalk.red(`\nError: ${error.message}`));
          if (timeoutId) clearTimeout(timeoutId);
          server.close(() => {
            process.exit(1);
          });
          reject(error);
        }
        return;
      }

      // Handle other requests
      res.writeHead(404);
      res.end();
    });

    server.listen(port, async () => {
      spinner.text = 'Opening browser...';

      // Construct auth URL - defaults to production, can override for local dev
      const baseUrl = getAuthBaseUrl();
      const authUrl = `${baseUrl}/cli-auth?port=${port}`;

      spinner.text = 'Waiting for authentication in browser...';
      console.log(chalk.gray(`\nOpening: ${authUrl}`));
      console.log(chalk.gray(`\nIf browser doesn't open, visit the URL above.\n`));

      // Open browser
      await openBrowser(authUrl);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      spinner.fail(chalk.red('Server error'));
      console.error(chalk.red(`\nError: ${error.message}`));
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
      process.exit(1);
    });

    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      spinner.fail(chalk.red('Authentication timeout'));
      console.log(chalk.yellow('\nAuthentication timed out after 5 minutes'));
      server.close(() => {
        process.exit(1);
      });
      reject(new Error('Authentication timeout'));
    }, 5 * 60 * 1000);
  });
}

// Find an available port
async function getAvailablePort(startPort: number = 3737): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        // Port is in use, try next one
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(error);
      }
    });
  });
}
