/**
 * VibeTasks Shared Types
 * Comprehensive types used across all platforms: web, mobile, CLI, MCP
 *
 * VibeTasks Philosophy: Simple enough for vibers, powerful enough for flow.
 * - Status Flow: todo -> vibing -> done -> archived
 * - Context Notes: "Where I left off" for seamless resumption
 * - WIP Limit: Max 3 vibing tasks for focus
 * - Project Auto-Detection: Group by git repo or directory
 */

// =============================================================================
// STATUS & PRIORITY TYPES
// =============================================================================

/**
 * Task status - simple flow with archive
 * - todo: Not started yet, waiting in backlog
 * - vibing: Currently in progress (actively working on it)
 * - done: Completed (auto-archives after 24 hours)
 * - archived: Completed History - everything you've finished
 */
export type TaskStatus = 'todo' | 'vibing' | 'done' | 'archived';

/**
 * Task priority levels
 */
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

/**
 * Energy level required for a task
 * Used to match tasks to your current energy/focus state
 */
export type EnergyLevel = 'low' | 'medium' | 'high';

/**
 * Notes format for rich text content
 */
export type NotesFormat = 'html' | 'markdown';

/**
 * Who created the task
 */
export type TaskCreator = 'ai' | 'human';

// =============================================================================
// SOURCE TYPE - Integration Sources
// =============================================================================

/**
 * Source type for tasks created via integrations
 * Tracks where the task originated from
 * 
 * CONSISTENT VALUES across all packages:
 * - @vibetasks/shared (canonical)
 * - @vibetasks/mcp-core
 * - @vibetasks/mcp-server
 * - @vibetasks/cli
 */
export type TaskSourceType =
  | 'manual'           // Created manually in VibeTasks
  | 'github_bug'       // GitHub issue classified as bug
  | 'github_feedback'  // GitHub issue classified as feedback
  | 'email_bug'        // Email classified as bug report
  | 'email_feedback'   // Email classified as feedback
  | 'slack_bug'        // Slack message classified as bug
  | 'slack_feedback'   // Slack message classified as feedback
  | 'sentry_error'     // Sentry error/exception
  | 'browser_extension'// Created via browser extension
  | 'vscode_extension' // Created via VS Code extension
  | 'cli'              // Created via CLI
  | 'mcp'              // Created via MCP server
  | 'github_action'    // Created via GitHub Action
  // Legacy aliases for backwards compatibility
  | 'sentry'           // Alias for sentry_error
  | 'ci';              // Alias for github_action

// Legacy alias - use TaskSourceType instead
export type SourceType = TaskSourceType;

// =============================================================================
// TAG & ATTACHMENT TYPES
// =============================================================================

/**
 * Tag for categorizing tasks
 */
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

/**
 * Attachment linked to a task
 * Supports files, images, and other media
 */
export interface Attachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  url?: string;           // Signed URL for downloading
  is_image?: boolean;     // True for image/* file types
  alt_text?: string;      // Alt text for images
  ai_description?: string; // AI-generated description of the image
  created_at: string;
}

// =============================================================================
// INLINE SUBTASK TYPE
// =============================================================================

/**
 * Inline subtask stored as JSON in the task's subtasks column
 * Created by CLI: vibetasks add --subtasks "Step 1" "Step 2"
 * Or via MCP: create_task with subtasks array
 */
export interface InlineSubtask {
  id: string;
  title: string;
  done: boolean;
  notes?: string;
}

// Legacy alias for backwards compatibility
export type Subtask = InlineSubtask;

// =============================================================================
// ERROR & FEEDBACK ATTACHMENTS - Ultra Low-Friction Error/Feedback on Tasks
// =============================================================================

/**
 * Error category for pattern detection
 */
export type ErrorCategory =
  | 'nodejs'      // TypeError, ReferenceError, stack traces
  | 'typescript'  // TS#### codes
  | 'npm'         // npm ERR!, ERESOLVE
  | 'webpack'     // Module not found, Failed to compile
  | 'vite'        // Vite build errors
  | 'expo'        // Metro bundler, React Native
  | 'python'      // Traceback, NameError
  | 'rust'        // cargo, rustc errors
  | 'go'          // go build errors
  | 'general';    // Unclassified errors

/**
 * Parsed error information - attached to a task
 * This is the core data structure for error tracking on tasks.
 * 
 * Design: Ultra low-friction - just paste error text, we extract the rest.
 */
export interface ErrorContext {
  /** Original error text (raw paste from terminal/console) */
  raw_text: string;
  
  /** Extracted error type (e.g., "TypeError", "TS2304", "ERESOLVE") */
  error_type?: string;
  
  /** Human-readable error message */
  message?: string;
  
  /** Error category for grouping */
  category?: ErrorCategory;
  
  /** Source file path if detected */
  file_path?: string;
  
  /** Line number if detected */
  line_number?: number;
  
