# Auto-Tagging When AI Works

## 🎯 The Concept

**When AI (Claude Code) uses `taskflow add`, it should automatically tag with current project**

---

## 📍 How It Works

### Scenario: AI Is Working on TaskFlow Project

```typescript
// AI is in: ~/projects/taskflow
// AI's process.cwd() = "~/projects/taskflow"

// AI runs command:
await bash('taskflow add "Fix the login bug"');

// What happens automatically:
// 1. CLI detects cwd = taskflow directory
// 2. CLI runs: detectProject(process.cwd())
// 3. Git detection finds: git@github.com:you/taskflow.git
// 4. Extracts project name: "taskflow"
// 5. Task is created with project_tag = "taskflow"

// Result: Task automatically tagged!
{
  title: "Fix the login bug",
  project_tag: "taskflow",  // ← AUTOMATIC!
  created_by: "ai",          // ← Knows AI created it
  status: "vibing"           // ← AI is working on it
}
```

### Scenario: AI Switches to Different Project

```typescript
// AI runs:
await bash('cd ../paytrack-app && taskflow add "Export invoices to PDF"');

// What happens:
// 1. CLI detects NEW cwd = paytrack-app directory
// 2. Git detection finds: git@github.com:you/paytrack-app.git
// 3. Extracts project name: "paytrack-app"
// 4. Task tagged with DIFFERENT project

// Result:
{
  title: "Export invoices to PDF",
  project_tag: "paytrack-app",  // ← Different project!
  created_by: "ai",
  status: "vibing"
}
```

---

## 🔧 CLI Implementation

### Modified `add` command:

```typescript
// packages/cli/src/commands/add.ts

import { detectProject } from '@taskflow/shared/utils/project-detector';

export const addCommand = new Command('add')
  .description('Add a new task')
  .argument('<title>', 'Task title')
  .option('--project <name>', 'Override project detection')
  .action(async (title: string, options: any) => {
    const spinner = ora('Creating task...').start();

    try {
      const authManager = new AuthManager();
      const taskOps = await TaskOperations.fromAuthManager(authManager);

      // AUTO-DETECT PROJECT FROM CURRENT DIRECTORY
      let projectTag: string | undefined;

      if (options.project) {
        // Manual override
        projectTag = options.project;
      } else {
        // AUTO-DETECT (this is the magic!)
        const detected = await detectProject(process.cwd());
        projectTag = detected.name;

        // Show what was detected (only in verbose mode)
        if (process.env.TASKFLOW_VERBOSE) {
          console.log(chalk.gray(`Detected project: ${projectTag} (${detected.source})`));
        }
      }

      // Detect if created by AI or human
      const createdBy = isRunningInClaudeCode() ? 'ai' : 'human';

      // Create task with auto-detected project
      const task = await taskOps.createTask({
        title,
        notes: options.notes,
        project_tag: projectTag,     // ← AUTO-TAGGED!
        created_by: createdBy,        // ← Knows who created it
        status: createdBy === 'ai' ? 'vibing' : 'todo', // ← AI tasks start as "vibing"
        due_date: options.due || parseDate('today'),
        priority: options.priority || 'none',
      });

      spinner.succeed(chalk.green('Task created!'));
      console.log(chalk.gray(`\n📁 Project: ${projectTag}`));
      console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}...`));
      console.log(chalk.white.bold(task.title));

      process.exit(0);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create task'));
      console.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Detect if running inside Claude Code
 */
function isRunningInClaudeCode(): boolean {
  return !!(
    process.env.CLAUDE_CODE_SESSION ||
    process.env.ANTHROPIC_CLI_SESSION ||
    // Check if parent process is Claude Code
    process.env.TERM_PROGRAM?.includes('claude')
  );
}
```

---

## 🤖 What This Means for AI Workflow

### **When I (Claude Code) Use TodoWrite:**

```typescript
// I create a TodoWrite list:
await TodoWrite({
  todos: [
    { content: 'Fix login bug', status: 'in_progress' },
    { content: 'Add dark mode', status: 'pending' },
    { content: 'Update docs', status: 'pending' }
  ]
});

// IMMEDIATELY after, I run:
await bash('taskflow add "Fix login bug" --priority high');
await bash('taskflow add "Add dark mode" --priority medium');
await bash('taskflow add "Update docs" --priority low');

// ALL THREE tasks are automatically tagged with current project!
// If I'm in taskflow directory:
//   → All tagged "taskflow"
// If I'm in paytrack-app directory:
//   → All tagged "paytrack-app"

// I DON'T need to manually specify --project every time!
```

### **Visual Confirmation in CLI:**

```bash
$ taskflow add "Fix login bug"

✓ Task created!

📁 Project: taskflow  ← Shows what was detected
🤖 Created by: AI     ← Shows it was AI
⚡ Status: vibing    ← AI tasks start vibing

ID: abc12345...
Fix login bug
```

---

## 📊 Database Schema Addition

```sql
-- Add created_by field to track AI vs human
ALTER TABLE tasks ADD COLUMN created_by TEXT DEFAULT 'human';
ALTER TABLE tasks ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- Index for querying AI-created tasks
CREATE INDEX idx_tasks_created_by ON tasks(created_by);

-- Example queries:
-- Get all AI-created tasks:
SELECT * FROM tasks WHERE created_by = 'ai';

-- Get AI-created tasks by project:
SELECT * FROM tasks WHERE created_by = 'ai' AND project_tag = 'taskflow';

