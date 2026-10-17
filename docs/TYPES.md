# VibeTasks Shared Types

This document describes the shared type system used across all VibeTasks platforms.

## Overview

The `@vibetasks/shared` package provides consistent type definitions for:
- **Web App** (Next.js)
- **Mobile App** (React Native/Expo)
- **CLI** (`@vibetasks/cli`)
- **MCP Server** (`@vibetasks/mcp-server`)
- **MCP Core** (`@vibetasks/mcp-core`)

## Installation

```bash
# In a workspace package
pnpm add @vibetasks/shared

# Or reference via workspace
"dependencies": {
  "@vibetasks/shared": "*"
}
```

## Usage

### Importing Types

```typescript
// Import everything
import * as VibeTasks from '@vibetasks/shared';

// Import specific types
import type {
  Task,
  Tag,
  TaskStatus,
  TaskPriority,
  TaskSourceType,
  InlineSubtask,
  // Integration types
  GitHubIntegration,
  SlackIntegration,
  SentryIntegration,
  EmailIntegration,
} from '@vibetasks/shared';

// Import constants
import { WIP_LIMIT, AUTO_ARCHIVE_HOURS, PRIORITIES, STATUSES } from '@vibetasks/shared';
```

### In Web App

```typescript
// apps/web/src/lib/types.ts
export type { Task, Tag, TaskStatus } from '@vibetasks/shared';
export { WIP_LIMIT } from '@vibetasks/shared';
```

### In Mobile App

```typescript
// The mobile app uses the shared package via @vibetasks/shared dependency
import { createTaskService } from '@vibetasks/shared';
import type { Task, Tag } from '@vibetasks/shared';
```

### In MCP Core

```typescript
// packages/mcp-core uses compatible types
// Types are defined locally but match @vibetasks/shared exactly
import type { Task, TaskStatus, TaskPriority } from './task-operations';
```

## Core Types

### Task

The main entity in VibeTasks:

```typescript
interface Task {
  // Required fields
  id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  notes_format: NotesFormat;
  status: TaskStatus;
  completed: boolean;
  priority: TaskPriority;

  // Optional content
  description?: string;
  notes?: string;
  context_notes?: string;

  // Optional scheduling
  due_date?: string;
  completed_at?: string;
  archived_at?: string;

  // VibeTasks features
  project_tag?: string;
  created_by?: TaskCreator;
  energy_required?: EnergyLevel;
  source_type?: TaskSourceType;

  // Integration fields (populated based on source)
  github_issue_id?: number;
  github_repo?: string;
  email_from?: string;
  slack_channel?: string;
  sentry_issue_id?: string;
  // ... and more

  // Relations
  tags?: Tag[];
  attachments?: Attachment[];
  subtasks_json?: InlineSubtask[];
}
```

### TaskStatus

```typescript
type TaskStatus = 'todo' | 'vibing' | 'done' | 'archived';
```

Status flow: `todo` → `vibing` → `done` → `archived`

### TaskPriority

```typescript
type TaskPriority = 'none' | 'low' | 'medium' | 'high';
```

### TaskSourceType

Tracks where a task originated:

```typescript
type TaskSourceType =
  | 'manual'            // Created in VibeTasks UI
  | 'github_bug'        // GitHub issue (bug)
  | 'github_feedback'   // GitHub issue (feature request)
  | 'email_bug'         // Email (bug report)
  | 'email_feedback'    // Email (feedback)
  | 'slack_bug'         // Slack message (bug)
  | 'slack_feedback'    // Slack message (feedback)
  | 'sentry_error'      // Sentry error
  | 'browser_extension' // Browser extension
  | 'vscode_extension'  // VS Code extension
  | 'cli'               // CLI command
  | 'mcp'               // MCP server
  | 'github_action';    // GitHub Action
```

### InlineSubtask

Subtasks stored as JSON in the task:

```typescript
interface InlineSubtask {
  id: string;
  title: string;
  done: boolean;
  notes?: string;
}
```

### Tag

```typescript
interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}
```

## Integration Types

### GitHubIntegration

```typescript
interface GitHubIntegration extends BaseIntegration {
  github_secret: string | null;
  enabled_events: string;
  default_priority: TaskPriority;
  default_project_tag: string | null;
  auto_close_on_resolve: boolean;
}
```

### EmailIntegration

```typescript
interface EmailIntegration extends BaseIntegration {
  provider: 'mailgun' | 'sendgrid' | 'postmark' | 'generic';
  default_priority: TaskPriority;
  allowed_senders: string | null;
  auto_classify: boolean;
}
```

### SlackIntegration

```typescript
interface SlackIntegration extends BaseIntegration {
  slack_signing_secret: string | null;
  allowed_channels: string[];
  trigger_words: string[];
  trigger_reactions: string[];
  default_priority: TaskPriority;
}
```

### SentryIntegration

```typescript
interface SentryIntegration extends BaseIntegration {
  auto_create_tasks: boolean;
  default_priority: TaskPriority;
  enabled_levels: string;
  default_project_tag: string | null;
}
```

## Constants

```typescript
// Maximum tasks in "vibing" status
export const WIP_LIMIT = 3;

// Auto-archive done tasks after this many hours
export const AUTO_ARCHIVE_HOURS = 24;

// Priority order
export const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low', 'none'];

// Status order
export const STATUSES: TaskStatus[] = ['todo', 'vibing', 'done', 'archived'];

// Default tag colors
export const DEFAULT_TAG_COLORS: Record<string, string> = {
  backend: '#3B82F6',
  frontend: '#10B981',
  // ...
};
```

## API Types

### CreateTaskInput

```typescript
type CreateTaskInput = Pick<Task, 'title'> & 
  Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
```

### UpdateTaskInput

```typescript
type UpdateTaskInput = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;
```

### ApiResponse

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

## Package Structure

```
packages/shared/
├── src/
│   ├── index.ts          # Main exports
│   ├── types.ts          # All shared types
│   ├── types/
│   │   └── vibetasks.ts  # .vibetasks.json file schema
│   ├── services/
│   │   ├── index.ts
│   │   └── task-service.ts
│   └── utils/
│       └── project-detector.ts
├── dist/                  # Compiled output
├── package.json
└── tsconfig.json
```

## Building

```bash
# Build the shared package
cd packages/shared
pnpm build

# Watch mode for development
pnpm dev

# Type check without emitting
pnpm typecheck
```

## Type Compatibility

The types in `@vibetasks/shared` are the **source of truth**. Other packages either:

1. **Import directly** from `@vibetasks/shared`
2. **Define compatible types** that match the shared definitions

This ensures type consistency across the entire monorepo without tight coupling.
