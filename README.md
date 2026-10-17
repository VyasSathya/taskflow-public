# VibeTasks (TaskFlow)

Task manager for developers who work with AI coding agents: CLI, MCP server for Claude Code, Next.js web app, Expo mobile app, VS Code and browser extensions, all on Supabase. Early version from January 2026; this repo is a snapshot and is not the live product.

> No longer maintained. Published as-is under the MIT license.

All Supabase URLs and keys have been removed. The CLI, MCP server and scripts read `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the environment (see `.env.example`); point them at your own Supabase project with the migrations in `supabase/` applied. The browser extension takes them in `apps/browser-extension/src/config.js`.

**VibeTasks** - Task management for developers who vibe with AI. Cross-platform app with mobile (React Native/Expo), web (Next.js), CLI, and Claude Code integration.

## Quick Setup (2 minutes)

```bash
npm install -g @vibetasks/cli
vibetasks setup
```

The setup wizard handles everything:
1. Authenticates you via browser
2. Configures Claude Code integration (MCP server)
3. Initializes your current project
4. Verifies everything works

## 📁 Repository Structure

```
taskflow/
├── apps/
│   ├── mobile/          # React Native (Expo 54) mobile app
│   ├── web/             # Next.js 15 web app
│   └── mcp-server/      # Claude Code MCP server
├── packages/
│   ├── cli/             # VibeTasks CLI
│   ├── mcp-core/        # MCP server core library
│   └── shared/          # Shared types and services
├── supabase/
│   └── migrations/      # Database migrations
└── package.json         # Root workspace config
```

## 🚀 Quick Start

### Prerequisites
- Node.js >=22.0.0
- npm or pnpm
- Expo CLI (for mobile)
- Supabase account

### Installation

```bash
# Install all dependencies
npm install

# Run web app
npm run dev:web

# Run mobile app
npm run dev:mobile
```

## 📱 Mobile App (`apps/mobile/`)

- **Framework**: Expo 54 + React Native
- **Router**: Expo Router 6 (file-based routing)
- **State**: Zustand + TanStack Query
- **UI**: Custom components + Reanimated 3
- **Features**:
  - 4-tab navigation (All, Today, Upcoming, More)
  - TaskQuickAdd with NLP parsing (#tags, @priority, dates)
  - Swipe gestures (right = complete, left = delete)
  - Inline task expansion
  - Subtasks, tags, attachments
  - Offline support with queue
  - Realtime sync

**Run mobile:**
```bash
cd apps/mobile
npm start
```

## 💻 Web App (`apps/web/`)

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **UI**: shadcn/ui components
- **Features**:
  - Sidebar navigation
  - TipTap rich text editor
  - Inline task expansion
  - Subtasks, tags, attachments
  - Real-time updates
  - Responsive design

**Run web:**
```bash
cd apps/web
npm run dev
```

## CLI v0.2.0 (`packages/cli/`)

Terminal-based task management for developers.

**Commands:**
```bash
vibetasks setup              # Interactive setup wizard (start here!)
vibetasks add "Task title"   # Create a task
vibetasks list               # List all tasks
vibetasks vibing <id>        # Start vibing on a task (aliases: start, v)
vibetasks vibing --pick      # Interactive task picker
vibetasks done <id>          # Mark task complete
vibetasks search "query"     # Search tasks
```

**Status Flow:**
```
todo → vibing → done
```

**Key Features:**
- **Setup Wizard** - One command configures auth, Claude Code, and project
- **WIP Limit Warning** - Alerts when >3 tasks are vibing (stay focused!)
- **Interactive Picker** - `vibetasks vibing --pick` to choose from list
- **Project Auto-tagging** - Tasks tagged with current git project
- **Claude Code Integration** - AI sees your tasks automatically

## Claude Code Integration (`apps/mcp-server/`)

MCP server provides 11 AI tools for task management with status workflow and context notes.

**Key Features:**
- **Status Workflow**: `todo` -> `vibing` -> `done` status tracking
- **Context Notes**: "Where I left off" notes for seamless task switching
- **Project Auto-Detection**: Tasks auto-tagged from git repository
- **WIP Limit Awareness**: Warns when too many tasks in "vibing" status

**Available Tools:**
- `create_task` / `create_task_with_subtasks` - Create tasks
- `list_tasks` - Get tasks (filter by status: todo, vibing, done)
- `update_task` - Update task properties including status
- `complete_task` - Mark task as done
- `start_vibing` - Mark task in progress with context notes
- `get_vibing_tasks` - Get tasks currently being worked on
- `set_context_notes` - Update "where I left off" notes
- `search_tasks` - Search by title
- `delete_task` - Remove a task
- `log_ai_session` - Log AI coding session

**Claude Code Config:**

Config file location:
- macOS/Linux: `~/.config/claude-code/config.json`
- Windows: `%APPDATA%\claude-code\config.json`

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

**In Claude Code:**
```
"Create a task to fix the login bug"
"Show my tasks for today"
"What should I work on next?"
"Start vibing on the auth task"
"Save my progress - I finished the API, need to add tests"
```

## 📦 Shared Package (`packages/shared/`)

Contains code shared between mobile and web:

- **Types**: Task, Tag, Attachment, TaskFilter
- **Services**: createTaskService (Supabase CRUD operations)

**Usage:**
```typescript
import { createTaskService } from '@taskflow/shared/services';
import type { Task, Tag } from '@taskflow/shared';

