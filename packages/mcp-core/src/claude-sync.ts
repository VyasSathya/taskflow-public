/**
 * Claude Code TodoWrite Sync
 *
 * This module provides synchronization between Claude's TodoWrite state
 * and VibeTasks task statuses.
 *
 * Status mapping:
 *   Claude "pending"     -> VibeTasks "todo"
 *   Claude "in_progress" -> VibeTasks "vibing"
 *   Claude "completed"   -> VibeTasks "done"
 */

import { TaskOperations, Task, TaskStatus } from './task-operations.js';

/**
 * Claude Code TodoWrite item structure
 */
export interface ClaudeTodoItem {
  /** The task description/content */
  content: string;
  /** Current status: pending, in_progress, or completed */
  status: 'pending' | 'in_progress' | 'completed';
  /** Active form description (used during in_progress) */
  activeForm?: string;
}

/**
 * Result of syncing a single todo item
 */
export interface SyncResult {
  /** The Claude todo content */
  content: string;
  /** Whether a matching VibeTasks task was found */
  matched: boolean;
  /** The VibeTasks task ID if matched */
  taskId?: string;
  /** The action taken */
  action: 'created' | 'updated' | 'skipped' | 'not_found';
  /** Previous status (if updated) */
  previousStatus?: TaskStatus;
  /** New status (if updated) */
  newStatus?: TaskStatus;
  /** Error message if any */
  error?: string;
}

/**
 * Result of syncing all todos
 */
export interface SyncAllResult {
  /** Whether the overall sync was successful */
  success: boolean;
  /** Number of todos processed */
  processed: number;
  /** Number of todos synced successfully */
  synced: number;
  /** Number of todos that failed to sync */
  failed: number;
  /** Individual sync results */
  results: SyncResult[];
}

/**
 * Options for the sync operation
 */
export interface SyncOptions {
  /** Create new tasks for unmatched todos (default: false) */
  createMissing?: boolean;
  /** Project tag to use for created tasks */
  projectTag?: string;
  /** Minimum similarity score for matching (0-1, default: 0.6) */
  matchThreshold?: number;
  /** Whether to sync 'pending' todos as 'todo' status (default: true) */
  syncPending?: boolean;
}

/**
 * Map Claude status to VibeTasks status
 */
function mapStatus(claudeStatus: ClaudeTodoItem['status']): TaskStatus {
  switch (claudeStatus) {
    case 'pending':
      return 'todo';
    case 'in_progress':
      return 'vibing';
    case 'completed':
      return 'done';
    default:
      return 'todo';
  }
}

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Tokenize and compare words
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }

  const totalWords = Math.max(words1.size, words2.size);
  if (totalWords === 0) return 0;

  return commonWords / totalWords;
}

/**
 * Find the best matching task for a Claude todo item
 */
function findBestMatch(
  todoContent: string,
  tasks: Task[],
  threshold: number = 0.6
): { task: Task; similarity: number } | null {
  let bestMatch: { task: Task; similarity: number } | null = null;

  for (const task of tasks) {
    const similarity = calculateSimilarity(todoContent, task.title);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { task, similarity };
      }
    }

    // Also check notes/context if available
    if (task.context_notes) {
      const noteSimilarity = calculateSimilarity(todoContent, task.context_notes);
      if (noteSimilarity >= threshold && noteSimilarity > (bestMatch?.similarity || 0)) {
        bestMatch = { task, similarity: noteSimilarity };
      }
    }
  }

  return bestMatch;
}

/**
 * Claude Sync class for managing TodoWrite synchronization
 */
export class ClaudeSync {
  private taskOps: TaskOperations;

  constructor(taskOps: TaskOperations) {
    this.taskOps = taskOps;
  }

