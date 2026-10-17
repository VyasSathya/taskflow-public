# VibeTasks MCP Server

Model Context Protocol (MCP) server for VibeTasks integration with Claude Code, Cursor, and other AI coding tools.

## Features

- **11 MCP Tools** for full task management (create, read, update, delete, search, complete, vibing status, context notes, batch create with subtasks, log sessions)
- **Status Workflow**: `todo` -> `vibing` -> `done` - track what you're actively working on
- **Context Notes**: "Where I left off" notes to capture your progress and next steps
- **Project Auto-Detection**: Automatically tags tasks with project name from git repository
- **WIP Limit Awareness**: Warns when you have too many tasks in "vibing" status
- **3 MCP Resources** for context-aware AI (active tasks, today's tasks, upcoming tasks)
- **Claude Code Hooks** for automatic session logging
- **TodoWrite Integration** for automatic task syncing from Claude's todo lists
- **STDIO Transport** for reliable communication
- **Direct Supabase Integration** with Row-Level Security

## Installation

### Prerequisites

- Node.js 18+ installed
- TaskFlow CLI installed and configured (`taskflow login`)
- Claude Code or Cursor installed

### Quick Install

```bash
# Install globally from npm
npm install -g @vibetasks/mcp-server

# Verify installation
vibetasks-mcp --version
```

### Configure Claude Code

Edit your Claude Code config file:
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

**Restart Claude Code** after updating the config.

### Manual Installation (Development)

If you're developing locally instead of using the npm package:

```bash
# From the apps/mcp-server directory
npm install
npm run build
```

Then configure Claude Code with the full path:

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "node",
      "args": ["/absolute/path/to/taskflow/apps/mcp-server/dist/index.js"],
      "env": {
        "TASKFLOW_SUPABASE_URL": "https://your-project.supabase.co",
        "TASKFLOW_SUPABASE_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

### Optional: Session Hooks

For automatic session logging (creates completed tasks when you end AI sessions):

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "vibetasks-mcp",
      "env": {
        "TASKFLOW_SUPABASE_URL": "...",
        "TASKFLOW_SUPABASE_KEY": "..."
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
          "TASKFLOW_SUPABASE_URL": "..."
        }
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "vibetasks-mcp",
        "env": {
          "CLAUDE_HOOK_TYPE": "SessionEnd",
          "TASKFLOW_SUPABASE_URL": "..."
        }
      }
    ]
  }
}
```

## Usage

### MCP Tools

Access tools by typing `@` in Claude Code:

#### create_task
Create a new task:
```
@vibetasks create_task
  title: "Add authentication"
  notes: "Implement OAuth with Supabase"
  priority: "high"
  due_date: "2026-01-15"
  tags: ["backend", "security"]
```

#### create_task_with_subtasks
Create a parent task with subtasks in one call (perfect for TodoWrite integration):
```
@vibetasks create_task_with_subtasks
  title: "Implement user authentication"
  subtasks: ["Create login form", "Add API endpoints", "Implement JWT handling"]
  priority: "high"
  due_date: "2026-01-15"
  tags: ["backend", "auth"]
```

**Use case:** When using Claude's TodoWrite feature, automatically mirror your todo list to VibeTasks for persistent tracking beyond the session.

#### list_tasks
Get tasks with optional status filter:
```
@vibetasks list_tasks status: "todo"
@vibetasks list_tasks status: "vibing"
@vibetasks list_tasks status: "done"
```

Status filters:
- `todo` - Tasks not yet started
- `vibing` - Tasks currently in progress
- `done` - Completed tasks
- (no filter) - All tasks

#### update_task
Update task properties including status:
```
@vibetasks update_task
  task_id: "abc-123..."
  title: "Updated title"
  priority: "medium"
  status: "vibing"
```

#### complete_task
Mark a task as done:
```
@vibetasks complete_task task_id: "abc-123..."
```

#### start_vibing
Mark a task as "vibing" (in progress). This sets the status to `vibing` and optionally adds context notes:
```
@vibetasks start_vibing
  task_id: "abc-123..."
  context_notes: "Working on the login form, need to add validation next"
```

**WIP Limit Awareness**: If you have 3+ tasks already in "vibing" status, the tool will warn you to finish existing work before starting new tasks.

#### get_vibing_tasks
Get all tasks currently in "vibing" (in progress) status:
```
@vibetasks get_vibing_tasks
```

Returns tasks you're actively working on, along with their context notes showing where you left off.

#### set_context_notes
Update the "where I left off" notes for a task:
```
@vibetasks set_context_notes
  task_id: "abc-123..."
  context_notes: "Finished the API, need to wire up the frontend next"
```

Use this to capture your progress before switching tasks or ending a session.

#### delete_task
Delete a task:
```
@vibetasks delete_task task_id: "abc-123..."
```

#### search_tasks
Search by title:
```
@vibetasks search_tasks query: "authentication" limit: 10
```

#### log_ai_session
Manually log a session:
```
@vibetasks log_ai_session
  summary: "Implemented user authentication"
  files: ["auth.ts", "login.tsx"]
  duration_minutes: 45
