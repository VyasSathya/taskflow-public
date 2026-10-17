#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function install() {
  try {
    // Determine Claude Code config location
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    const claudeConfigDir = path.join(configHome, 'claude-code');
    const claudeConfigPath = path.join(claudeConfigDir, 'config.json');

    // Get absolute path to MCP server
    const mcpServerPath = path.resolve(__dirname, '..', 'dist', 'index.js');

    // Read Supabase credentials from web app .env
    const webEnvPath = path.resolve(__dirname, '..', '..', '..', 'apps', 'web', '.env.local');
    let supabaseUrl = (process.env.SUPABASE_URL || '');
    let supabaseKey = '';

    try {
      const envContent = await fs.readFile(webEnvPath, 'utf-8');
      const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
      const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

      if (urlMatch) supabaseUrl = urlMatch[1].trim();
      if (keyMatch) supabaseKey = keyMatch[1].trim();
    } catch (error) {
      console.warn('⚠️  Could not read .env.local, using defaults');
    }

    // Read existing config or create new
    let config = {};
    try {
      const existingConfig = await fs.readFile(claudeConfigPath, 'utf-8');
      config = JSON.parse(existingConfig);
    } catch (error) {
      // Config doesn't exist, will create new
      await fs.mkdir(claudeConfigDir, { recursive: true });
    }

    // Add TaskFlow MCP server
    if (!config.mcpServers) config.mcpServers = {};

    config.mcpServers.taskflow = {
      command: 'node',
      args: [mcpServerPath],
      env: {
        TASKFLOW_SUPABASE_URL: supabaseUrl,
        TASKFLOW_SUPABASE_KEY: supabaseKey
      }
    };

    // Add hooks
    if (!config.hooks) config.hooks = {};

    config.hooks.SessionStart = config.hooks.SessionStart || [];
    config.hooks.Stop = config.hooks.Stop || [];

    // Add SessionStart hook if not already present
    const sessionStartExists = config.hooks.SessionStart.some(
      h => h.command === 'node' && h.args?.[0] === mcpServerPath
    );

    if (!sessionStartExists) {
      config.hooks.SessionStart.push({
        type: 'command',
        command: 'node',
        args: [mcpServerPath],
        env: {
          CLAUDE_HOOK_TYPE: 'SessionStart',
          TASKFLOW_SUPABASE_URL: supabaseUrl
        }
      });
    }

    // Add SessionEnd (Stop) hook if not already present
    const sessionEndExists = config.hooks.Stop.some(
      h => h.command === 'node' && h.args?.[0] === mcpServerPath
    );

    if (!sessionEndExists) {
      config.hooks.Stop.push({
        type: 'command',
        command: 'node',
        args: [mcpServerPath],
        env: {
          CLAUDE_HOOK_TYPE: 'SessionEnd',
          TASKFLOW_SUPABASE_URL: supabaseUrl
        }
      });
    }

    // Write config
    await fs.writeFile(claudeConfigPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log('✓ TaskFlow MCP server installed successfully!');
    console.log('\nConfiguration written to:', claudeConfigPath);
    console.log('\nMCP Server path:', mcpServerPath);
    console.log('\n📝 Next steps:');
    console.log('1. Restart Claude Code');
    console.log('2. Type "@" in chat to see TaskFlow tools');
    console.log('3. Tools available: create_task, get_tasks, complete_task, etc.');
    console.log('\n💡 Hooks installed:');
    console.log('- SessionStart: Loads your tasks automatically');
    console.log('- SessionEnd: Auto-logs completed work as tasks');

  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  }
}

install();
