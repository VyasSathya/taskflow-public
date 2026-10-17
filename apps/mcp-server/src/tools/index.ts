import { TaskOperations } from '@vibetasks/core';
import {
  parseError,
  generateErrorTaskTitle,
  detectProjectFromError,
  containsError,
  type ErrorContext,
} from '@vibetasks/shared';
import { z } from 'zod';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any, taskOps: TaskOperations) => Promise<any>;
}

export function setupTools(taskOps: TaskOperations): MCPTool[] {
  return [
    // create_task
    {
      name: 'create_task',
      description: 'Create a new task in VibeTasks. Use this instead of TodoWrite - tasks persist across sessions and sync everywhere.',
      inputSchema: z.object({
        title: z.string().describe('Task title (required)'),
        description: z.string().optional().describe('Brief description of what this task involves'),
        notes: z.string().optional().describe('Detailed notes in markdown'),
        subtasks: z
          .array(z.object({
            title: z.string().describe('Subtask title'),
            done: z.boolean().default(false).describe('Is this subtask completed?'),
            notes: z.string().optional().describe('Progress notes for this subtask'),
          }))
          .optional()
          .describe('Inline subtasks - each with title, done status, and optional notes'),
        due_date: z
          .string()
          .optional()
          .describe('Due date (ISO 8601 format)'),
        priority: z
          .enum(['none', 'low', 'medium', 'high'])
          .default('none')
          .describe('Task priority'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tag names to attach'),
      }),
      handler: async (args, taskOps) => {
        // Handle tags - get or create
        let tagIds: string[] = [];
        if (args.tags && args.tags.length > 0) {
          for (const tagName of args.tags) {
            const tag = await taskOps.findOrCreateTag(tagName);
            tagIds.push(tag.id);
          }
        }

        // Convert subtasks to JSON format with UUIDs
        const subtasksJson = args.subtasks?.map((st: any) => ({
          id: crypto.randomUUID(),
          title: st.title,
          done: st.done || false,
          notes: st.notes,
        })) || [];

        // Create task
        const task = await taskOps.createTask({
          title: args.title,
          description: args.description,
          notes: args.notes,
          notes_format: 'markdown',
          due_date: args.due_date,
          priority: args.priority,
          subtasks_json: subtasksJson,
        });

        // Link tags
        if (tagIds.length > 0) {
          await taskOps.linkTaskTags(task.id, tagIds);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    due_date: task.due_date,
                    subtasks: subtasksJson,
                    created_at: task.created_at,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_tasks
    {
      name: 'get_tasks',
      description: 'Get tasks by filter',
      inputSchema: z.object({
        filter: z
          .enum(['all', 'today', 'upcoming', 'completed'])
          .default('all')
          .describe('Task filter'),
      }),
      handler: async (args, taskOps) => {
        const tasks = await taskOps.getTasks(args.filter);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    completed: t.completed,
                    due_date: t.due_date,
                    tags: t.tags?.map((tag) => tag.name) || [],
                  })),
                  count: tasks.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // update_task
    {
      name: 'update_task',
      description: 'Update an existing task',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID'),
        title: z.string().optional().describe('New title'),
        notes: z.string().optional().describe('New notes (user-facing description)'),
        context_notes: z.string().optional().describe('AI context notes - progress, blockers, next steps'),
        due_date: z.string().optional().describe('New due date (ISO 8601)'),
        priority: z
          .enum(['none', 'low', 'medium', 'high'])
          .optional()
          .describe('New priority'),
        completed: z.boolean().optional().describe('Completion status'),
      }),
      handler: async (args, taskOps) => {
        const updates: any = {};

        if (args.title !== undefined) updates.title = args.title;
        if (args.notes !== undefined) updates.notes = args.notes;
        if (args.context_notes !== undefined) updates.context_notes = args.context_notes;
        if (args.due_date !== undefined) updates.due_date = args.due_date;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.completed !== undefined) updates.completed = args.completed;

        const task = await taskOps.updateTask(args.task_id, updates);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    completed: task.completed,
                    priority: task.priority,
                    context_notes: task.context_notes,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // complete_task
    {
      name: 'complete_task',
      description: 'Mark a task as complete, optionally adding completion notes',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID'),
        context_notes: z.string().optional().describe('Completion notes - what was done, any final notes'),
      }),
      handler: async (args, taskOps) => {
        // If context_notes provided, update them first
        if (args.context_notes) {
          await taskOps.updateTask(args.task_id, { context_notes: args.context_notes });
        }
        
        const task = await taskOps.completeTask(args.task_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    completed: true,
                    completed_at: task.completed_at,
                    context_notes: args.context_notes || task.context_notes,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // delete_task
    {
      name: 'delete_task',
      description: 'Delete a task',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID'),
      }),
      handler: async (args, taskOps) => {
        await taskOps.deleteTask(args.task_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Task deleted successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // search_tasks
    {
      name: 'search_tasks',
      description: 'Search tasks by title',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        limit: z.number().default(20).describe('Maximum results'),
      }),
      handler: async (args, taskOps) => {
        const tasks = await taskOps.searchTasks(args.query, args.limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    due_date: t.due_date,
                    tags: t.tags?.map((tag) => tag.name) || [],
                  })),
                  count: tasks.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // create_task_with_subtasks
    {
      name: 'create_task_with_subtasks',
      description: 'Create a parent task with multiple subtasks in one call. Use this when using TodoWrite - it automatically mirrors your todo list to TaskFlow for persistent tracking.',
      inputSchema: z.object({
        title: z.string().describe('Parent task title (the overall goal)'),
        subtasks: z
          .array(z.string())
          .describe('Array of subtask titles (one for each todo item)'),
        notes: z.string().optional().describe('Notes for parent task'),
        due_date: z
          .string()
          .optional()
          .describe('Due date for parent task (ISO 8601 format)'),
        priority: z
          .enum(['none', 'low', 'medium', 'high'])
          .default('none')
          .describe('Priority for parent task'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tag names to attach to parent task'),
      }),
      handler: async (args, taskOps) => {
        // Handle tags - get or create
        let tagIds: string[] = [];
        if (args.tags && args.tags.length > 0) {
          for (const tagName of args.tags) {
            const tag = await taskOps.findOrCreateTag(tagName);
            tagIds.push(tag.id);
          }
        }

        // Create parent task
        const parentTask = await taskOps.createTask({
          title: args.title,
          notes: args.notes,
          notes_format: 'markdown',
          due_date: args.due_date,
          priority: args.priority,
        });

        // Link tags to parent
        if (tagIds.length > 0) {
          await taskOps.linkTaskTags(parentTask.id, tagIds);
        }

        // Create all subtasks
        const subtasks = [];
        for (const subtaskTitle of args.subtasks) {
          const subtask = await taskOps.createTask({
            title: subtaskTitle,
            notes_format: 'markdown',
            priority: 'none',
            parent_task_id: parentTask.id,
          });
          subtasks.push(subtask);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  parent_task: {
                    id: parentTask.id,
                    title: parentTask.title,
                    priority: parentTask.priority,
                    subtask_count: subtasks.length,
                  },
                  subtasks: subtasks.map((s) => ({
                    id: s.id,
                    title: s.title,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // start_vibing
    {
      name: 'start_vibing',
      description: 'Start vibing on a task (move to "vibing" status). Max 3 tasks vibing at once - research shows more causes 40% productivity loss.',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID to start vibing on'),
      }),
      handler: async (args, taskOps) => {
        // Check WIP limit first
        const allTasks = await taskOps.getTasks('all');
        const vibingTasks = allTasks.filter((t) => t.status === 'vibing');
        const WIP_LIMIT = 3;

        if (vibingTasks.length >= WIP_LIMIT) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `WIP limit reached! You have ${vibingTasks.length} tasks vibing. Complete one before starting another.`,
                    vibing_tasks: vibingTasks.map((t) => ({ id: t.id, title: t.title })),
                    wip_limit: WIP_LIMIT,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const task = await taskOps.updateTask(args.task_id, { status: 'vibing' });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    status: 'vibing',
                  },
                  wip_count: vibingTasks.length + 1,
                  wip_limit: WIP_LIMIT,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // stop_vibing
    {
      name: 'stop_vibing',
      description: 'Stop vibing on a task (move back to "todo" status). Use this when pausing work on a task to work on something else.',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID to stop vibing on'),
        context_notes: z.string().optional().describe('Optional: Save where you left off before stopping'),
      }),
      handler: async (args, taskOps) => {
        // Save context notes if provided
        const updates: any = { status: 'todo' };
        if (args.context_notes) {
          updates.context_notes = args.context_notes;
        }

        const task = await taskOps.updateTask(args.task_id, updates);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    status: 'todo',
                    context_notes: task.context_notes,
                  },
                  message: 'Task moved back to todo. Context notes saved for later.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_vibing_tasks
    {
      name: 'get_vibing_tasks',
      description: 'Get all tasks currently in "vibing" status. Use this to check what the user is actively working on.',
      inputSchema: z.object({}),
      handler: async (args, taskOps) => {
        const allTasks = await taskOps.getTasks('all');
        const vibingTasks = allTasks.filter((t) => t.status === 'vibing');
        const WIP_LIMIT = 3;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  vibing_tasks: vibingTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    context_notes: t.context_notes,
                    priority: t.priority,
                    due_date: t.due_date,
                  })),
                  count: vibingTasks.length,
                  wip_limit: WIP_LIMIT,
                  at_limit: vibingTasks.length >= WIP_LIMIT,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // set_context_notes
    {
      name: 'set_context_notes',
      description: 'Save "where I left off" notes for a task. Use this before pausing work or ending a session to capture context for later.',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID'),
        context_notes: z.string().describe('Where you left off - file, line, next step, blockers'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.updateTask(args.task_id, {
          context_notes: args.context_notes,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    context_notes: task.context_notes,
                  },
                  message: 'Context notes saved. You can resume seamlessly later.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // list_tasks (with status filter)
    {
      name: 'list_tasks',
      description: 'List tasks filtered by status (todo, vibing, done) or all tasks',
      inputSchema: z.object({
        status: z
          .enum(['todo', 'vibing', 'done', 'all'])
          .default('all')
          .describe('Filter by status'),
        limit: z.number().default(50).describe('Maximum results'),
      }),
      handler: async (args, taskOps) => {
        const allTasks = await taskOps.getTasks('all');
        let tasks = allTasks;

        if (args.status !== 'all') {
          tasks = allTasks.filter((t) => t.status === args.status);
        }

        tasks = tasks.slice(0, args.limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    due_date: t.due_date,
                    context_notes: t.context_notes,
                    tags: t.tags?.map((tag) => tag.name) || [],
                  })),
                  count: tasks.length,
                  filter: args.status,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // log_ai_session
    {
      name: 'log_ai_session',
      description: 'Manually log an AI session as a completed task',
      inputSchema: z.object({
        summary: z.string().describe('What was accomplished'),
        files: z
          .array(z.string())
          .optional()
          .describe('Files changed'),
        duration_minutes: z
          .number()
          .optional()
          .describe('Session duration'),
      }),
      handler: async (args, taskOps) => {
        const notes = `# AI Session Summary

${args.summary}

${args.files && args.files.length > 0 ? `## Files Changed\n${args.files.map((f: string) => `- ${f}`).join('\n')}` : ''}

${args.duration_minutes ? `Duration: ${args.duration_minutes} minutes` : ''}

Generated by TaskFlow MCP Server`;

        const task = await taskOps.createTask({
          title: `AI Session: ${args.summary.substring(0, 50)}${args.summary.length > 50 ? '...' : ''}`,
          notes,
          notes_format: 'markdown',
          completed: true,
          priority: 'none',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    completed: true,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // archive_task
    {
      name: 'archive_task',
      description: 'Archive a completed task. Moves the task to archived status, hiding it from default views. Use this to clean up completed tasks without deleting them.',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID to archive'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.archiveTask(args.task_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    status: 'archived',
                    archived_at: task.archived_at,
                  },
                  message: 'Task archived successfully. Use get_archived_tasks to view archived tasks.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_archived_tasks
    {
      name: 'get_archived_tasks',
      description: 'Get all archived tasks. Returns tasks that have been archived, sorted by archive date (most recent first).',
      inputSchema: z.object({
        limit: z.number().default(50).describe('Maximum number of archived tasks to return'),
      }),
      handler: async (args, taskOps) => {
        const tasks = await taskOps.getArchivedTasks(args.limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  archived_tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    completed_at: t.completed_at,
                    archived_at: t.archived_at,
                    priority: t.priority,
                    tags: t.tags?.map((tag) => tag.name) || [],
                  })),
                  count: tasks.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // unarchive_task
    {
      name: 'unarchive_task',
      description: 'Restore an archived task. Moves the task from archived status back to done (or optionally another status).',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID to unarchive'),
        restore_status: z
          .enum(['todo', 'vibing', 'done'])
          .default('done')
          .describe('Status to restore the task to (default: done)'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.unarchiveTask(args.task_id, args.restore_status);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                  },
                  message: `Task restored to '${args.restore_status}' status.`,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // capture_error
    {
      name: 'capture_error',
      description:
        'Parse error text from clipboard, terminal, or direct paste. Extracts structured information from common error formats (Node.js, Python, Expo, webpack, TypeScript, etc.) for AI consumption.',
      inputSchema: z.object({
        error_text: z.string().describe('The raw error text to parse'),
        source: z
          .enum(['terminal', 'browser', 'paste', 'clipboard', 'sentry', 'ci'])
          .default('paste')
          .describe('Source of the error (helps with parsing)'),
      }),
      handler: async (args, _taskOps) => {
        const { error_text, source } = args;

        // Parse the error using shared utility
        const parsed = parseError(error_text, source);

        if (!parsed) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    message: 'Could not parse error. Text does not appear to be an error.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  error_context: parsed,
                  suggested_title: generateErrorTaskTitle(parsed),
                  detected_project: detectProjectFromError(parsed),
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // summarize_errors
    {
      name: 'summarize_errors',
      description:
        'Summarize and deduplicate large error logs (up to thousands of lines). Groups errors by type/file, deduplicates similar errors using pattern matching, filters out node_modules frames, and returns a condensed summary (50-100 lines max).',
      inputSchema: z.object({
        log_text: z.string().describe('The raw log output containing errors'),
        max_lines: z
          .number()
          .default(100)
          .describe('Maximum lines in the summary output (default: 100)'),
      }),
      handler: async (args, _taskOps) => {
        const { log_text, max_lines = 100 } = args;
        
        // Use shared containsError for quick check
        if (!containsError(log_text)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    summary: 'No errors detected in log output.',
                    error_count: 0,
                    unique_errors: 0,
                    grouped_errors: [],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        
        const result = summarizeErrorsLocal(log_text, max_lines);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  ...result,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // update_subtask
    {
      name: 'update_subtask',
      description: 'Update a subtask within a task. Mark it done, add progress notes, or update the title. Use this to track progress on individual steps.',
      inputSchema: z.object({
        task_id: z.string().describe('Parent task ID'),
        subtask_id: z.string().describe('Subtask ID to update'),
        done: z.boolean().optional().describe('Mark subtask as done/not done'),
        title: z.string().optional().describe('Update subtask title'),
        notes: z.string().optional().describe('Add progress notes (e.g., "Completed auth module, need to test edge cases")'),
      }),
      handler: async (args, taskOps) => {
        // Get the task
        const task = await taskOps.getTask(args.task_id);
        // Work with inline subtasks only (subtasks_json), not legacy child tasks
        const subtasks: Array<{ id: string; title: string; done: boolean; notes?: string }> = 
          task.subtasks_json || [];

        // Find and update the subtask
        const subtaskIndex = subtasks.findIndex((st) => st.id === args.subtask_id);
        if (subtaskIndex === -1) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: `Subtask ${args.subtask_id} not found` }, null, 2),
              },
            ],
          };
        }

        // Update fields
        if (args.done !== undefined) subtasks[subtaskIndex].done = args.done;
        if (args.title !== undefined) subtasks[subtaskIndex].title = args.title;
        if (args.notes !== undefined) subtasks[subtaskIndex].notes = args.notes;

        // Save
        const updated = await taskOps.updateTask(args.task_id, { subtasks_json: subtasks });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task_id: args.task_id,
                  subtask: subtasks[subtaskIndex],
                  all_subtasks: subtasks,
                  progress: `${subtasks.filter((s: any) => s.done).length}/${subtasks.length} done`,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // add_subtask
    {
      name: 'add_subtask',
      description: 'Add a new subtask to an existing task. Use this when you discover new steps while working.',
      inputSchema: z.object({
        task_id: z.string().describe('Parent task ID'),
        title: z.string().describe('Subtask title'),
        notes: z.string().optional().describe('Optional notes'),
      }),
      handler: async (args, taskOps) => {
        // Get the task
        const task = await taskOps.getTask(args.task_id);
        // Work with inline subtasks only (subtasks_json), not legacy child tasks
        const subtasks: Array<{ id: string; title: string; done: boolean; notes?: string }> = 
          task.subtasks_json || [];

        // Add new subtask
        const newSubtask = {
          id: crypto.randomUUID(),
          title: args.title,
          done: false,
          notes: args.notes,
        };
        subtasks.push(newSubtask);

        // Save
        await taskOps.updateTask(args.task_id, { subtasks_json: subtasks });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task_id: args.task_id,
                  new_subtask: newSubtask,
                  total_subtasks: subtasks.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_task_images
    {
      name: 'get_task_images',
      description: 'Get image attachments for a task. Returns signed URLs that can be viewed. Use this to see mockups, screenshots, or error images attached to a task.',
      inputSchema: z.object({
        task_id: z.string().describe('Task ID to get images for'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.getTask(args.task_id);
        const attachments = task.attachments || [];
        const images = attachments.filter((a: any) => a.is_image || a.file_type?.startsWith('image/'));

        // Get signed URLs for images
        const imageData = await Promise.all(
          images.map(async (img: any) => {
            const url = await taskOps.getAttachmentUrl(img.storage_path);
            return {
              id: img.id,
              file_name: img.file_name,
              file_type: img.file_type,
              url,
              alt_text: img.alt_text,
              ai_description: img.ai_description,
            };
          })
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task_id: args.task_id,
                  task_title: task.title,
                  images: imageData,
                  count: imageData.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_current_task
    {
      name: 'get_current_task',
      description: 'Get the task you should be working on right now. Returns the first "vibing" task with full details including subtasks, description, context notes, and images. Call this at the start of a session to know where you left off.',
      inputSchema: z.object({}),
      handler: async (_args, taskOps) => {
        const allTasks = await taskOps.getTasks('all');
        const vibingTasks = allTasks.filter((t) => t.status === 'vibing');

        if (vibingTasks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    current_task: null,
                    message: 'No tasks currently vibing. Use list_tasks to see available tasks, or create_task to add one.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Get full details of the first vibing task
        const task = await taskOps.getTask(vibingTasks[0].id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  current_task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    context_notes: task.context_notes,
                    subtasks: task.subtasks_json || task.subtasks || [],
                    progress: task.subtasks_json
                      ? `${(task.subtasks_json as any[]).filter((s: any) => s.done).length}/${(task.subtasks_json as any[]).length} subtasks done`
                      : null,
                    priority: task.priority,
                    has_images: (task.attachments || []).some((a: any) => a.is_image || a.file_type?.startsWith('image/')),
                  },
                  other_vibing_count: vibingTasks.length - 1,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // report_error - AI can report errors it encounters
    {
      name: 'report_error',
      description: 'Report an error you encountered while working. Creates a high-priority task to track and fix it. Use this when you hit a build error, runtime error, or any issue that blocks progress.',
      inputSchema: z.object({
        error_text: z.string().describe('The full error message including stack trace'),
        context: z.string().optional().describe('What you were trying to do when this error occurred'),
        file_path: z.string().optional().describe('File path where the error occurred (if known)'),
        project: z.string().optional().describe('Project name (auto-detected from file path if not provided)'),
      }),
      handler: async (args, taskOps) => {
        const errorText = args.error_text;
        
        // Parse the error using shared utility
        const errorContext = parseError(errorText, 'terminal');
        
        // Generate title using shared utility or fallback
        let title = errorContext 
          ? generateErrorTaskTitle(errorContext)
          : 'Error to fix';
        
        // Detect project using shared utility or args
        let project = args.project;
        if (!project && errorContext) {
          project = detectProjectFromError(errorContext);
        }
        if (!project && args.file_path) {
          const fileMatch = args.file_path.match(/(?:apps|packages)\/([^\/\s]+)\//);
          if (fileMatch) project = fileMatch[1];
        }

        // Build notes with context
        let notes = '';
        if (args.context) {
          notes += `**Context:** ${args.context}\n\n`;
        }
        if (args.file_path || errorContext?.file_path) {
          notes += `**File:** \`${args.file_path || errorContext?.file_path}\``;
          if (errorContext?.line_number) {
            notes += `:${errorContext.line_number}`;
            if (errorContext.column) notes += `:${errorContext.column}`;
          }
          notes += '\n\n';
        }
        if (errorContext?.suggestion) {
          notes += `**Suggestion:** ${errorContext.suggestion}\n\n`;
        }
        notes += `**Error:**\n\`\`\`\n${errorText}\n\`\`\``;

        // Create task with error_context field
        const task = await taskOps.createTask({
          title: title.length > 80 ? title.slice(0, 77) + '...' : title,
          notes,
          priority: 'high',
          status: 'todo',
          project_tag: project,
          created_by: 'ai',
          error_context: errorContext || undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Error reported and task created',
                  task: {
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    project: task.project_tag,
                    error_category: errorContext?.category,
                  },
                  parsed: errorContext ? {
                    category: errorContext.category,
                    error_type: errorContext.error_type,
                    file: errorContext.file_path,
                    line: errorContext.line_number,
                  } : null,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_errors - DEPRECATED: Use get_inbox(source: 'errors') instead
    {
      name: 'get_errors',
      description: '[DEPRECATED - use get_inbox with source="errors" instead] Get current errors/bugs. This is a legacy tool - prefer get_inbox for unified inbox access.',
      inputSchema: z.object({
        priority: z.enum(['critical', 'high', 'all']).default('all').describe('Filter by priority'),
        source: z.enum(['sentry', 'ci', 'manual', 'all']).default('all').describe('Filter by source'),
        unacknowledged_only: z.boolean().default(true).describe('Only show errors you haven\'t acknowledged yet'),
        limit: z.number().default(5).describe('Max errors to return'),
      }),
      handler: async (args, taskOps) => {
        // Delegate to get_inbox with errors filter
        const sourceTypes: string[] = args.source === 'all' 
          ? ['sentry', 'ci'] 
          : args.source === 'sentry' 
            ? ['sentry']
            : args.source === 'ci'
              ? ['ci']
              : [];

        const inboxItems = await taskOps.getInboxItems({
          source_type: sourceTypes.length > 0 ? sourceTypes as any : undefined,
          priority: args.priority === 'all' ? undefined : args.priority as any,
          unacknowledged_only: args.unacknowledged_only,
          limit: args.limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  deprecated: true,
                  message: 'This tool is deprecated. Use get_inbox(source: "errors") for better results.',
                  errors: inboxItems.map(t => ({
                    id: t.id,
                    title: t.title,
                    project: t.project_tag,
                    status: t.status,
                    source: t.source_type || (t.sentry_issue_id ? 'sentry' : 'manual'),
                    created: t.created_at,
                    error_category: (t.error_context as ErrorContext | undefined)?.category,
                  })),
                  total_matching: inboxItems.length,
                  showing: inboxItems.length,
                  hint: 'Migrate to get_inbox(source: "errors") for unified inbox access.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_error_details - Full context for specific error
    {
      name: 'get_error_details',
      description: 'Get full details for a specific error including parsed error context, notes, stack trace, and file context. Use after get_inbox to dive into a specific issue.',
      inputSchema: z.object({
        error_id: z.string().describe('Error task ID'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.getTask(args.error_id);
        const errorContext = task.error_context as ErrorContext | undefined;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  notes: task.notes,
                  project: task.project_tag,
                  status: task.status,
                  priority: task.priority,
                  created_at: task.created_at,
                  created_by: task.created_by,
                  context_notes: task.context_notes,
                  // Parsed error context from shared parser
                  error_context: errorContext ? {
                    category: errorContext.category,
                    error_type: errorContext.error_type,
                    message: errorContext.message,
                    file_path: errorContext.file_path,
                    line_number: errorContext.line_number,
                    column: errorContext.column,
                    stack_trace: errorContext.stack_trace,
                    suggestion: errorContext.suggestion,
                    captured_at: errorContext.captured_at,
                    capture_source: errorContext.capture_source,
                  } : null,
                  // Sentry-specific
                  sentry: task.sentry_issue_id ? {
                    issue_id: task.sentry_issue_id,
                    project: (task as any).sentry_project,
                    error_count: (task as any).sentry_error_count,
                    first_seen: (task as any).sentry_first_seen,
                    last_seen: (task as any).sentry_last_seen,
                    level: (task as any).sentry_level,
                    url: (task as any).sentry_url,
                  } : null,
                  subtasks: task.subtasks_json || [],
                  tags: task.tags?.map((t: any) => t.name) || [],
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // acknowledge_error - Mark error as seen/addressed
    {
      name: 'acknowledge_error',
      description: 'Mark an error as acknowledged so it doesn\'t keep appearing. Use this after you\'ve investigated or fixed an error.',
      inputSchema: z.object({
        error_id: z.string().describe('Error task ID'),
        action: z.enum(['investigating', 'fixed', 'wont_fix', 'need_info', 'delegated']).describe('What action was taken'),
        notes: z.string().optional().describe('Optional notes about what was done'),
      }),
      handler: async (args, taskOps) => {
        const task = await taskOps.getTask(args.error_id);
        
        // Build acknowledgment note
        const timestamp = new Date().toISOString();
        const ackNote = `[AI_ACKNOWLEDGED:${args.action}:${timestamp}]`;
        const existingNotes = task.context_notes || '';
        const newNotes = args.notes 
          ? `${existingNotes}\n\n${ackNote}\n${args.notes}`
          : `${existingNotes}\n\n${ackNote}`;

        // Update status based on action
        let newStatus = task.status;
        if (args.action === 'fixed') {
          newStatus = 'done';
        } else if (args.action === 'investigating') {
          newStatus = 'vibing';
        }

        await taskOps.updateTask(args.error_id, {
          context_notes: newNotes.trim(),
          status: newStatus,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  error_id: args.error_id,
                  action: args.action,
                  new_status: newStatus,
                  message: `Error acknowledged as '${args.action}'. It won't appear in unacknowledged lists.`,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_inbox - Unified inbox for all external sources
    {
      name: 'get_inbox',
      description: 'Get inbox items from all external sources (Sentry errors, GitHub issues, email, Slack, CI failures). Use this to see what needs attention.',
      inputSchema: z.object({
        source: z
          .enum(['all', 'sentry', 'ci', 'github', 'email', 'slack', 'errors', 'feedback'])
          .default('all')
          .describe('Filter by source: all, sentry, ci, github, email, slack, errors (sentry+ci), feedback (github+email+slack)'),
        priority: z
          .enum(['all', 'high', 'medium', 'low'])
          .default('all')
          .describe('Filter by priority'),
        unacknowledged_only: z
          .boolean()
          .default(true)
          .describe('Only show items not yet acknowledged'),
        limit: z.number().default(10).describe('Maximum items to return'),
      }),
      handler: async (args, taskOps) => {
        // Map source filter to source_type values
        let sourceTypes: string[] | undefined;
        switch (args.source) {
          case 'sentry':
            sourceTypes = ['sentry'];
            break;
          case 'ci':
            sourceTypes = ['ci'];
            break;
          case 'github':
            sourceTypes = ['github_bug', 'github_feedback'];
            break;
          case 'email':
            sourceTypes = ['email_bug', 'email_feedback'];
            break;
          case 'slack':
            sourceTypes = ['slack_bug', 'slack_feedback'];
            break;
          case 'errors':
            sourceTypes = ['sentry', 'ci'];
            break;
          case 'feedback':
            sourceTypes = ['github_bug', 'github_feedback', 'email_bug', 'email_feedback', 'slack_bug', 'slack_feedback'];
            break;
          default:
            sourceTypes = undefined;
        }

        const inboxItems = await taskOps.getInboxItems({
          source_type: sourceTypes as any,
          priority: args.priority === 'all' ? undefined : args.priority as any,
          unacknowledged_only: args.unacknowledged_only,
          limit: args.limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  inbox_items: inboxItems.map(t => ({
                    id: t.id,
                    title: t.title,
                    source: t.source_type || (t.sentry_issue_id ? 'sentry' : (t.github_issue_id ? 'github' : (t.tags?.some((tag: any) => tag.name === 'ci') ? 'ci' : 'manual'))),
                    priority: t.priority,
                    status: t.status,
                    project: t.project_tag,
                    created_at: t.created_at,
                    acknowledged: t.context_notes?.includes('[AI_ACKNOWLEDGED]') || false,
                    // Include relevant integration details
                    sentry_count: t.sentry_error_count,
                    github_issue: t.github_issue_number,
                    github_repo: t.github_repo,
                  })),
                  count: inboxItems.length,
                  filter: { source: args.source, priority: args.priority, unacknowledged_only: args.unacknowledged_only },
                  hint: inboxItems.length > 0
                    ? 'Use get_error_details(id) for full context. Use acknowledge_error(id) when addressed.'
                    : 'Inbox is empty!',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // get_inbox_stats - Quick summary of inbox status
    {
      name: 'get_inbox_stats',
      description: 'Get a quick summary of inbox status - counts by source and priority. Check this first to understand what needs attention.',
      inputSchema: z.object({}),
      handler: async (_args, taskOps) => {
        const stats = await taskOps.getInboxStats();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  ...stats,
                  hint: stats.needs_attention
                    ? 'Use get_inbox() to see items that need attention.'
                    : 'Inbox is under control!',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },
  ];
}

// =============================================================================
// LOCAL HELPER FUNCTIONS FOR BULK LOG PROCESSING
// =============================================================================

/**
 * Result interface for grouped errors
 */
interface GroupedError {
  type: string;
  count: number;
  example: string;
  files: string[];
}

/**
 * Result interface for summarizeErrors function
 */
interface SummarizeErrorsResult {
  summary: string;
  error_count: number;
  unique_errors: number;
  grouped_errors: GroupedError[];
}

/**
 * Summarize and deduplicate large error logs (local implementation for bulk log processing)
 * Note: This is different from the shared parseError which handles single errors.
 * This function handles bulk log output with multiple errors.
 */
function summarizeErrorsLocal(logText: string, maxLines: number = 100): SummarizeErrorsResult {
  // Error type patterns to detect
  const errorTypePatterns: { type: string; pattern: RegExp }[] = [
    { type: 'TypeError', pattern: /TypeError:\s*(.+)/i },
    { type: 'SyntaxError', pattern: /SyntaxError:\s*(.+)/i },
    { type: 'ReferenceError', pattern: /ReferenceError:\s*(.+)/i },
    { type: 'RangeError', pattern: /RangeError:\s*(.+)/i },
    { type: 'EvalError', pattern: /EvalError:\s*(.+)/i },
    { type: 'URIError', pattern: /URIError:\s*(.+)/i },
    { type: 'AggregateError', pattern: /AggregateError:\s*(.+)/i },
    { type: 'InternalError', pattern: /InternalError:\s*(.+)/i },
    { type: 'AssertionError', pattern: /AssertionError:\s*(.+)/i },
    { type: 'ValidationError', pattern: /ValidationError:\s*(.+)/i },
    { type: 'NetworkError', pattern: /NetworkError:\s*(.+)/i },
    { type: 'TimeoutError', pattern: /TimeoutError:\s*(.+)/i },
    { type: 'ENOENT', pattern: /ENOENT:\s*(.+)/i },
    { type: 'EACCES', pattern: /EACCES:\s*(.+)/i },
    { type: 'ECONNREFUSED', pattern: /ECONNREFUSED:\s*(.+)/i },
    { type: 'ETIMEDOUT', pattern: /ETIMEDOUT:\s*(.+)/i },
    { type: 'ModuleNotFoundError', pattern: /ModuleNotFoundError:\s*(.+)/i },
    { type: 'ImportError', pattern: /ImportError:\s*(.+)/i },
    { type: 'AttributeError', pattern: /AttributeError:\s*(.+)/i },
    { type: 'KeyError', pattern: /KeyError:\s*(.+)/i },
    { type: 'ValueError', pattern: /ValueError:\s*(.+)/i },
    { type: 'IndexError', pattern: /IndexError:\s*(.+)/i },
    { type: 'Error', pattern: /(?:^|\s)Error:\s*(.+)/i },
    { type: 'Warning', pattern: /(?:^|\s)(?:Warning|WARN):\s*(.+)/i },
    { type: 'Failed', pattern: /(?:FAILED|Failed|failed):\s*(.+)/i },
    { type: 'Exception', pattern: /Exception:\s*(.+)/i },
  ];

  // Parse lines
  const lines = logText.split('\n');
  const totalLines = lines.length;

  // Track errors with their occurrences
  interface ErrorInfo {
    type: string;
    message: string;
    normalizedMessage: string;
    files: Set<string>;
    count: number;
    firstOccurrence: number;
    example: string;
  }

  const errorMap = new Map<string, ErrorInfo>();
  let totalErrorCount = 0;

  // File path pattern (supports Windows and Unix paths)
  const filePathPattern =
    /(?:at\s+(?:.*?\s+\()?)?([A-Za-z]:)?([/\\](?!node_modules)[^\s:()]+\.[a-z]+)(?::(\d+))?(?::(\d+))?/gi;
  const nodeModulesPattern = /node_modules/i;

  // Normalize error messages for deduplication
  function normalizeMessage(msg: string): string {
    return msg
      .replace(/['"`].*?['"`]/g, '<string>') // Replace string literals
      .replace(/\b\d+\b/g, '<num>') // Replace numbers
      .replace(/0x[0-9a-fA-F]+/g, '<hex>') // Replace hex values
      .replace(/\{[^}]*\}/g, '<obj>') // Replace object literals
      .replace(/\[[^\]]*\]/g, '<arr>') // Replace array literals
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        '<uuid>'
      ) // Replace UUIDs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length for comparison
  }

  // Extract file paths from a line (excluding node_modules)
  function extractAppFiles(line: string): string[] {
    const files: string[] = [];
    const matches = line.matchAll(filePathPattern);
    for (const match of matches) {
      const fullPath = (match[1] || '') + match[2];
      if (!nodeModulesPattern.test(fullPath)) {
        const lineNum = match[3] ? `:${match[3]}` : '';
        files.push(fullPath + lineNum);
      }
    }
    return files;
  }

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Try to match error types
    for (const { type, pattern } of errorTypePatterns) {
      const match = line.match(pattern);
      if (match) {
        totalErrorCount++;
        const message = match[1] || line;
        const normalized = normalizeMessage(message);
        const key = `${type}:${normalized}`;

        // Extract files from this line and surrounding context (next 5 lines for stack trace)
        const contextLines = lines.slice(i, Math.min(i + 6, lines.length));
        const files = new Set<string>();
        for (const contextLine of contextLines) {
          extractAppFiles(contextLine).forEach((f) => files.add(f));
        }

        if (errorMap.has(key)) {
          const existing = errorMap.get(key)!;
          existing.count++;
          files.forEach((f) => existing.files.add(f));
        } else {
          // Build example with stack trace (filtered)
          let example = line;
          for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            const stackLine = lines[j];
            if (
              stackLine.trim().startsWith('at ') &&
              !nodeModulesPattern.test(stackLine)
            ) {
              example += '\n' + stackLine;
            }
          }

          errorMap.set(key, {
            type,
            message: message.substring(0, 150),
            normalizedMessage: normalized,
            files,
            count: 1,
            firstOccurrence: i + 1,
            example: example.substring(0, 500),
          });
        }
        break; // Only match first error type per line
      }
    }
  }

  // Convert to grouped result
  const groupedErrors: GroupedError[] = Array.from(errorMap.values())
    .sort((a, b) => b.count - a.count) // Sort by frequency
    .map((e) => ({
      type: e.type,
      count: e.count,
      example: e.example,
      files: Array.from(e.files).slice(0, 5), // Limit files per error
    }));

  // Build summary text
  const summaryLines: string[] = [];
  summaryLines.push(`=== ERROR SUMMARY ===`);
  summaryLines.push(`Total lines processed: ${totalLines}`);
  summaryLines.push(`Total errors found: ${totalErrorCount}`);
  summaryLines.push(`Unique error patterns: ${groupedErrors.length}`);
  summaryLines.push('');

  // Group by error type for high-level summary
  const typeCount = new Map<string, number>();
  for (const err of groupedErrors) {
    typeCount.set(err.type, (typeCount.get(err.type) || 0) + err.count);
  }

  summaryLines.push('--- Errors by Type ---');
  for (const [type, count] of Array.from(typeCount.entries()).sort(
    (a, b) => b[1] - a[1]
  )) {
    summaryLines.push(`  ${type}: ${count}`);
  }
  summaryLines.push('');

  // Add detailed errors (limit based on max_lines)
  summaryLines.push('--- Top Errors (by frequency) ---');
  let currentLines = summaryLines.length;
  const maxDetailedErrors = Math.min(groupedErrors.length, 20);

  for (let i = 0; i < maxDetailedErrors && currentLines < maxLines - 5; i++) {
    const err = groupedErrors[i];
    summaryLines.push('');
    summaryLines.push(`[${i + 1}] ${err.type} (x${err.count})`);

    // Add example lines but respect maxLines
    const exampleLines = err.example.split('\n');
    for (const exLine of exampleLines) {
      if (currentLines >= maxLines - 3) break;
      summaryLines.push(`    ${exLine}`);
      currentLines++;
    }

    if (err.files.length > 0) {
      summaryLines.push(`    Files: ${err.files.join(', ')}`);
    }
    currentLines = summaryLines.length;
  }

  // Truncate if needed
  const summary = summaryLines.slice(0, maxLines).join('\n');

  return {
    summary,
    error_count: totalErrorCount,
    unique_errors: groupedErrors.length,
    grouped_errors: groupedErrors.slice(0, 50), // Limit to top 50
  };
}