  /**
   * Sync a single Claude todo item with VibeTasks
   */
  async syncTodo(
    todo: ClaudeTodoItem,
    existingTasks?: Task[],
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const {
      createMissing = false,
      projectTag,
      matchThreshold = 0.6,
      syncPending = true,
    } = options;

    try {
      // Skip pending todos if not syncing them
      if (todo.status === 'pending' && !syncPending) {
        return {
          content: todo.content,
          matched: false,
          action: 'skipped',
        };
      }

      // Get tasks if not provided
      const tasks = existingTasks || await this.taskOps.getTasks('all');

      // Find matching task
      const match = findBestMatch(todo.content, tasks, matchThreshold);

      if (match) {
        const vibeStatus = mapStatus(todo.status);
        const currentStatus = match.task.status || 'todo';

        // Only update if status is different
        if (currentStatus !== vibeStatus) {
          // For completed status, use completeTask method
          if (vibeStatus === 'done' && !match.task.completed) {
            await this.taskOps.completeTask(match.task.id);
          } else {
            await this.taskOps.updateTask(match.task.id, {
              status: vibeStatus,
              completed: vibeStatus === 'done',
            });
          }

          return {
            content: todo.content,
            matched: true,
            taskId: match.task.id,
            action: 'updated',
            previousStatus: currentStatus,
            newStatus: vibeStatus,
          };
        }

        return {
          content: todo.content,
          matched: true,
          taskId: match.task.id,
          action: 'skipped',
        };
      }

      // No match found
      if (createMissing) {
        const vibeStatus = mapStatus(todo.status);
        const newTask = await this.taskOps.createTask({
          title: todo.content,
          status: vibeStatus,
          project_tag: projectTag,
          created_by: 'ai',
          context_notes: todo.activeForm ? `Started: ${todo.activeForm}` : undefined,
          completed: vibeStatus === 'done',
        });

        return {
          content: todo.content,
          matched: false,
          taskId: newTask.id,
          action: 'created',
          newStatus: vibeStatus,
        };
      }

      return {
        content: todo.content,
        matched: false,
        action: 'not_found',
      };
    } catch (error: any) {
      return {
        content: todo.content,
        matched: false,
        action: 'skipped',
        error: error.message,
      };
    }
  }

  /**
   * Sync all Claude todos with VibeTasks
   */
  async syncAllTodos(
    todos: ClaudeTodoItem[],
    options: SyncOptions = {}
  ): Promise<SyncAllResult> {
    const results: SyncResult[] = [];
    let synced = 0;
    let failed = 0;

    try {
      // Pre-fetch all tasks for efficiency
      const tasks = await this.taskOps.getTasks('all');

      for (const todo of todos) {
        const result = await this.syncTodo(todo, tasks, options);
        results.push(result);

        if (result.action === 'updated' || result.action === 'created') {
          synced++;
        } else if (result.error) {
          failed++;
        }
      }

      return {
        success: failed === 0,
        processed: todos.length,
        synced,
        failed,
        results,
      };
    } catch (error: any) {
      return {
        success: false,
        processed: 0,
        synced: 0,
        failed: todos.length,
        results: [{
          content: 'All todos',
          matched: false,
          action: 'skipped',
          error: error.message,
        }],
      };
    }
  }

  /**
   * Get current vibing tasks (for comparison with Claude's in_progress)
   */
  async getVibingTasks(): Promise<Task[]> {
    const allTasks = await this.taskOps.getTasks('all');
    return allTasks.filter(t => t.status === 'vibing' && !t.completed);
  }

  /**
   * Auto-start vibing on a task when Claude marks it as in_progress
   */
  async startVibing(taskId: string): Promise<Task> {
    return await this.taskOps.updateTask(taskId, {
      status: 'vibing',
      completed: false,
    });
  }

  /**
   * Complete a task when Claude marks it as completed
   */
  async completeTask(taskId: string): Promise<Task> {
    return await this.taskOps.completeTask(taskId);
  }
}

/**
 * MCP Tool: sync_claude_todos
 *
 * This function is designed to be called as an MCP tool.
 * It accepts Claude's current todo list and syncs it with VibeTasks.
 */
export async function syncClaudeTodos(
  taskOps: TaskOperations,
  todos: ClaudeTodoItem[],
  options: SyncOptions = {}
): Promise<SyncAllResult> {
  const sync = new ClaudeSync(taskOps);
  return await sync.syncAllTodos(todos, options);
}
