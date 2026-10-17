/**
 * VibeTasks Types (Web)
 * Re-exports from shared types for convenient imports
 */

export type {
  Task,
  Tag,
  Attachment,
  InlineSubtask,
  Subtask,
  TaskStatus,
  TaskPriority,
  TaskFilter,
  TaskFilterOptions,
  TaskSourceType,
  OfflineOperation,
  CreateTaskInput,
  UpdateTaskInput,
  // Integration types
  GitHubIntegration,
  EmailIntegration,
  SlackIntegration,
  SentryIntegration,
  Integration,
  IntegrationType,
  WebhookLog,
} from './shared/types';

export {
  WIP_LIMIT,
  AUTO_ARCHIVE_HOURS,
  DEFAULT_TAG_COLORS,
  PRIORITIES,
  STATUSES,
} from './shared/types';
