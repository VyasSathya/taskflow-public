/**
 * VibeTasks MCP Core
 * Shared logic for MCP server and CLI tool
 */

export { ConfigManager } from './config-manager.js';
export type { TaskFlowConfig } from './config-manager.js';

export { AuthManager } from './auth-manager.js';

export { createSupabaseClient, createSupabaseClientFromEnv } from './supabase-client.js';
export type { SupabaseConfig } from './supabase-client.js';

export { TaskOperations } from './task-operations.js';
export type { 
  Task, 
  Tag, 
  Subtask, 
  Attachment, 
  TaskFilter, 
  TaskPriority, 
  TaskStatus, 
  SourceType 
} from './task-operations.js';

// Claude Code integration
export { ClaudeSync, syncClaudeTodos } from './claude-sync.js';
export type {
  ClaudeTodoItem,
  SyncResult,
  SyncAllResult,
  SyncOptions,
} from './claude-sync.js';
