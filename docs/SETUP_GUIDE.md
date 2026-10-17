# VibeTasks Setup Guide (v0.2.0)

Complete setup guide for VibeTasks CLI + MCP Server integration.

## Quick Setup (Recommended)

```bash
npm install -g @vibetasks/cli
vibetasks setup
```

The setup wizard handles everything automatically. Skip to the "Verification" section below.

---

## Project Identity
| Property | Value |
|----------|-------|
| **CLI Package** | `@vibetasks/cli` |
| **CLI Version** | `0.2.0` |
| **MCP Server** | `@vibetasks/mcp-server` |
| **Supabase URL** | `https://your-project-ref.supabase.co` |
| **Config Location** | `~/.config/vibetasks/` |
| **Project Path** | `~/projects/taskflow` |

---

## CLI Commands Reference

| Command | Aliases | Description |
|---------|---------|-------------|
| `vibetasks setup` | - | Interactive setup wizard |
| `vibetasks add "task"` | - | Add a new task |
| `vibetasks list` | - | View all tasks |
| `vibetasks vibing <id>` | `start`, `v` | Start vibing on a task |
| `vibetasks vibing --pick` | - | Interactive task picker |
| `vibetasks done <id>` | - | Mark task complete |
| `vibetasks search "query"` | - | Search tasks |

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

---

## Manual Installation (Alternative)

If you prefer step-by-step setup instead of the wizard:

### 1. Install CLI Globally

```bash
npm install -g @vibetasks/cli
vibetasks --version  # Should show 0.2.0
```

---

### 2. Authenticate via Browser

```bash
vibetasks login --browser
```

This opens your browser for one-click authentication. If already logged into VibeTasks web, it's instant.

---

## MCP Server (Claude Code Integration)

The setup wizard (`vibetasks setup`) configures this automatically. For manual setup:

### Configure Claude Code

Add to `~/.config/claude-code/config.json`:

```json
{
  "mcpServers": {
    "vibetasks": {
      "command": "vibetasks-mcp"
    }
  }
}
```

Then restart Claude Code.

### Available MCP Tools

After setup, Claude Code can use:
- `create_task` - Create a new task
- `get_tasks` - Get tasks (filter: all, today, upcoming, completed)
- `complete_task` - Mark task done
- `search_tasks` - Search by title

---

## Git Hooks (Optional)

Auto-update tasks from commit messages.

```bash
vibetasks install
```

Commit patterns:
- `feat: Add login [TASK-abc123]` - Links commit to task
- `fix: Bug fix [TASK-abc123] [COMPLETE]` - Auto-completes task

---

## Verification

After setup, test these commands:

```bash
# CLI workflow
vibetasks list                    # View tasks
vibetasks add "Test task"         # Create a task
vibetasks vibing --pick           # Pick a task to work on
vibetasks done <id>               # Mark complete

# Status check
vibetasks list                    # See status flow in action
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

### MCP not appearing
1. Verify config: `cat ~/.config/claude-code/config.json`
2. Restart Claude Code completely
3. Check logs: `~/.claude/logs/`

---

## Quick Reference

### CLI Commands
```bash
# Setup (start here!)
npm install -g @vibetasks/cli
vibetasks setup

# Core workflow
vibetasks add "Task title"        # Create task
vibetasks list                    # View all tasks
vibetasks vibing <id>             # Start vibing (or: start, v)
vibetasks vibing --pick           # Interactive picker
vibetasks done <id>               # Mark complete
vibetasks search "query"          # Search tasks

# Login (if needed)
vibetasks login --browser
```

### Status Flow
```
todo → vibing → done
```

### WIP Limit
Warning when >3 tasks are vibing. Stay focused!

### Git Commit Patterns
```bash
git commit -m "feat: Description [TASK-abc123]"
git commit -m "fix: Complete [TASK-abc123] [COMPLETE]"
```

---

## Support & Resources

- **CLI Setup**: [CLI_SETUP.md](../CLI_SETUP.md)
- **MCP Guide**: [TASKFLOW_MCP_GUIDE.md](./TASKFLOW_MCP_GUIDE.md)

---

Once setup is complete, you'll have:
- Fast CLI task management with status flow
- AI integration with Claude Code
- WIP limits to stay focused
- Cross-platform sync (CLI / Web / Mobile)
