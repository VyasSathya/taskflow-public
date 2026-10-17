# VibeTasks MCP & CLI Integration Guide

Complete guide to using VibeTasks with AI coding tools (Claude Code, Cursor, Windsurf) and the command line.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Claude Code Configuration](#claude-code-configuration)
4. [MCP Tools Reference](#mcp-tools-reference)
5. [CLI Usage](#cli-usage)
6. [Git Integration](#git-integration)
7. [Workflows](#workflows)
8. [Troubleshooting](#troubleshooting)

## Overview

VibeTasks provides seamless task management for vibe coders through:

- **CLI Tool** - Fast terminal task management
- **MCP Server** - AI coding tool integration with 11 tools
- **Status Workflow** - `todo` -> `vibing` -> `done` status tracking
- **Context Notes** - "Where I left off" notes for seamless task switching
- **Project Auto-Detection** - Tasks auto-tagged by git repository
- **WIP Limit Awareness** - Warns when too many tasks in progress
- **Git Hooks** - Automatic task updates from commits
- **Cross-Platform Sync** - Web, mobile, and command line

### What Makes It Different

| Feature | Linear | Todoist | VibeTasks |
|---------|--------|---------|-----------|
| **AI Integration** | - | - | 11 MCP Tools |
| **Status Workflow** | - | - | todo/vibing/done |
| **Context Notes** | - | - | "Where I left off" |
| **CLI First** | - | - | Yes |
| **Git Hooks** | - | - | Yes |
| **Solo Dev Focused** | - | Yes | Yes |
| **Auto Session Logging** | - | - | Yes |
| **Keyboard-First** | Yes | - | Yes |
| **Pricing (Solo)** | $8/user | $5/mo | Free |

## Installation

### Quick Setup (Recommended)

```bash
npm install -g @vibetasks/cli
vibetasks setup
```

The setup wizard handles everything:
1. Authenticates you via browser
2. Configures Claude Code integration (MCP server)
3. Initializes your current project
4. Verifies everything works

### Manual Setup (Alternative)

#### 1. Install CLI

```bash
npm install -g @vibetasks/cli
```

#### 2. Authenticate

```bash
vibetasks login --browser
```

#### 3. Install MCP Server (For AI Tools)

```bash
npm install -g @vibetasks/mcp-server
```

#### 4. Install Git Hooks (Optional)

```bash
cd /your/project
vibetasks install
```

## Claude Code Configuration

Configure Claude Code to use VibeTasks MCP server.

### Config File Location

- **macOS/Linux**: `~/.config/claude-code/config.json`
- **Windows**: `%APPDATA%\claude-code\config.json`

### Basic Configuration

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "vibetasks-mcp",
      "env": {
        "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co",
        "TASKFLOW_SUPABASE_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

### Configuration with Session Hooks

For automatic session logging (creates completed tasks when AI sessions end):

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "vibetasks-mcp",
      "env": {
        "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co",
        "TASKFLOW_SUPABASE_KEY": "your-supabase-anon-key"
      }
    }
  },
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "vibetasks-mcp",
        "env": {
          "CLAUDE_HOOK_TYPE": "SessionStart",
          "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co"
        }
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "vibetasks-mcp",
        "env": {
          "CLAUDE_HOOK_TYPE": "SessionEnd",
          "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co"
        }
      }
    ]
  }
}
```

**Restart Claude Code** after updating the config.

## MCP Tools Reference

VibeTasks provides 11 MCP tools for task management:

### Task Creation

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task (with optional parent for subtasks) |
| `create_task_with_subtasks` | Create parent + multiple subtasks in one call |

### Task Listing

| Tool | Description |
|------|-------------|
| `list_tasks` | Get tasks with status filter (todo, vibing, done) |
| `get_vibing_tasks` | Get all tasks currently in progress with context notes |
| `search_tasks` | Search tasks by title |

### Task Updates

| Tool | Description |
|------|-------------|
| `update_task` | Update task properties including status |
| `complete_task` | Mark task as done |
| `start_vibing` | Mark task as in progress with optional context notes |
| `set_context_notes` | Update "where I left off" notes |
| `delete_task` | Delete a task |

### Session Logging

| Tool | Description |
|------|-------------|
| `log_ai_session` | Log an AI coding session as a completed task |

### Status Field

Tasks have a `status` field with three values:

- **`todo`** - Task is captured but not started
- **`vibing`** - Task is in progress (you're actively working on it)
- **`done`** - Task is complete

### Example Tool Usage

```
# Create a task
@vibetasks create_task
  title: "Fix login bug"
  priority: "high"

# Start working on it
@vibetasks start_vibing
  task_id: "abc-123"
  context_notes: "Investigating the OAuth callback handler"

# Update progress
@vibetasks set_context_notes
  task_id: "abc-123"
  context_notes: "Found the bug - race condition in callback. Need to add mutex."

# Complete the task
@vibetasks complete_task task_id: "abc-123"

# List tasks by status
@vibetasks list_tasks status: "todo"
@vibetasks list_tasks status: "vibing"
@vibetasks list_tasks status: "done"

# Get what you're currently working on
@vibetasks get_vibing_tasks
```

## CLI Usage (v0.2.0)

### Quick Reference

```bash
# Setup (do this first!)
vibetasks setup

# Add task
vibetasks add "Task title" --priority high --due tomorrow

# List tasks
vibetasks list
vibetasks list today

# Start vibing on a task (aliases: start, v)
vibetasks vibing abc123
vibetasks start abc123
vibetasks v abc123

# Interactive task picker
vibetasks vibing --pick

# Complete task
vibetasks done abc123

# Search
vibetasks search "bug"

# Update
vibetasks update abc123 --priority high

# Delete
vibetasks delete abc123

# Config
vibetasks config

# Git hooks
vibetasks install
```

### Status Flow

```
todo → vibing → done
```

- **todo**: Task waiting to be worked on
- **vibing**: Currently working on it
- **done**: Task complete

### WIP Limit Warning

When >3 tasks are in "vibing" status:
```
Warning: You have 4 tasks vibing. Consider finishing some before starting more.
```

### Common Workflows

#### Morning Planning

```bash
# Check today's work
vibetasks list today

# Add priorities
vibetasks add "Review PRs" --priority high --due today
vibetasks add "Team sync" --due today
vibetasks add "Deploy fixes" --priority medium --due today
```

#### During Development

```bash
# Quick capture without breaking flow
vibetasks add "Fix auth bug" --priority high

# Work on feature...
git commit -m "feat: Add login [TASK-abc123]"
# Task auto-updated with commit link

# Complete feature
git commit -m "feat: Complete login [TASK-abc123] [COMPLETE]"
# Task auto-marked complete
```

#### End of Day Review

```bash
# See what you accomplished
vibetasks list completed

# Plan tomorrow
vibetasks add "Continue refactoring" --due tomorrow
vibetasks add "Code review" --due tomorrow --priority high
```

## MCP Server Features

### What It Does

1. **11 MCP Tools** - Full task management (create, update, delete, status, context notes)
2. **Status Workflow** - `todo` -> `vibing` -> `done` progress tracking
3. **Context Notes** - "Where I left off" notes for seamless task switching
4. **Project Auto-Detection** - Tasks auto-tagged from git repository
5. **WIP Limit Awareness** - Warns when too many tasks in "vibing" status
6. **Auto-Logs Sessions** - Creates completed tasks for work done with AI
7. **TodoWrite Integration** - Syncs Claude's ephemeral todo lists to persistent VibeTasks

### Using in Claude Code

#### Access Tools

Type `@` to see VibeTasks tools:

```
@vibetasks create_task
  title: "Implement OAuth"
  priority: "high"
  due_date: "2026-01-15"
```

#### Natural Conversations

```
You: "What should I work on today?"

AI: *calls list_tasks with status='todo'*
AI: "You have 3 tasks ready to work on:
     1. Fix auth bug (HIGH priority)
     2. Deploy updates (MEDIUM)
     3. Team sync (NONE)

     I recommend starting with the auth bug..."

You: "Let's fix the auth bug"

AI: *calls start_vibing with task_id and context_notes*
AI: "I've marked it as vibing. Let's look at the auth code..."

[30 minutes later]

AI: *calls set_context_notes to save progress*
AI: *calls complete_task when done*
```

#### Context Notes Workflow

```
You: "I need to stop working on this, save my progress"

AI: *calls set_context_notes*
    task_id: "abc-123"
    context_notes: "Fixed the callback handler. Still need to add unit tests for edge cases."

AI: "I've saved your context notes. When you come back, you'll see exactly where you left off."

[Next session]

AI: *calls get_vibing_tasks*
AI: "Welcome back! You were working on 'Fix auth bug'.
     Your notes say: 'Fixed the callback handler. Still need to add unit tests for edge cases.'
     Want to continue?"
```

#### TodoWrite Integration

When Claude uses TodoWrite for multi-step tasks, it automatically syncs to VibeTasks:

```
You: "Help me implement a new authentication system"

AI: *creates TodoWrite list*
    1. Create login component
    2. Add API endpoints
    3. Implement JWT handling
    4. Add middleware

AI: *ALSO calls create_task_with_subtasks*
    Creates persistent VibeTasks task with 4 subtasks

You work through the todos...

AI: *marks subtasks complete as you progress*

Result: TodoWrite (session planning) + VibeTasks (persistent tracking)
```

**Available MCP Tools (11 total):**
- `create_task` - Single task (optionally with parent_task_id for subtask)
- `create_task_with_subtasks` - Parent + multiple subtasks in one call
- `list_tasks` - Retrieve tasks by status filter (todo/vibing/done)
- `update_task` - Modify task properties including status
- `complete_task` - Mark task done
- `start_vibing` - Mark task as in progress with optional context notes
- `get_vibing_tasks` - Get all tasks currently being worked on
- `set_context_notes` - Update "where I left off" notes
- `delete_task` - Remove task
- `search_tasks` - Find tasks by title
- `log_ai_session` - Manually log session work

### Session Auto-Logging

When you code with AI:

**Before (SessionStart):**
```
# VibeTasks - Your Tasks

## Currently Vibing (1)
- [~] Fix auth bug [HIGH]
    Context: "Working on OAuth callback handler"

## Todo (2)
- [ ] Deploy updates
- [ ] Team sync

You can manage tasks using these MCP tools:
- create_task, list_tasks, start_vibing, complete_task...
```

**After (SessionEnd):**
```
New completed task created:

Title: "AI Session: Fixed OAuth callback bug"

Notes:
## Duration
32 minutes

## Files Edited
- auth.ts
- callback.ts
- types.ts

## Summary
Fixed race condition in OAuth callback handler...
```

## Git Integration

### Conventional Commits + Task Linking

```bash
# Link commit to task
git commit -m "feat: Add login page [TASK-abc123]"

# Mark task complete
git commit -m "feat: Complete auth [TASK-abc123] [COMPLETE]"

# Work in progress
git commit -m "wip: OAuth integration [TASK-def456] [WIP]"
```

### Commit Patterns

| Pattern | Effect |
|---------|--------|
| `[TASK-{id}]` | Links commit to task |
| `[COMPLETE]` | Marks task done |
| `[DONE]` | Marks task done |
| `[WIP]` | Marks in progress |
| `feat:` | Feature commit |
| `fix:` | Bug fix commit |

### Post-Commit Hook

Automatically installed with `vibetasks install`:

```bash
#!/bin/sh
# Parses commit message and updates VibeTasks

TASK_ID=$(echo "$COMMIT_MSG" | grep -oP '\[TASK-\K[a-zA-Z0-9-]+(?=\])')

if [ -n "$TASK_ID" ]; then
  if [ -n "$IS_COMPLETE" ]; then
    vibetasks done "$TASK_ID"
  fi
fi
```

## Workflows

### 1. Solo Developer (Pure CLI)

```bash
# Morning
vibetasks list today

# Throughout day
vibetasks add "Quick task" --due today
vibetasks done abc123

# Git integration
git commit -m "feat: New feature [TASK-abc123] [COMPLETE]"

# End of day
vibetasks list completed
```

**Benefits:**
- Never leave terminal
- Sub-second task capture
- Auto-updates from commits
- No context switching

### 2. AI-Assisted Development (CLI + MCP)

```bash
# Morning planning (CLI)
vibetasks add "Implement auth" --priority high --due today

# Open Claude Code
# AI sees: "You have 1 task today: Implement auth [HIGH]"

# Tell AI you're starting work
You: "I'm going to work on the auth task"
# AI calls start_vibing with context notes

# Code with AI for 45 minutes
# AI helps implement authentication

# Need to step away?
You: "Save my progress, I'll continue later"
# AI calls set_context_notes: "Finished login form, need to add JWT validation"

# Session ends
# Auto-created: "AI Session: Implemented OAuth"

# Continue in terminal
vibetasks list
# Shows: Original task (vibing) + AI session (completed)

git commit -m "feat: OAuth [TASK-abc123] [COMPLETE]"
# Original task now complete
```

**Benefits:**
- AI knows your current work
- Context notes preserve progress
- Auto-logs AI sessions
- Git integration still works
- Full context preservation

### 3. TodoWrite Integration (Multi-Step Tasks)

```bash
# Open Claude Code
You: "Help me build a payment processing feature"

# Claude creates TodoWrite list (session planning)
# Claude ALSO calls create_task_with_subtasks (persistent tracking)

# Work through todos with Claude
# - Claude marks subtasks complete as you progress
# - Everything persists to VibeTasks automatically

# Session ends
# TodoWrite (session): Cleared
# VibeTasks (persistent): Parent task + subtasks remain

# Later in terminal
vibetasks list
# Shows: Payment processing (4 subtasks, 2 complete)

# Continue work
vibetasks done <subtask-id>

# View on mobile/web
# Full task hierarchy visible everywhere
```

**Benefits:**
- Session planning + persistent tracking
- Subtasks survive session end
- Progress syncs across platforms
- AI and CLI both work with same tasks

### 4. Cross-Platform (CLI + Mobile + Web)

```bash
# Morning: Plan on mobile
# (Add tasks with VibeTasks app)

# Terminal: Check sync
vibetasks list
# Tasks from mobile appear

# Work in terminal
vibetasks done abc123

# Mobile: Check progress
# Completion synced

# AI Coding
# MCP server sees all tasks
# SessionEnd creates task

# Mobile: Review day
# AI session appears as completed task
```

**Benefits:**
- Plan anywhere
- Execute everywhere
- Never lose context
- Automatic sync

## Troubleshooting

### CLI Issues

**Not authenticated:**
```bash
vibetasks login --browser
vibetasks config  # Verify
```

**Slow performance:**
```bash
# Check Supabase connection
ping your-project.supabase.co

# Verify config
vibetasks config
```

**Git hooks not working:**
```bash
# Verify installation
cat .git/hooks/post-commit

# Re-install
vibetasks install
```

### MCP Server Issues

**Not appearing in Claude Code:**
```bash
# Check config location:
# macOS/Linux: ~/.config/claude-code/config.json
# Windows: %APPDATA%\claude-code\config.json

# Verify vibetasks-mcp is installed
vibetasks-mcp --version

# Reinstall if needed
npm install -g @vibetasks/mcp-server
```

**Authentication errors:**
```bash
# Re-login
vibetasks login --browser

# Verify config
vibetasks config
```

**Hooks not triggering:**
```bash
# Test manually
CLAUDE_HOOK_TYPE=SessionStart vibetasks-mcp
CLAUDE_HOOK_TYPE=SessionEnd vibetasks-mcp

# Verify environment variables in config.json
```

### Common Issues

**"Not authenticated" error:**
- Run `vibetasks login --browser`
- Check `vibetasks config` for stored tokens

**Tasks not syncing:**
- Verify internet connection
- Check Supabase status
- Re-authenticate: `vibetasks login --browser`

**MCP tools not visible:**
- Restart Claude Code
- Verify `vibetasks-mcp` command works in terminal
- Check environment variables in config.json
- Check stderr logs for errors

## Advanced Usage

### Custom Aliases

Add to `.bashrc` or `.zshrc`:

```bash
alias vt='vibetasks'
alias vta='vibetasks add'
alias vtl='vibetasks list'
alias vtd='vibetasks done'
alias vtt='vibetasks list today'
```

### Project-Specific Tasks

```bash
# Add project tag to all tasks
alias work-add='vibetasks add --tags work'

# List project tasks
alias work-list='vibetasks search "project-name"'
```

### Weekly Planning

```bash
#!/bin/bash
# weekly-plan.sh

echo "=== This Week's Tasks ==="
vibetasks add "Sprint planning" --due +1d --priority high
vibetasks add "Feature A" --due +3d --priority high
vibetasks add "Feature B" --due +5d --priority medium
vibetasks add "Sprint review" --due +7d --priority high

vibetasks list upcoming
```

### Integration with Other Tools

```bash
# Export tasks to JSON
vibetasks list --format json > tasks.json

# Import from other tools
cat external-tasks.json | jq -r '.[] | .title' | \
  while read title; do vibetasks add "$title"; done
```

## Best Practices

### 1. Use Status Workflow

- **todo** - Captured but not started
- **vibing** - Actively working on (limit to 2-3 max)
- **done** - Complete

### 2. Use Priorities Intentionally

- `high` - Must do today
- `medium` - Important but flexible
- `low` - Nice to have
- `none` - Backlog

### 3. Leverage Context Notes

Save your progress before switching tasks:
```bash
# Before switching
@vibetasks set_context_notes
  task_id: "abc-123"
  context_notes: "Finished API, need to add frontend form"

# When returning
@vibetasks get_vibing_tasks
# See exactly where you left off
```

### 4. Leverage Git Integration

Always include task IDs in commits:
```bash
git commit -m "feat: Description [TASK-abc123]"
```

### 5. Quick Capture

Don't overthink - capture fast, organize later:
```bash
vibetasks add "Quick idea"
# Refine later with update
vibetasks update abc123 --priority high --due tomorrow
```

### 6. Review Regularly

```bash
# Daily
vibetasks list today

# Weekly
vibetasks list upcoming

# Monthly
vibetasks list completed
```

### 7. Use AI Sessions

Let AI log your work automatically - don't duplicate:
```bash
# Instead of manually creating "Implemented auth" task
# Just code with AI, it will auto-log the session
```

### 8. TodoWrite for Complex Tasks

Let Claude manage multi-step work automatically:
```bash
# Good: Ask Claude to plan and execute
You: "Build a payment system"
# Claude creates TodoWrite + VibeTasks subtasks automatically

# Avoid: Manually creating subtasks
vibetasks add "Payment system"
vibetasks add "Subtask 1" --parent xxx
vibetasks add "Subtask 2" --parent xxx
# Too manual, Claude can do this for you
```

## Configuration Reference

### CLI Config (`~/.config/vibetasks/config.json`)

```json
{
  "supabase_url": "https://your-project.supabase.co",
  "supabase_key": "your-anon-key",
  "default_priority": "none",
  "list_limit": 50
}
```

### MCP Config

**Config file location:**
- **macOS/Linux**: `~/.config/claude-code/config.json`
- **Windows**: `%APPDATA%\claude-code\config.json`

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "vibetasks-mcp",
      "env": {
        "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co",
        "TASKFLOW_SUPABASE_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

## Support

- **Issues**: https://github.com/vyassathya/vibetasks/issues
- **Docs**: https://vibetasks.dev/docs

## License

MIT