  /** Column number if detected */
  column?: number;
  
  /** Error code (e.g., "E404", "TS2304") */
  code?: string;
  
  /** Stack trace (first 20 lines) */
  stack_trace?: string;
  
  /** Auto-generated fix suggestion */
  suggestion?: string;
  
  /** When the error was captured */
  captured_at: string;
  
  /** Source of the error capture */
  capture_source?: 'paste' | 'clipboard' | 'terminal' | 'browser' | 'sentry' | 'ci';
}

/**
 * Feedback type classification
 */
export type FeedbackType =
  | 'bug_report'      // User reporting a bug
  | 'feature_request' // Feature suggestion
  | 'question'        // Support question
  | 'praise'          // Positive feedback
  | 'complaint'       // Negative feedback
  | 'other';          // Unclassified

/**
 * User feedback attached to a task
 * For tracking feature requests, bug reports, and user messages.
 */
export interface FeedbackContext {
  /** Original feedback text */
  raw_text: string;
  
  /** Auto-classified feedback type */
  feedback_type?: FeedbackType;
  
  /** Who sent the feedback (email, name, or user ID) */
  sender?: string;
  
  /** Where the feedback came from */
  source?: 'github' | 'email' | 'slack' | 'manual' | 'intercom' | 'discord';
  
  /** External reference URL (GitHub issue, email thread, etc.) */
  source_url?: string;
  
  /** External reference ID */
  source_id?: string;
  
  /** When the feedback was received */
  received_at: string;
  
  /** AI-generated summary (1-2 sentences) */
  summary?: string;
}

/**
 * Acknowledgment action for errors/feedback
 */
export type AcknowledgeAction =
  | 'investigating' // Looking into it
  | 'fixed'         // Issue resolved
  | 'wont_fix'      // Not going to fix
  | 'duplicate'     // Duplicate of another issue
  | 'need_info'     // Need more information
  | 'delegated';    // Assigned to someone else

/**
 * Acknowledgment status for inbox items
 */
export interface Acknowledgment {
  action: AcknowledgeAction;
  acknowledged_by: 'ai' | 'human';
  acknowledged_at: string;
  notes?: string;
}

// =============================================================================
// TASK TYPE - The Core Entity
// =============================================================================

/**
 * VibeTasks Task - the main entity
 * 
 * This is the comprehensive Task type that includes all fields
 * used across integrations. Not all fields are required - they
 * are populated based on the task's source.
 */
export interface Task {
  // Core fields (always present)
  id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;

  // Content fields
  description?: string;       // Brief description (plain text, for AI summaries)
  notes?: string;             // Rich notes (HTML/markdown)
  notes_format: NotesFormat;

  // Status & Completion
  status: TaskStatus;
  completed: boolean;         // Kept for backwards compatibility (synced with status)
  completed_at?: string;
  archived_at?: string;

  // Scheduling
  due_date?: string;
  start_date?: string;
  duration_minutes?: number;
  scheduled_time?: string;
  recurrence_rule?: string;   // iCal RRULE format
  recurrence_end?: string;

  // Priority & Energy
  priority: TaskPriority;
  energy_required?: EnergyLevel;

  // VibeTasks-specific fields
  project_tag?: string;       // Auto-detected from git/directory
  created_by?: TaskCreator;
  context_notes?: string;     // "Where I left off" - progress, blockers, next steps

  // Source tracking (for integrations)
  source_type?: TaskSourceType;

  // Hierarchy
  parent_task_id?: string;

  // Inline Subtasks (JSON array stored in DB 'subtasks' column)
  subtasks_json?: InlineSubtask[];

  // =========================================================================
  // GitHub Integration Fields
  // =========================================================================
  github_issue_id?: number;     // GitHub issue ID for deduplication
  github_issue_number?: number; // Issue number (e.g., #123)
  github_repo?: string;         // Full repo name (owner/repo)
  github_url?: string;          // Link to GitHub issue

  // =========================================================================
  // Email Integration Fields
  // =========================================================================
  email_from?: string;          // Sender email address
  email_subject?: string;       // Email subject line

  // =========================================================================
  // Slack Integration Fields
  // =========================================================================
  slack_channel?: string;       // Slack channel ID
  slack_user?: string;          // Slack user ID
  slack_ts?: string;            // Message timestamp (for linking)

  // =========================================================================
  // Sentry Integration Fields
  // =========================================================================
  sentry_issue_id?: string;     // Sentry issue ID for deduplication
  sentry_project?: string;      // Sentry project slug
  sentry_error_count?: number;  // Number of times this error occurred
  sentry_first_seen?: string;   // First occurrence timestamp
  sentry_last_seen?: string;    // Last occurrence timestamp
  sentry_level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  sentry_url?: string;          // Link to Sentry issue

  // =========================================================================
  // Error & Feedback Attachments (NEW - Ultra Low-Friction)
  // =========================================================================
  /** Error context attached to this task (JSON in DB) */
  error_context?: ErrorContext;
  
