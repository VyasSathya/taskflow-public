import { TaskOperations } from '@vibetasks/core';

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  annotations?: {
    audience?: ('user' | 'assistant')[];
    priority?: number; // 0.0-1.0, higher = more important
  };
  handler: (taskOps: TaskOperations) => Promise<any>;
}

/**
 * Check if a task is an error task (high priority + certain patterns)
 */
function isErrorTask(task: any): boolean {
  if (task.priority !== 'high') return false;
  const title = task.title?.toLowerCase() || '';
  const patterns = ['error', 'bug', 'fix', 'crash', 'fail', 'broken', 'issue', 'typescript', 'ts'];
  return patterns.some(p => title.includes(p)) || task.sentry_issue_id;
}

export function setupResources(taskOps: TaskOperations): MCPResource[] {
  return [
    // Active tasks resource
    {
      uri: 'taskflow://tasks/active',
      name: 'Active Tasks',
      description: 'All incomplete tasks',
      mimeType: 'application/json',
      handler: async (taskOps) => {
        const tasks = await taskOps.getTasks('all');

        return {
          contents: [
            {
              uri: 'taskflow://tasks/active',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
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

    // Today's tasks resource
    {
      uri: 'taskflow://tasks/today',
      name: 'Today\'s Tasks',
      description: 'Tasks due today',
      mimeType: 'application/json',
      handler: async (taskOps) => {
        const tasks = await taskOps.getTasks('today');

        return {
          contents: [
            {
              uri: 'taskflow://tasks/today',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    tags: t.tags?.map((tag) => tag.name) || [],
                  })),
                  count: tasks.length,
                  date: new Date().toISOString().split('T')[0],
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // Upcoming tasks resource
    {
      uri: 'taskflow://tasks/upcoming',
      name: 'Upcoming Tasks',
      description: 'Tasks due in the future',
      mimeType: 'application/json',
      handler: async (taskOps) => {
        const tasks = await taskOps.getTasks('upcoming');

        return {
          contents: [
            {
              uri: 'taskflow://tasks/upcoming',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
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

    // Error Summary resource (lightweight - just counts)
    {
      uri: 'vibetasks://errors/summary',
      name: 'Error Summary',
      description: 'Current error counts by priority. Check this before asking about specific errors.',
      mimeType: 'application/json',
      annotations: {
        audience: ['assistant'],
        priority: 0.8, // High priority for AI awareness
      },
      handler: async (taskOps) => {
        const allTasks = await taskOps.getTasks('all');
        const errorTasks = allTasks.filter(isErrorTask);
        
        const unacknowledged = errorTasks.filter(t => !t.context_notes?.includes('[AI_ACKNOWLEDGED]'));
        const critical = errorTasks.filter(t => t.title?.toLowerCase().includes('critical') || t.sentry_level === 'fatal');
        const fromSentry = errorTasks.filter(t => t.sentry_issue_id);
        const fromCI = errorTasks.filter(t => t.tags?.some((tag: any) => tag.name === 'ci'));
        
        return {
          contents: [
            {
              uri: 'vibetasks://errors/summary',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total_errors: errorTasks.length,
                  unacknowledged: unacknowledged.length,
                  critical: critical.length,
                  by_source: {
                    sentry: fromSentry.length,
                    ci: fromCI.length,
                    manual: errorTasks.length - fromSentry.length - fromCI.length,
                  },
                  needs_attention: critical.length > 0 || unacknowledged.length > 3,
                  hint: unacknowledged.length > 0 
                    ? 'Use get_errors() tool to see details and acknowledge_error() when addressed.'
                    : 'No unacknowledged errors.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // Error List resource (more detail, still concise)
    {
      uri: 'vibetasks://errors/list',
      name: 'Error List',
      description: 'List of current errors with basic details. Use get_error_details tool for full context.',
      mimeType: 'application/json',
      annotations: {
        audience: ['assistant'],
        priority: 0.6,
      },
      handler: async (taskOps) => {
        const allTasks = await taskOps.getTasks('all');
        const errorTasks = allTasks.filter(isErrorTask);
        
        // Sort by: unacknowledged first, then by created_at desc
        const sorted = errorTasks.sort((a, b) => {
          const aAck = a.context_notes?.includes('[AI_ACKNOWLEDGED]') ? 1 : 0;
          const bAck = b.context_notes?.includes('[AI_ACKNOWLEDGED]') ? 1 : 0;
          if (aAck !== bAck) return aAck - bAck;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        
        return {
          contents: [
            {
              uri: 'vibetasks://errors/list',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  errors: sorted.slice(0, 10).map(t => ({
                    id: t.id,
                    title: t.title,
                    project: t.project_tag,
                    status: t.status,
                    acknowledged: t.context_notes?.includes('[AI_ACKNOWLEDGED]') || false,
                    source: t.sentry_issue_id ? 'sentry' : (t.tags?.some((tag: any) => tag.name === 'ci') ? 'ci' : 'manual'),
                    created: t.created_at,
                    sentry_count: t.sentry_error_count,
                  })),
                  total: errorTasks.length,
                  showing: Math.min(10, errorTasks.length),
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    // Inbox Summary resource - unified view of all external sources
    {
      uri: 'vibetasks://inbox/summary',
      name: 'Inbox Summary',
      description: 'Summary of inbox items from all sources (Sentry, GitHub, Email, Slack, CI). Check this to see what needs attention.',
      mimeType: 'application/json',
      annotations: {
        audience: ['assistant'],
        priority: 0.9, // High priority - AI should check inbox often
      },
      handler: async (taskOps) => {
        const stats = await taskOps.getInboxStats();
        
        return {
          contents: [
            {
              uri: 'vibetasks://inbox/summary',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  ...stats,
                  hint: stats.needs_attention
                    ? 'Use get_inbox() tool to see items that need attention.'
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

    // Inbox List resource - detailed inbox items
    {
      uri: 'vibetasks://inbox/list',
      name: 'Inbox Items',
      description: 'List of inbox items from all external sources. Shows up to 15 items sorted by priority and recency.',
      mimeType: 'application/json',
      annotations: {
        audience: ['assistant'],
        priority: 0.7,
      },
      handler: async (taskOps) => {
        const inboxItems = await taskOps.getInboxItems({ limit: 15 });
        
        return {
          contents: [
            {
              uri: 'vibetasks://inbox/list',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  inbox_items: inboxItems.map(t => ({
                    id: t.id,
                    title: t.title,
                    source: t.source_type || (t.sentry_issue_id ? 'sentry' : (t.github_issue_id ? 'github' : (t.tags?.some((tag: any) => tag.name === 'ci') ? 'ci' : 'manual'))),
                    priority: t.priority,
                    status: t.status,
                    project: t.project_tag,
                    created_at: t.created_at,
                    acknowledged: t.context_notes?.includes('[AI_ACKNOWLEDGED]') || false,
                  })),
                  total: inboxItems.length,
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
