import { AuthManager, TaskOperations } from '@vibetasks/core';

/**
 * SessionStart hook - Load today's tasks as context for AI
 */
export async function handleSessionStart() {
  try {
    const authManager = new AuthManager();

    // Check if authenticated
    const isAuth = await authManager.isAuthenticated();
    if (!isAuth) {
      // Silently skip if not authenticated
      console.log(JSON.stringify({ additionalContext: '' }));
      return;
    }

    const taskOps = await TaskOperations.fromAuthManager(authManager);

    // Load today's tasks
    const todayTasks = await taskOps.getTasks('today');
    const activeTasks = await taskOps.getTasks('all');

    // Format context for AI
    const context = `# TaskFlow - Your Tasks

## Today's Tasks (${todayTasks.length})
${
  todayTasks.length === 0
    ? 'No tasks due today.'
    : todayTasks
        .map((t) => {
          const priority =
            t.priority && t.priority !== 'none' ? ` [${t.priority.toUpperCase()}]` : '';
          const tags = t.tags && t.tags.length > 0 ? ` #${t.tags.map((tag) => tag.name).join(' #')}` : '';
          return `- [ ] ${t.title}${priority}${tags}`;
        })
        .join('\n')
}

## All Active Tasks (${activeTasks.length})
${
  activeTasks.length === 0
    ? 'No active tasks.'
    : activeTasks
        .slice(0, 10)
        .map((t) => {
          const priority =
            t.priority && t.priority !== 'none' ? ` [${t.priority.toUpperCase()}]` : '';
          const dueDate = t.due_date ? ` (Due: ${t.due_date.split('T')[0]})` : '';
          return `- [ ] ${t.title}${priority}${dueDate}`;
        })
        .join('\n')
}${activeTasks.length > 10 ? `\n...and ${activeTasks.length - 10} more` : ''}

---
You can manage tasks using these MCP tools:
- create_task: Add new tasks
- get_tasks: View tasks by filter
- complete_task: Mark tasks done
- search_tasks: Find tasks
- update_task: Modify tasks
- delete_task: Remove tasks
- log_ai_session: Log what we accomplish together
`.trim();

    // Return context for Claude Code
    console.log(JSON.stringify({ additionalContext: context }));
  } catch (error: any) {
    // Log error to stderr but don't fail
    console.error('TaskFlow SessionStart hook error:', error.message);
    console.log(JSON.stringify({ additionalContext: '' }));
  }
}
