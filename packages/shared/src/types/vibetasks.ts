/**
 * VibeTasks Schema Types
 *
 * The .vibetasks.json file is the shared format between:
 * - VibeTasks UI (web/mobile apps)
 * - Claude Code MCP server
 *
 * Design philosophy: Simple enough for vibers, powerful enough for flow.
 */

// =============================================================================
// TASK TYPES
// =============================================================================

/**
 * Task status - simple 3-state flow
 * - todo: Not started yet
 * - vibing: Currently in progress (actively working on it)
 * - done: Completed
 */
export type TaskStatus = 'todo' | 'vibing' | 'done';

/**
 * A subtask within a task (simple checklist item)
 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * An attachment linked to a task
 * Can be files, screenshots, or any reference material
 */
export interface TaskAttachment {
  id: string;
  name: string;
  path: string;
}

/**
 * A VibeTasks task
 *
 * Core fields are required, everything else is optional.
 * Progressive disclosure - start simple, add context as needed.
 */
export interface VibeTask {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Task title - what needs to be done */
  title: string;

  /** Current status: todo -> vibing -> done */
  status: TaskStatus;

  /**
   * Notes about the task itself
   * What is this task? Why does it matter? Background context.
   */
  notes?: string;

  /**
   * Context notes - "where I left off"
   * Updated when pausing work. Helps resume quickly.
   * AI can update this to track progress, blockers, next steps.
   */
  contextNotes?: string;

  /** Subtasks - simple checklist for breaking down work */
  subtasks: Subtask[];

  /** Attached files, screenshots, references */
  attachments: TaskAttachment[];

  /**
   * Project identifier
   * Auto-detected from git remote or directory name.
   * Can be manually set/overridden.
   */
  project?: string;

  /** When the task was created (ISO 8601) */
  createdAt: string;

  /** When the task was last updated (ISO 8601) */
  updatedAt: string;
}

// =============================================================================
// PROJECT TYPES
// =============================================================================

/**
 * A detected or configured project
 *
 * Projects are auto-detected from git repositories in the workspace.
 * Used for task organization and filtering.
 */
export interface VibeProject {
  /** Project identifier (usually directory name or repo name) */
  id: string;

  /** Display name for the project */
  name: string;

  /** Absolute path to the project root */
  path: string;

  /** Git remote URL (if detected) */
  gitRemote?: string;

  /** Git branch currently checked out (if detected) */
  gitBranch?: string;

  /** When the project was first detected (ISO 8601) */
  detectedAt: string;
}

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * VibeTasks settings
 *
 * Sensible defaults for vibers. Tweak if needed.
 */
export interface VibeSettings {
  /**
   * Work-in-progress limit
   * Maximum number of tasks that can be "vibing" at once.
   * Default: 3 (focus is key!)
   */
  wipLimit: number;

  /**
   * Auto-detect projects from git repositories
   * Default: true
   */
  autoDetectProjects: boolean;

  /**
   * Default project for new tasks (when not auto-detected)
   */
  defaultProject?: string;

  /**
   * Archive completed tasks after N days
   * Set to 0 to never auto-archive.
   * Default: 7
   */
  archiveAfterDays: number;
}

// =============================================================================
// ROOT SCHEMA
// =============================================================================

/**
 * The .vibetasks.json file schema
 *
 * This is the complete structure of the .vibetasks.json file.
 * Lives at the root of the workspace or user's home directory.
 */
export interface VibeTasksFile {
  /**
   * Schema version for future migrations
   * Current version: 1
   */
  version: 1;

  /** All tasks */
  tasks: VibeTask[];

  /** Detected and configured projects */
  projects: VibeProject[];

  /** User settings */
  settings: VibeSettings;

  /** When the file was last modified (ISO 8601) */
  lastModified: string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Input for creating a new task
 * Only title is required, everything else has defaults
 */
export type CreateTaskInput = Pick<VibeTask, 'title'> &
  Partial<Omit<VibeTask, 'id' | 'title' | 'createdAt' | 'updatedAt'>>;

/**
 * Input for updating a task
 * All fields optional except id
 */
export type UpdateTaskInput = Pick<VibeTask, 'id'> &
  Partial<Omit<VibeTask, 'id' | 'createdAt'>>;

/**
 * Default settings for new .vibetasks.json files
 */
export const DEFAULT_SETTINGS: VibeSettings = {
  wipLimit: 3,
  autoDetectProjects: true,
  archiveAfterDays: 7,
};

/**
 * Create an empty .vibetasks.json structure
 */
export function createEmptyVibeTasksFile(): VibeTasksFile {
  return {
    version: 1,
    tasks: [],
    projects: [],
    settings: { ...DEFAULT_SETTINGS },
    lastModified: new Date().toISOString(),
  };
}

/**
 * Generate a new UUID v4
 * Simple implementation for task/subtask IDs
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new task with defaults
 */
export function createTask(input: CreateTaskInput): VibeTask {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: input.title,
    status: input.status ?? 'todo',
    notes: input.notes,
    contextNotes: input.contextNotes,
    subtasks: input.subtasks ?? [],
    attachments: input.attachments ?? [],
    project: input.project,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new subtask
 */
export function createSubtask(title: string): Subtask {
  return {
    id: generateId(),
    title,
    completed: false,
  };
}