const taskService = createTaskService(supabaseClient);
const tasks = await taskService.getTasks('all');
```

## 🗄️ Database (Supabase)

**Schema:**
- `tasks` - Main tasks table with RLS
- `tags` - Tags for categorization
- `task_tags` - Junction table
- `task_attachments` - File attachments
- Storage bucket: `task-attachments`

**Run migrations:**
```bash
cd supabase
npx supabase@latest db push
```

## 🛠️ Development

### Workspace Commands

```bash
# Run web dev server
npm run dev:web

# Run mobile dev server
npm run dev:mobile

# Type check all packages
npm run typecheck

# Build web app
npm run build:web

# Clean all node_modules
npm run clean
```

### Adding Dependencies

```bash
# Add to web app
npm install <package> --workspace=apps/web

# Add to mobile app
npm install <package> --workspace=apps/mobile

# Add to shared package
npm install <package> --workspace=packages/shared
```

## 📝 Features

### Core Task Management
- ✅ Create, read, update, delete tasks
- ✅ Complete/uncomplete tasks
- ✅ Subtasks with progress tracking
- ✅ Tags with colors
- ✅ File attachments
- ✅ Due dates and priorities
- ✅ Rich text notes (HTML)

### Mobile-Specific
- ✅ NLP parsing (e.g., "Buy milk #groceries @high tomorrow at 2pm")
- ✅ Swipe gestures for quick actions
- ✅ Offline queue with sync
- ✅ Haptic feedback
- ✅ 4 clean tabs (no truncation)

### Web-Specific
- ✅ TipTap rich text editor (bold, italic, lists, headings)
- ✅ Keyboard shortcuts
- ✅ Sidebar navigation
- ✅ Responsive design

### Shared
- ✅ Supabase real-time sync
- ✅ Row-level security (RLS)
- ✅ Optimistic updates
- ✅ TanStack Query caching

## 🔐 Environment Variables

### Web (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Mobile (`.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚢 Deployment

### Web (Vercel)
```bash
cd apps/web
npm run build
vercel --prod
```

### Mobile (EAS)
```bash
cd apps/mobile
npm run build:ios      # Build iOS
npm run build:android  # Build Android
```

## 📄 License

MIT

## 🤝 Contributing

1. Install dependencies: `npm install`
2. Make changes
3. Type check: `npm run typecheck`
4. Test on both platforms
5. Commit changes

---

**Built with:** React Native, Next.js, Supabase, TypeScript, Tailwind CSS, shadcn/ui
