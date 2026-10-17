/**
 * VibeTasks Web Shared Types
 * Re-exports from @vibetasks/shared package
 * 
 * Import from this file for consistent types across the web app.
 * The shared package ensures type consistency with mobile, CLI, and MCP.
 */

// Re-export all types from shared package
export type {
  // Core types
  Task,
  Tag,
  Attachment,
  InlineSubtask,
  Subtask,
  
  // Status & priority
  TaskStatus,
  TaskPriority,
  EnergyLevel,
  NotesFormat,
  TaskCreator,
  TaskSourceType,
  SourceType,
  
  // Filters
  TaskFilter,
  TaskFilterOptions,
  
  // Integrations
  BaseIntegration,
  GitHubIntegration,
  EmailIntegration,
  SlackIntegration,
  SentryIntegration,
  Integration,
  IntegrationType,
  WebhookLog,
  
  // Offline support
  OfflineOperation,
  
  // API types
  CreateTaskInput,
  UpdateTaskInput,
  ApiError,
  ApiResponse,
} from '@vibetasks/shared';

// Re-export constants
export {
  WIP_LIMIT,
  AUTO_ARCHIVE_HOURS,
  DEFAULT_TAG_COLORS,
  SENTRY_LEVELS,
  PRIORITIES,
  STATUSES,
} from '@vibetasks/shared';
