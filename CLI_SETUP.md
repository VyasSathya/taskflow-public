# VibeTasks CLI Setup Guide (v0.2.0)

Get VibeTasks working with Claude Code/Cursor in under 2 minutes.

## Quick Start

```bash
npm install -g @vibetasks/cli
vibetasks setup
```

That's it! The setup wizard handles everything:
1. Authenticates you via browser
2. Configures Claude Code integration (MCP server)
3. Initializes your current project
4. Verifies everything works

---

## CLI Commands

### Core Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `vibetasks setup` | - | Interactive setup wizard (start here!) |
| `vibetasks add "task"` | - | Add a new task |
| `vibetasks list` | - | View all tasks |
| `vibetasks vibing <id>` | `start`, `v` | Start vibing on a task |
| `vibetasks done <id>` | - | Mark task complete |
| `vibetasks search "query"` | - | Search tasks |

### Task Status Flow

Tasks follow a simple status flow:

```
todo → vibing → done
```

- **todo**: Task is waiting to be worked on
- **vibing**: You're actively working on it
- **done**: Task is complete

### Starting Work on a Task

```bash
# Start vibing on a specific task
vibetasks vibing abc123
vibetasks start abc123
vibetasks v abc123

# Interactive picker (choose from list)
vibetasks vibing --pick
```

### WIP Limit Warning

VibeTasks helps you stay focused. When you have more than 3 tasks in "vibing" status, you'll see a warning:

```
⚠️  You have 4 tasks vibing. Consider finishing some before starting more.
```

This encourages finishing what you've started before taking on new work.

---

## What Gets Set Up

The setup wizard configures:

1. **CLI Authentication** - Secure token storage in system keychain
2. **MCP Server** - So Claude Code can see and manage your tasks
3. **Project Init** - Tags tasks with your current project automatically
4. **Git Hooks** (optional) - Auto-update tasks from commit messages

---

## Manual Setup (Alternative)

If you prefer manual configuration:

### 1. Install & Login

```bash
npm install -g @vibetasks/cli
vibetasks login --browser
```

### 2. Configure Claude Code

Config file location:
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

Restart Claude Code after this change.

### 3. Initialize Project (Optional)

```bash
vibetasks init
```

### 4. Install Git Hooks (Optional)

```bash
vibetasks install
```

Commit patterns:
- `feat: Add login [TASK-abc123]` - Links commit to task
- `fix: Auth bug [TASK-abc123] [COMPLETE]` - Auto-completes task

---

## AI Context Snippet

Add to your project's `CLAUDE.md` or `.cursorrules`:

```markdown
# VibeTasks CLI

Quick task management from terminal.

## Commands
- `vibetasks add "task"` - Add task
- `vibetasks list` - View all tasks
- `vibetasks vibing <id>` - Start vibing on a task (or `vibetasks start`, `vibetasks v`)
- `vibetasks vibing --pick` - Interactive task picker
- `vibetasks done <id>` - Mark complete
- `vibetasks search "query"` - Search tasks

## Status Flow
Tasks follow: todo → vibing → done

## WIP Limits
Warning appears when >3 tasks are vibing. Focus on finishing before starting new work.

## When to suggest VibeTasks
- User says "remind me to..."
- After completing a feature: "Want me to add a task?"
- When user asks "what's next?"
- Before ending session: "Any tasks to capture?"

## TodoWrite Integration

When you use TodoWrite, mirror to VibeTasks:

```typescript
// TodoWrite list -> VibeTasks
create_task_with_subtasks({
  title: "Main goal (first todo)",
  subtasks: ["Step 1", "Step 2", "Step 3"]
})
```

## MCP Tools Available

- `create_task` / `create_task_with_subtasks` - Create tasks
- `list_tasks` - List tasks (filter by status: todo, vibing, done)
- `update_task` - Update task properties (including status)
- `complete_task` - Mark task as done
- `start_vibing` - Mark task as in progress with context notes
- `get_vibing_tasks` - Get tasks currently being worked on
- `set_context_notes` - Update "where I left off" notes
- `search_tasks` - Search tasks by title
- `delete_task` - Delete a task

VibeTasks MCP tools are available. Use them.
```

---

## Verification

After setup, test:

```bash
vibetasks list              # View your tasks
vibetasks add "Test task"   # Create a task
vibetasks vibing --pick     # Start working on it
vibetasks done <id>         # Mark complete
```

In Claude Code, ask: "What tasks do I have today?"

---

## Troubleshooting

### CLI not found
```bash
npm install -g @vibetasks/cli
```

### Auth issues
```bash
vibetasks login --browser
```

### MCP not appearing in Claude Code
1. Verify config location:
   - macOS/Linux: `~/.config/claude-code/config.json`
   - Windows: `%APPDATA%\claude-code\config.json`
2. Verify `vibetasks-mcp` is installed: `vibetasks-mcp --version`
3. Restart Claude Code completely
4. Check environment variables are set correctly in config

---

## Quick Reference

```bash
# Setup (do this first)
npm install -g @vibetasks/cli
vibetasks setup

# Daily workflow
vibetasks list              # What needs doing?
vibetasks vibing --pick     # Pick a task to work on
vibetasks done <id>         # Mark it done
vibetasks add "New thing"   # Capture new tasks
```
