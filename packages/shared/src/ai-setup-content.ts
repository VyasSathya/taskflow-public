/**
 * AI Setup Content
 * Single source of truth for AI setup instructions
 * Used by: web settings, web onboarding, mobile settings, mobile onboarding
 */

export const AI_SETUP_CONTENT = {
  // Step 1: Install & Login
  installPrompt: `Install and configure VibeTasks for me:

1. Run: npm install -g @vibetasks/cli @vibetasks/mcp-server
2. Run: vibetasks login
3. Add to ~/.claude.json under mcpServers:
   "vibetasks": { "command": "vibetasks-mcp" }`,

  // Step 2: CLAUDE.md content
  claudeMdPrompt: `Add this to my project's CLAUDE.md file:

## VibeTasks Integration (REQUIRED)

### Status Flow
| Status | When to Use |
|--------|-------------|
| **todo** | Planning - task identified but NOT started |
| **vibing** | Actively working - currently writing code |
| **done** | Completed - work finished and verified |

### Workflow
1. **Create task** (status = todo by default):
\`\`\`bash
vibetasks add "Task Title" --subtasks "Step 1" "Step 2" "Step 3"
\`\`\`

2. **Start working** - set to vibing:
\`\`\`bash
vibetasks vibing TASK_ID
\`\`\`

3. **Mark subtasks done** as you complete them:
\`\`\`bash
vibetasks subtask done TASK_ID 1 2 3
\`\`\`

4. **Finish task** (with optional completion notes):
\`\`\`bash
vibetasks done TASK_ID --notes "What was completed"
\`\`\`

### Rules
- Only ONE task should be vibing at a time (focus!)
- Create matching TodoWrite items for each subtask
- Update context_notes before stopping if incomplete

### Available Tags
backend, frontend, ai, ui, ux, api, db, devops, testing, docs

### Why: TodoWrite resets each session - VibeTasks persists forever.`,

  // Benefits list
  benefits: [
    'Uses VibeTasks instead of built-in todos (persists across sessions)',
    'Tracks subtasks with progress notes (crash recovery built-in)',
    'Views images you attach to tasks (mockups, errors, screenshots)',
    'Knows where you left off with context_notes',
  ],

  // New project setup info
  newProjectInfo: `For each new project, add the VibeTasks section to that project's CLAUDE.md file. The CLI install is global (one-time), but each project needs its own CLAUDE.md instructions so the AI knows to use VibeTasks.`,

  // Example commands
  exampleCommands: [
    { title: 'Create tasks with subtasks', example: '"Add task to fix auth with 3 subtasks"' },
    { title: 'Update progress', example: '"Mark subtask 1 done, add note about edge case"' },
    { title: 'View attached images', example: '"Show me the mockup for task 5"' },
    { title: 'Resume where you left off', example: '"What was I working on?"' },
  ],

  // Status descriptions for the flow diagram
  statuses: {
    todo: { label: 'todo', description: 'Planning phase' },
    vibing: { label: 'vibing', description: 'Actively working' },
    done: { label: 'done', description: 'Completed' },
  },

  // Keyboard shortcuts
  keyboardShortcuts: [
    { label: 'Cmd Palette', key: '⌘K' },
    { label: 'New Task', key: 'N' },
    { label: 'Search', key: '/' },
    { label: 'Help', key: '?' },
  ],
} as const;

export type AISetupContent = typeof AI_SETUP_CONTENT;