-- Get human-created tasks:
SELECT * FROM tasks WHERE created_by = 'human';
```

---

## 🎨 UI Indicators

### Task Card Shows Creation Source:

```
┌──────────────────────────────────────┐
│ Fix login bug               [VIBING] │
│                                      │
│ 📁 taskflow                          │
│ 🤖 Created by AI • 2 min ago         │ ← Shows AI created it
│                                      │
│ [👁️ View] [✓ Done]                  │
└──────────────────────────────────────┘
```

### Filter by Creation Source:

```typescript
// Web UI filter
<Select>
  <option value="all">All Tasks</option>
  <option value="ai">AI Created</option>
  <option value="human">Human Created</option>
</Select>

// CLI filter
$ taskflow list --created-by ai
# Shows only AI-created tasks

$ taskflow list --created-by human
# Shows only human-created tasks
```

---

## 🔄 Multi-Project Workflow Example

### Real-World Scenario:

```bash
# Morning: Working on TaskFlow
cd ~/Projects/taskflow

# I (AI) create tasks while working
taskflow add "Fix CLI commands stalling"
# → Auto-tagged: taskflow ✓

taskflow add "Add subtasks UI to web"
# → Auto-tagged: taskflow ✓

# Afternoon: Switch to PayTrack
cd ~/Projects/paytrack-app

# I create tasks in new project
taskflow add "Add invoice PDF export"
# → Auto-tagged: paytrack-app ✓

taskflow add "Fix dashboard charts"
# → Auto-tagged: paytrack-app ✓

# Evening: List tasks by project
taskflow list --project taskflow
# Shows only: "Fix CLI commands...", "Add subtasks UI..."

taskflow list --project paytrack-app
# Shows only: "Add invoice PDF...", "Fix dashboard charts..."

# See all tasks I created today
taskflow list --created-by ai --filter today
# Shows all 4 tasks, grouped by project
```

---

## 💡 Smart Project Switching

### CLI Knows When You Switch:

```typescript
// packages/cli/src/utils/project-context.ts

export class ProjectContext {
  private lastProject: string | null = null;

  async detectProjectChange(): Promise<boolean> {
    const current = await detectProject(process.cwd());

    if (this.lastProject && this.lastProject !== current.name) {
      // Project switched!
      console.log(chalk.yellow(`\n📁 Switched to project: ${current.name}\n`));
      this.lastProject = current.name;
      return true;
    }

    this.lastProject = current.name;
    return false;
  }
}

// Usage in commands:
const context = new ProjectContext();
if (await context.detectProjectChange()) {
  // Show tasks for NEW project
  const tasks = await taskOps.getTasks({ project_tag: context.lastProject });
  console.log(chalk.blue(`You have ${tasks.length} tasks in ${context.lastProject}`));
}
```

---

## 🎯 Benefits

### 1. **Zero Friction**
   - AI doesn't need to remember to add `--project`
   - Works automatically based on directory

### 2. **Always Accurate**
   - Project tag matches git repo
   - Can't forget or mistype project name

### 3. **Context Aware**
   - AI knows where it's working
   - Tasks grouped by actual project

### 4. **Transparent**
   - Shows `created_by: ai` vs `human`
   - Can filter AI-created vs human-created tasks

### 5. **Multi-Project Native**
   - Switch directories = switch projects
   - CLI handles it automatically

---

## 🚀 Implementation Checklist

- [ ] Add `detectProject()` to CLI add command
- [ ] Add `created_by` field to database
- [ ] Detect if running in Claude Code (env vars)
- [ ] Auto-set status to "vibing" for AI tasks
- [ ] Show project detection in verbose mode
- [ ] Add `--created-by` filter to list command
- [ ] Add UI indicator for AI-created tasks
- [ ] Add project switching notifications

---

## 📝 Example: Full AI Workflow

```bash
# I (Claude Code) am working on taskflow
cd ~/projects/taskflow

# I create a TodoWrite list:
# 1. Fix CLI stalling
# 2. Add subtasks UI
# 3. Update docs

# I immediately create TaskFlow tasks:
taskflow add "Fix CLI commands stalling" --priority high
# → project_tag: "taskflow" ✓
# → created_by: "ai" ✓
# → status: "vibing" ✓

taskflow add "Add subtasks UI to web" --priority high
# → project_tag: "taskflow" ✓
# → created_by: "ai" ✓
# → status: "vibing" ✓

taskflow add "Update CLAUDE.md docs" --priority low
# → project_tag: "taskflow" ✓
# → created_by: "ai" ✓
# → status: "vibing" ✓

# I work on task 1, complete it:
taskflow done "Fix CLI commands stalling"
# → Updates status to "done"
# → Records done_at timestamp

# User checks their tasks:
$ taskflow list --project taskflow

TaskFlow Tasks (3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] Fix CLI commands stalling
    🤖 Created by AI • Completed 5 min ago

[⚡] Add subtasks UI to web
    🤖 Created by AI • In progress

[📋] Update CLAUDE.md docs
    🤖 Created by AI • Todo

# User can see:
# - What project (taskflow)
# - Who created (AI)
# - Current status (done/vibing/todo)
```

---

**TL;DR:**
- ✅ CLI gets current directory (`process.cwd()`)
- ✅ CLI detects project from git (`detectProject()`)
- ✅ Tasks automatically tagged with project
- ✅ AI tasks marked `created_by: "ai"`
- ✅ AI tasks start as `status: "vibing"`
- ✅ Zero manual work, 100% automatic