```

### MCP Resources

Resources provide automatic context to AI:

- `vibetasks://tasks/active` - All incomplete tasks
- `vibetasks://tasks/today` - Tasks due today
- `vibetasks://tasks/upcoming` - Future tasks
- `vibetasks://tasks/vibing` - Tasks currently in progress (with context notes)

The AI can access these without explicit tool calls.

### Status Workflow

VibeTasks uses a simple 3-state workflow:

```
todo -> vibing -> done
```

- **todo**: Task is captured but not started
- **vibing**: You're actively working on this task (WIP)
- **done**: Task is complete

**Why "vibing"?** It's a playful term for "work in progress" that fits the vibe coding culture. When you're vibing on a task, you're in the zone.

### Context Notes ("Where I Left Off")

Each task can have context notes that capture your progress:

```
@vibetasks set_context_notes
  task_id: "abc-123..."
  context_notes: "Finished auth API, need to add frontend form. Check auth.ts for the endpoint structure."
```

Context notes are shown when you:
- Call `get_vibing_tasks` - see where you left off on all active work
- Start a new session - AI sees your current context
- Switch between tasks - never lose your place

### Project Auto-Detection

When you create tasks, VibeTasks automatically detects your current project from git:

```bash
# In a git repo with remote "github.com/user/my-project"
@vibetasks create_task title: "Fix bug"
# Task is auto-tagged with "my-project"
```

This helps filter tasks by project when you have multiple codebases.

### Automatic Session Logging

When Claude Code hooks are configured:

1. **SessionStart**: Loads today's tasks as context
2. **SessionEnd**: Automatically creates a completed task summarizing your work

No manual intervention required!

### TodoWrite Integration

When Claude uses its built-in TodoWrite feature for multi-step tasks, it can automatically sync to TaskFlow:

**How it works:**
1. Claude creates a TodoWrite list for planning (ephemeral, session-only)
2. Claude calls `create_task_with_subtasks` to mirror the list in TaskFlow
3. Each todo becomes a persistent subtask
4. As Claude completes todos, it marks TaskFlow subtasks complete
5. Your tasks survive beyond the session and sync across all platforms

**Example:**
```
User: "Implement user authentication"

Claude creates TodoWrite:
1. Create login form component
2. Add authentication API endpoints
3. Implement JWT token handling
4. Add protected route middleware

Claude also calls create_task_with_subtasks:
{
  title: "Implement user authentication",
  subtasks: [
    "Create login form component",
    "Add authentication API endpoints",
    "Implement JWT token handling",
    "Add protected route middleware"
  ]
}

Result: Session todos + persistent TaskFlow task with subtasks
```

## Development

### Running Locally

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test STDIO communication
echo '{"method":"list_tools"}' | node dist/index.js

# Test SessionStart hook
CLAUDE_HOOK_TYPE=SessionStart node dist/index.js

# Test SessionEnd hook
CLAUDE_HOOK_TYPE=SessionEnd node dist/index.js
```

## Troubleshooting

### Server Not Appearing in Claude Code

1. Check config file location:
   - macOS/Linux: `~/.config/claude-code/config.json`
   - Windows: `%APPDATA%\claude-code\config.json`
2. Verify `vibetasks-mcp` is installed: `vibetasks-mcp --version`
3. Check logs: Restart Claude Code with verbose logging
4. Verify authentication: `vibetasks config`

### Authentication Errors

```bash
# Re-login to VibeTasks
vibetasks login

# Verify tokens are stored
vibetasks config
```

### Hooks Not Working

1. Check hook configuration in `config.json`
2. Verify environment variables are set correctly
3. Test hooks manually:
```bash
CLAUDE_HOOK_TYPE=SessionStart vibetasks-mcp
```

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│   or Cursor     │
└────────┬────────┘
         │ STDIO
         │
┌────────▼────────┐
│  VibeTasks MCP  │
│  - 11 Tools     │
│  - Resources    │
│  - Status Flow  │
│  - Context Notes│
└────────┬────────┘
         │
┌────────▼────────┐
│  @vibetasks/    │
│     core        │
└────────┬────────┘
         │
┌────────▼────────┐
│    Supabase     │
│   PostgreSQL    │
└─────────────────┘
```

## Tool Reference

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task (with optional parent for subtasks) |
| `create_task_with_subtasks` | Create parent + multiple subtasks in one call |
| `list_tasks` | Get tasks with status filter (todo, vibing, done) |
| `update_task` | Update task properties including status |
| `complete_task` | Mark task as done |
| `start_vibing` | Mark task as in progress with optional context |
| `get_vibing_tasks` | Get all tasks currently in progress |
| `set_context_notes` | Update "where I left off" notes |
| `delete_task` | Delete a task |
| `search_tasks` | Search tasks by title |
| `log_ai_session` | Log an AI coding session |

## Contributing

See [main README](../../README.md) for contribution guidelines.

## License

MIT
