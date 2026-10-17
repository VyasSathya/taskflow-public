#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uninstall() {
  console.log('🗑️  Uninstalling TaskFlow MCP integration...\n');

  let removedCount = 0;

  try {
    // 1. Remove from Claude Code config
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    const claudeConfigDir = path.join(configHome, 'claude-code');
    const claudeConfigPath = path.join(claudeConfigDir, 'config.json');

    try {
      const configData = await fs.readFile(claudeConfigPath, 'utf-8');
      const config = JSON.parse(configData);

      // Remove TaskFlow MCP server
      if (config.mcpServers?.taskflow) {
        delete config.mcpServers.taskflow;
        console.log('✓ Removed TaskFlow MCP server from Claude Code config');
        removedCount++;
      }

      // Remove SessionStart hook
      if (config.hooks?.SessionStart) {
        const mcpServerPath = path.resolve(__dirname, '..', 'dist', 'index.js');
        config.hooks.SessionStart = config.hooks.SessionStart.filter(
          h => !(h.command === 'node' && h.args?.[0] === mcpServerPath)
        );
        if (config.hooks.SessionStart.length === 0) {
          delete config.hooks.SessionStart;
        }
        console.log('✓ Removed SessionStart hook');
        removedCount++;
      }

      // Remove Stop/SessionEnd hook
      if (config.hooks?.Stop) {
        const mcpServerPath = path.resolve(__dirname, '..', 'dist', 'index.js');
        config.hooks.Stop = config.hooks.Stop.filter(
          h => !(h.command === 'node' && h.args?.[0] === mcpServerPath)
        );
        if (config.hooks.Stop.length === 0) {
          delete config.hooks.Stop;
        }
        console.log('✓ Removed SessionEnd hook');
        removedCount++;
      }

      // Clean up empty objects
      if (config.mcpServers && Object.keys(config.mcpServers).length === 0) {
        delete config.mcpServers;
      }
      if (config.hooks && Object.keys(config.hooks).length === 0) {
        delete config.hooks;
      }

      await fs.writeFile(claudeConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️  Could not update Claude Code config:', error.message);
      }
    }

    // 2. Remove CLI config directory
    const taskflowConfigDir = path.join(configHome, 'taskflow');
    try {
      await fs.rm(taskflowConfigDir, { recursive: true, force: true });
      console.log('✓ Removed CLI config directory');
      removedCount++;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️  Could not remove CLI config:', error.message);
      }
    }

    // 3. Note about npm unlink (can't do automatically)
    console.log('\n📝 Manual steps remaining:');
    console.log('   1. Unlink CLI globally:');
    console.log('      cd packages/cli && npm unlink -g');
    console.log('   2. Remove git hooks (if installed):');
    console.log('      rm .git/hooks/post-commit');
    console.log('   3. Clear keychain credentials (macOS/Windows):');
    console.log('      - macOS: Open Keychain Access → search "taskflow"');
    console.log('      - Windows: Control Panel → Credential Manager → search "taskflow"');

    console.log(`\n✅ Removed ${removedCount} configuration items`);
    console.log('\n💡 To complete uninstallation:');
    console.log('   - Restart Claude Code to apply config changes');
    console.log('   - Run the manual steps above');

  } catch (error) {
    console.error('❌ Uninstallation failed:', error.message);
    process.exit(1);
  }
}

uninstall();