  /** Feedback context attached to this task (JSON in DB) */
  feedback_context?: FeedbackContext;
  
  /** Acknowledgment status for inbox triage */
  acknowledgment?: Acknowledgment;

  // =========================================================================
  // Relations (populated from queries, not stored directly)
  // =========================================================================
  tags?: Tag[];
  attachments?: Attachment[];
  subtasks?: Task[];            // Legacy subtasks (separate task rows)
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Task filter options for list views
 */
export type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'archived';

/**
 * Extended filter options including integration sources
 */
export interface TaskFilterOptions {
  filter?: TaskFilter;
  source_type?: TaskSourceType;
  project_tag?: string;
  tag_id?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

/**
 * Base interface for all integrations
 */
export interface BaseIntegration {
  id: string;
  user_id: string;
  webhook_secret: string;
  is_enabled: boolean;
  tasks_created: number;
  last_webhook_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub Issues integration
 * Receives webhooks from GitHub repos to create tasks from issues
 */
export interface GitHubIntegration extends BaseIntegration {
  github_secret: string | null;       // Optional webhook secret for signature verification
  enabled_events: string;             // Comma-separated: "issues,issue_comment"
  default_priority: TaskPriority;
  default_project_tag: string | null;
  auto_close_on_resolve: boolean;
}

/**
 * Email integration (Mailgun, SendGrid, Postmark)
 * Receives inbound emails and creates tasks from support messages
 */
export interface EmailIntegration extends BaseIntegration {
  provider: 'mailgun' | 'sendgrid' | 'postmark' | 'generic';
  default_priority: TaskPriority;
  allowed_senders: string | null;     // Comma-separated email patterns
  auto_classify: boolean;             // Auto-classify as bug/feedback
}

/**
 * Slack integration
 * Monitors channels for feedback keywords and creates tasks
 */
export interface SlackIntegration extends BaseIntegration {
  slack_signing_secret: string | null;
  allowed_channels: string[];         // Channel IDs to monitor
  trigger_words: string[];            // Keywords that trigger task creation
  trigger_reactions: string[];        // Emoji reactions that trigger task creation
  default_priority: TaskPriority;
}

/**
 * Sentry integration
 * Receives error webhooks and creates tasks from issues
 */
export interface SentryIntegration extends BaseIntegration {
  auto_create_tasks: boolean;
  default_priority: TaskPriority;
  enabled_levels: string;             // Comma-separated: "fatal,error,warning"
  default_project_tag: string | null;
}

/**
 * Union type for all integrations
 */
export type Integration = 
  | GitHubIntegration 
  | EmailIntegration 
  | SlackIntegration 
  | SentryIntegration;

/**
 * Integration type identifiers
 */
export type IntegrationType = 'github' | 'email' | 'slack' | 'sentry';

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/**
 * Webhook log entry for debugging and analytics
 */
export interface WebhookLog {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  action: string;
  resource: string;
  success: boolean;
  error_message: string | null;
  task_id: string | null;
  ip_address: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// OFFLINE SUPPORT
// =============================================================================

/**
 * Offline operation for sync queue
 */
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  task: Partial<Task>;
  timestamp: number;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Input for creating a new task
 */
export type CreateTaskInput = Pick<Task, 'title'> & Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * Input for updating a task
 */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * API success response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * WIP Limit - Maximum tasks that can be "vibing" at once
 * Research shows 3+ concurrent tasks = 40% productivity loss
 */
export const WIP_LIMIT = 3;

/**
 * Auto-archive threshold - done tasks move to Completed History after this many hours
 */
export const AUTO_ARCHIVE_HOURS = 24;

/**
 * Default tag colors for seeding
 */
export const DEFAULT_TAG_COLORS: Record<string, string> = {
  backend: '#3B82F6',   // Blue
  frontend: '#10B981',  // Green
  ai: '#8B5CF6',        // Purple
  ui: '#F59E0B',        // Amber
  ux: '#EC4899',        // Pink
  api: '#6366F1',       // Indigo
  db: '#14B8A6',        // Teal
  devops: '#EF4444',    // Red
  testing: '#84CC16',   // Lime
  docs: '#9CA3AF',      // Gray
  github: '#24292E',    // GitHub black
  email: '#4285F4',     // Gmail blue
  slack: '#4A154B',     // Slack purple
  sentry: '#362D59',    // Sentry purple
  error: '#DC2626',     // Error red
  feedback: '#0EA5E9',  // Feedback blue
};

/**
 * Sentry error levels in order of severity
 */
export const SENTRY_LEVELS = ['fatal', 'error', 'warning', 'info', 'debug'] as const;

/**
 * Task priorities in order of urgency
 */
export const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low', 'none'];

/**
 * Task statuses in workflow order
 */
export const STATUSES: TaskStatus[] = ['todo', 'vibing', 'done', 'archived'];
