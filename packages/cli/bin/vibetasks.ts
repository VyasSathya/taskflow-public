#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import { loginCommand } from '../src/commands/login.js';
import { addCommand } from '../src/commands/add.js';
import { listCommand } from '../src/commands/list.js';
import { doneCommand } from '../src/commands/done.js';
import { vibingCommand } from '../src/commands/vibing.js';
import { searchCommand } from '../src/commands/search.js';
import { updateCommand } from '../src/commands/update.js';
import { deleteCommand } from '../src/commands/delete.js';
import { configCommand } from '../src/commands/config.js';
import { hooksCommand } from '../src/commands/hooks.js';
import { initCommand } from '../src/commands/init.js';
import { setupCommand } from '../src/commands/setup.js';
import { watchCommand, checkCommand } from '../src/commands/watch.js';
import { archiveCommand } from '../src/commands/archive.js';
import { daemonCommand } from '../src/commands/daemon.js';
import { nextCommand } from '../src/commands/next.js';
import { sessionCommand } from '../src/commands/session.js';
import { subtaskCommand } from '../src/commands/subtask.js';
import { errorCommand } from '../src/commands/error.js';
import { inboxCommand } from '../src/commands/inbox.js';

// Get version from package.json
const require = createRequire(import.meta.url);
// In dist, we're at dist/bin/vibetasks.js, so package.json is at ../../package.json
const pkg = require('../../package.json');

const program = new Command();

program
  .name('vibetasks')
  .description('VibeTasks CLI - Fast task management for vibers')
  .version(pkg.version);

// Add all commands
program.addCommand(setupCommand);  // Setup wizard first (most important for new users)
program.addCommand(loginCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(vibingCommand); // Start vibing on a task
program.addCommand(doneCommand);
program.addCommand(searchCommand);
program.addCommand(updateCommand);
program.addCommand(deleteCommand);
program.addCommand(configCommand);
program.addCommand(hooksCommand);
program.addCommand(initCommand);
program.addCommand(watchCommand);    // Watch clipboard for errors
program.addCommand(checkCommand);    // One-time clipboard check
program.addCommand(archiveCommand);  // Archive completed tasks
program.addCommand(daemonCommand);   // Background daemon with keyboard shortcuts
program.addCommand(nextCommand);     // Get highest priority task
program.addCommand(sessionCommand);  // AI session tracking for crash recovery
program.addCommand(subtaskCommand);  // Manage subtasks (list, done, undo)
program.addCommand(errorCommand);    // Capture errors as high-priority tasks
program.addCommand(inboxCommand);    // View inbox items from all sources

program.parse();
