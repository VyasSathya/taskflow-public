# AI Context Template for VibeTasks

> **Copy this template to your project root as `CLAUDE.md` or `.cursorrules` to enable AI-assisted task management with VibeTasks.**

---

## VibeTasks Integration

This project uses **VibeTasks** for AI-integrated task management. VibeTasks syncs with Claude Code, Cursor, and other AI coding tools through MCP (Model Context Protocol).

### Status-Based Workflow

Tasks follow a simple 3-state flow:

```
todo --> vibing --> done
```

| Status | Meaning | CLI Command |
|--------|---------|-------------|
| `todo` | Ready to start | (default) |
| `vibing` | Currently working on | `vibetasks vibing <id>` or `vibetasks start` |
| `done` | Completed | `vibetasks done <id>` |

**Key principle:** Only work on what you're actively vibing on. Everything else stays in todo.

---

## WIP Limit Awareness

**IMPORTANT:** Maximum 3 tasks should be in `vibing` status at any time.

Research shows:
- 3+ concurrent tasks = 40% productivity loss
- Context switching costs 9-23 minutes to recover focus
- 1-3 tasks in progress is the sweet spot for flow state

**AI behavior:**
- Before starting a new task, check current vibing count with `get_vibing_tasks()`
- If user has 3+ tasks vibing, suggest focusing on completing one before starting another
- Warn user: "You have X tasks in progress. Consider completing one before starting new work."

---

## Context Notes Usage

When pausing work on a task, always update the context notes to capture:
- Where you left off (file, line number, function)
- Current blockers or decisions pending
- Next immediate step when resuming

**Use the MCP tool:**
```
set_context_notes(task_id, notes)
```

**Example context notes:**
- "Working on src/auth/login.ts line 142, need to add error handling for OAuth callback"
- "Blocked: deciding between JWT refresh tokens vs session cookies"
- "Next: add unit tests for the validateUser function"

This saves 30+ minutes of context recovery when resuming work.

---

## Available MCP Tools

When working with Claude Code or other MCP-enabled AI tools, these VibeTasks tools are available:

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_task` | Create a new task | `title` (required), `subtasks` (optional array) |
| `list_tasks` | List tasks with optional filter | `status` (optional: `todo`, `vibing`, `done`) |
| `start_vibing` | Move task to vibing status | `task_id` (required) |
| `complete_task` | Mark task as done | `task_id` (required) |
| `set_context_notes` | Update progress/context notes | `task_id`, `notes` (both required) |
| `get_vibing_tasks` | Get all tasks currently in progress | (no parameters) |

### Tool Usage Examples

**Creating a task with subtasks:**
```
create_task(
  title: "Implement user authentication",
  subtasks: [
    "Set up OAuth provider",
    "Create login component",
    "Add session management",
    "Write tests"
  ]
)
```

**Starting work on a task:**
```
start_vibing(task_id: "abc123")
```

**Updating context before pausing:**
```
set_context_notes(
  task_id: "abc123",
  notes: "Completed OAuth setup. Next: create login component in src/components/auth/"
)
```

**Completing a task:**
```
complete_task(task_id: "abc123")
```

---

## When to Suggest VibeTasks

As an AI assistant, proactively suggest VibeTasks in these situations:

### 1. User says "remind me to..."
> User: "Remind me to update the dependencies later"
>
> AI: *Creates task via `create_task(title: "Update dependencies")`*
> "I've added 'Update dependencies' to your VibeTasks. You can start it anytime with `vibetasks vibing <id>`."

### 2. After completing a feature
> AI: "We've finished implementing the login feature. Should I mark this task as done in VibeTasks and capture any follow-up tasks?"

### 3. When user asks "what's next?"
> User: "What should I work on next?"
>
> AI: *Calls `list_tasks(status: "todo")`*
> "Here are your pending tasks: [list]. Based on priority, I'd suggest starting with..."

### 4. Before ending a session
> AI: "Before we wrap up, let me update your context notes so you can pick up right where we left off."
> *Calls `set_context_notes()` with current progress*

### 5. When user has too many things in progress
> AI: *Checks `get_vibing_tasks()` and sees 4+ tasks*
> "I notice you have 4 tasks currently in progress. Research shows this significantly impacts focus. Would you like to complete or pause some of these before starting new work?"

---

## TodoWrite to VibeTasks Sync

When Claude uses the internal TodoWrite tool for multi-step tasks, sync to VibeTasks:

**Pattern:**
1. First todo item = parent task in VibeTasks
2. Remaining todo items = subtasks in VibeTasks
3. Mirror to VibeTasks immediately using `create_task()`

**Example:**

When TodoWrite creates:
```
1. Implement authentication system
2. Set up OAuth provider
3. Create login component
4. Add session management
5. Write tests
```

AI should call:
```
create_task(
  title: "Implement authentication system",
  subtasks: [
    "Set up OAuth provider",
    "Create login component",
    "Add session management",
    "Write tests"
  ]
)
```

**Why sync?**
- TodoWrite is ephemeral (session-only)
- VibeTasks persists across sessions
- VibeTasks syncs to mobile/web/CLI
- Progress is trackable long-term

---

## CLI Quick Reference

For terminal-based task management:

```bash
# List tasks
vibetasks list              # All tasks
vibetasks list todo         # Only todo
vibetasks list vibing       # Only in-progress
vibetasks list done         # Only completed

# Create task
vibetasks add "Task title"
vibetasks add "Task title" --subtasks "Sub 1" "Sub 2" "Sub 3"

# Change status
vibetasks vibing <id>       # Start working on task
vibetasks start             # Interactive: pick a task to start
vibetasks done <id>         # Complete task

# Update context
vibetasks context <id> "Where I left off..."

# Check WIP
vibetasks wip               # Show vibing tasks count
```

---

## Project-Specific Context

<!-- Add your project-specific information below -->

### Project Name
[Your project name]

### Key Files
| Area | Files |
|------|-------|
| Entry point | `src/index.ts` |
| Components | `src/components/` |
| Services | `src/services/` |

### Commands
| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Test | `npm test` |

### Current Focus
<!-- Update this section as your focus changes -->
- [ ] Current major feature or goal
- [ ] Key blockers or decisions pending

---

## Best Practices

### 1. One task vibing at a time (ideally)
Start a task, complete it, then start the next. Batch similar tasks together.

### 2. Always update context notes before switching
Even a one-line note saves significant context recovery time.

### 3. Use subtasks for complex work
Break down anything taking more than 30 minutes into subtasks.

### 4. Let AI handle the task management
Don't manually track in your head - create tasks and let the system work.

### 5. Review vibing tasks at session start
Ask: "What am I currently working on?" to resume with context.

---

## Integration Notes

### Claude Code
VibeTasks MCP tools are automatically available. Use `@vibetasks` to access tools.

### Cursor
Add VibeTasks to your `.cursorrules` file for automatic integration.

### Windsurf
Configure MCP server in Windsurf settings to enable VibeTasks tools.

### Git Integration
Commits can auto-complete tasks:
```bash
git commit -m "feat: Add login page [TASK-abc123] [COMPLETE]"
```

---

## Support

- **CLI Issues:** `vibetasks --help`
- **MCP Issues:** Check server logs in `~/.config/vibetasks/logs/`
- **Sync Issues:** `vibetasks sync --force`
