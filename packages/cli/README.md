# VibeTasks CLI

> Lightning-fast task management from your terminal. Auto-detects projects, tracks AI vs human tasks, and integrates seamlessly with Claude Code, Cursor, and all AI coding tools.

## ✨ Features

- 🚀 **Auto-Project Detection** - Automatically tags tasks with your current project from git
- 🤖 **AI-Aware** - Tracks whether tasks are created by AI or humans
- ⚡ **Status Flow** - Simple todo → vibing → done workflow
- 🎯 **Energy Levels** - Tag tasks by energy required (low/medium/high)
- 📊 **Rich Filtering** - Filter by project, status, creator, and more
- 🔄 **Real-time Sync** - Syncs with VibeTasks web and mobile apps
- 🔐 **Secure** - Tokens stored in system keychain

## 📦 Installation

```bash
npm install -g @vibetasks/cli
```

## 🚀 Quick Start

```bash
# Login to VibeTasks
vibetasks login

# Initialize project (auto-detects from git)
vibetasks init

# Add a task (auto-tagged with current project!)
vibetasks add "Fix the login bug" --priority high

# List tasks
vibetasks list

# Filter by project
vibetasks list --project myproject

# Update task status
vibetasks update abc123 --status vibing

# Mark complete
vibetasks done abc123
```

## 🤖 AI Integration

VibeTasks CLI is designed to work seamlessly with AI coding assistants.

### How It Works

When you (AI) create tasks via the CLI:

1. **Auto-Project Detection**: CLI detects your current directory and extracts the project name from git
2. **AI Detection**: CLI checks environment variables to detect if running in Claude Code
3. **Auto-Tagging**: Tasks are automatically tagged with the current project
4. **Status Setting**: AI-created tasks start with status "vibing" (actively working on it)

```bash
# AI is working in ~/Projects/vibetasks
vibetasks add "Fix CLI commands stalling"

# What happens automatically:
# ✓ project_tag: "vibetasks" (from git)
# ✓ created_by: "ai" (from CLAUDE_CODE_SESSION)
# ✓ status: "vibing" (AI tasks start vibing)
```

### Multi-Project Workflow

```bash
# Morning: Working on VibeTasks
cd ~/Projects/vibetasks
vibetasks add "Fix login bug"
# → Tagged: "vibetasks"

# Afternoon: Switch to PayTrack
cd ~/Projects/paytrack-app
vibetasks add "Add invoice export"
# → Tagged: "paytrack-app"

# View tasks by project
vibetasks list --project vibetasks
vibetasks list --project paytrack-app
```

## 📖 Commands

### `vibetasks login`
Authenticate with VibeTasks using browser or terminal.

**Options:**
- `--browser` - Browser-based login (recommended)

### `vibetasks init`
Initialize VibeTasks for current project. Auto-detects project name from git.

**Options:**
- `--name <name>` - Manually specify project name

### `vibetasks add <title>`
Create a new task. Auto-tags with current project and detects if created by AI.

**Options:**
- `-n, --notes <notes>` - Task notes (markdown supported)
- `-d, --due <date>` - Due date ("today", "tomorrow", "+3d", "2026-01-15")
- `-p, --priority <level>` - Priority: low, medium, high
- `-e, --energy <level>` - Energy required: low, medium, high
- `--project <name>` - Override auto-detected project
- `-t, --tags <tags...>` - Tags (space-separated)

**Examples:**
```bash
vibetasks add "Fix bug" --priority high --energy high
vibetasks add "Reply to emails" --energy low
vibetasks add "Personal task" --project personal
```

### `vibetasks list [filter]`
List tasks with powerful filtering.

**Filters:** `all`, `today`, `upcoming`, `completed`

**Options:**
- `-l, --limit <number>` - Max tasks to show (default: 50)
- `--project <name>` - Filter by project tag
- `--created-by <source>` - Filter by creator (ai or human)
- `--status <status>` - Filter by status (todo, vibing, done)

**Examples:**
```bash
vibetasks list --project taskflow
vibetasks list --created-by ai
vibetasks list --status vibing
vibetasks list --project taskflow --created-by ai
```

### `vibetasks update <id>`
Update a task's properties.

**Options:**
- `-t, --title <title>` - New title
- `-n, --notes <notes>` - New notes
- `-s, --status <status>` - New status (todo, vibing, done)
- `-p, --priority <level>` - New priority
- `-e, --energy <level>` - New energy level
- `-d, --due <date>` - New due date
- `--project <name>` - New project tag
- `-c, --context <notes>` - Update context notes

**Examples:**
```bash
vibetasks update abc123 --status vibing
vibetasks update abc123 --context "Blocked: waiting for API key"
```

### `vibetasks done <id>`
Mark a task as complete.

### `vibetasks search <query>`
Search tasks by title.

### `vibetasks delete <id>`
Delete a task.

**Options:**
- `-f, --force` - Skip confirmation

### `vibetasks config [key] [value]`
View or set configuration.

## 📊 Status Flow

VibeTasks uses a simple 3-state workflow:

- **📋 todo** - Ready to start when you have energy
- **⚡ vibing** - Currently working on it (limit to 1-3 for best focus)
- **✓ done** - Task completed

## 🎯 Energy Levels

Tag tasks by energy required to match your current state:

- **🔋 low** - Reply to emails, review docs, small fixes
- **⚡ medium** - Regular coding tasks, debugging
- **🔥 high** - Architecture work, complex algorithms

**Example:**
```bash
# Morning (high energy)
vibetasks list --energy high --status todo

# Evening (low energy)
vibetasks list --energy low --status todo
```

## 🎣 Git Hooks

Auto-update tasks from commit messages:

```bash
# Install hook
cd /your/project
vibetasks hooks install

# Link commits to tasks
git commit -m "feat: Add login [TASK-abc123]"

# Auto-complete tasks
git commit -m "feat: Complete auth [TASK-abc123] [COMPLETE]"
```

## 🔧 Development

```bash
git clone https://github.com/vyassathya/vibetasks.git
cd vibetasks/packages/cli
npm install
npm run build
```

## 📝 License

MIT © [Vyas](https://github.com/vyassathya)

## 🔗 Links

- [GitHub Repository](https://github.com/vyassathya/vibetasks)
- [Report Issues](https://github.com/vyassathya/vibetasks/issues)

---

**Made with ❤️ for developers who want simple, powerful task management that works with AI**
