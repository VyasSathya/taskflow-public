#!/usr/bin/env node

/**
 * VibeTasks Claude Code Hook - sync-todos.js
 *
 * This script is triggered by Claude Code's SubagentStop hook.
 * It reads Claude's todo state from stdin and syncs it with VibeTasks.
 *
 * Input (from Claude Code hook):
 * {
 *   "todoState": [
 *     { "content": "Task description", "status": "completed", "activeForm": "..." },
 *     ...
 *   ]
 * }
 *
 * Status mapping:
 *   Claude "pending"     -> VibeTasks "todo"
 *   Claude "in_progress" -> VibeTasks "vibing"
 *   Claude "completed"   -> VibeTasks "done"
 *
 * The hook can operate in two modes:
 * 1. Using vibetasks CLI (fallback, always available)
 * 2. Using @vibetasks/core directly (faster, when available)
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Status mapping from Claude Code to VibeTasks
const STATUS_MAP = {
  'pending': 'todo',
  'in_progress': 'vibing',
  'completed': 'done',
};

/**
 * Read stdin until EOF
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    let resolved = false;

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      if (!resolved) {
        resolved = true;
        resolve(data);
      }
    });

    process.stdin.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (data) {
          resolve(data);
        } else {
          // No data received - that's okay for hooks
          resolve('{}');
        }
      }
    }, 5000);
  });
}

/**
 * Get log file path
 */
function getLogPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'vibetasks', 'logs', 'hook-sync.log');
}

/**
 * Log to file for debugging (hook output may not be visible)
 */
async function log(message) {
  const logFile = getLogPath();
  const logDir = path.dirname(logFile);

  try {
    await fs.mkdir(logDir, { recursive: true });
    const timestamp = new Date().toISOString();
    await fs.appendFile(logFile, `[${timestamp}] ${message}\n`);
  } catch (e) {
    // Silently ignore logging errors
  }
}

/**
 * Execute vibetasks CLI command
 */
function execVibetasks(args) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'vibetasks.cmd' : 'vibetasks';

    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`vibetasks exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Try to use @vibetasks/core directly for faster sync
 */
async function tryDirectSync(todos) {
  try {
    // Dynamic import of the core library
    const { AuthManager, TaskOperations, syncClaudeTodos } = await import('@vibetasks/core');

    const authManager = new AuthManager();
    const isAuthenticated = await authManager.isAuthenticated();

    if (!isAuthenticated) {
      await log('Not authenticated - falling back to CLI');
      return null;
    }

    const taskOps = await TaskOperations.fromAuthManager(authManager);
    const result = await syncClaudeTodos(taskOps, todos, {
      createMissing: false, // Don't create new tasks from Claude todos
      matchThreshold: 0.6,
      syncPending: false, // Only sync in_progress and completed
    });

    return result;
  } catch (error) {
    await log(`Direct sync failed: ${error.message}`);
    return null;
  }
}

/**
 * Fallback: Use CLI to sync todos
 */
async function syncViaCli(todos) {
  const syncResults = [];

  for (const todo of todos) {
    // Skip pending todos - we only sync when work starts or completes
    if (todo.status === 'pending') {
      continue;
    }

    const vibetasksStatus = STATUS_MAP[todo.status] || 'todo';

    try {
      // Search for matching task by title/content
      // Escape special characters in the search query
      const searchQuery = todo.content.replace(/"/g, '\\"').substring(0, 50);
      const searchResult = await execVibetasks(['search', `"${searchQuery}"`]);

      // Parse search results to find matching task
      const lines = searchResult.split('\n').filter(line => line.trim());

      let foundMatch = false;

      for (const line of lines) {
        // Try to extract task ID (first 8 chars of UUID pattern)
        const idMatch = line.match(/^([a-f0-9]{8})/i);
        if (idMatch) {
          const taskId = idMatch[1];

          // Check if the line contains the task content (fuzzy match)
          const contentWords = todo.content.toLowerCase().split(/\s+/).slice(0, 3);
          const lineWords = line.toLowerCase();

          const matchCount = contentWords.filter(word =>
            word.length > 2 && lineWords.includes(word)
          ).length;

          // Require at least 2 matching words
          if (matchCount >= 2) {
            // Update task status based on Claude's todo status
            if (vibetasksStatus === 'done') {
              await execVibetasks(['done', taskId]);
              syncResults.push({
                content: todo.content,
                action: 'updated',
                taskId,
                newStatus: 'done',
              });
            } else if (vibetasksStatus === 'vibing') {
              await execVibetasks(['vibing', taskId]);
              syncResults.push({
                content: todo.content,
                action: 'updated',
                taskId,
                newStatus: 'vibing',
              });
            }

            foundMatch = true;
            break;
          }
        }
      }

      if (!foundMatch) {
        syncResults.push({
          content: todo.content,
          action: 'not_found',
        });
      }
    } catch (error) {
      await log(`Error syncing todo "${todo.content}": ${error.message}`);
      syncResults.push({
        content: todo.content,
        action: 'error',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    processed: todos.length,
    synced: syncResults.filter(r => r.action === 'updated').length,
    failed: syncResults.filter(r => r.action === 'error').length,
    results: syncResults,
  };
}

/**
 * Main hook handler
 */
async function main() {
  try {
    await log('=== Hook triggered ===');

    // Read input from Claude Code hook
    const input = await readStdin();

    if (!input || !input.trim() || input.trim() === '{}') {
      await log('No input received - exiting gracefully');
      console.log(JSON.stringify({ success: true, message: 'No todos to sync' }));
      process.exit(0);
    }

    await log(`Received input (first 200 chars): ${input.substring(0, 200)}`);

    // Parse the JSON input
    let hookData;
    try {
      hookData = JSON.parse(input);
    } catch (e) {
      await log(`Failed to parse JSON: ${e.message}`);
      console.log(JSON.stringify({ success: false, error: 'Invalid JSON input' }));
      process.exit(1);
    }

    // Extract todo state - handle various input formats
    let todoState = hookData.todoState || hookData.todos || hookData.input?.todoState || [];

    // If todoState is the root object with a different structure
    if (Array.isArray(hookData) && hookData.length > 0 && hookData[0].content) {
      todoState = hookData;
    }

    if (!Array.isArray(todoState) || todoState.length === 0) {
      await log('No todos in hook data');
      console.log(JSON.stringify({ success: true, message: 'No todos in input' }));
      process.exit(0);
    }

    await log(`Processing ${todoState.length} todos...`);

    // Try direct sync first (faster), fall back to CLI
    let result = await tryDirectSync(todoState);

    if (!result) {
      await log('Using CLI fallback for sync');
      result = await syncViaCli(todoState);
    }

    await log(`Sync complete: ${JSON.stringify(result)}`);

    // Output results for hook debugging
    console.log(JSON.stringify(result));

    process.exit(0);
  } catch (error) {
    await log(`Hook error: ${error.message}\n${error.stack}`);
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  }
}

main();
