import { SupabaseClient } from '@supabase/supabase-js';
import { AuthManager } from './auth-manager.js';
import { createSupabaseClient } from './supabase-client.js';

// =============================================================================
// TYPES - Re-exported from @vibetasks/shared for consistency
// =============================================================================
// Note: When @vibetasks/shared is properly built and linked, import from there.
// For now, we define compatible types here that match the shared package.

export type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'archived';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'vibing' | 'done' | 'archived';
export type EnergyLevel = 'low' | 'medium' | 'high';

/**
 * Source type - where the task originated from
 * Matches TaskSourceType in @vibetasks/shared
 */
export type SourceType = 
  | 'manual'           // Created manually by user
  | 'github_bug'       // Bug report from GitHub issue
  | 'github_feedback'  // Feature request/feedback from GitHub
  | 'email_bug'        // Bug report from email
  | 'email_feedback'   // Feature request from email
  | 'slack_bug'        // Bug report from Slack
  | 'slack_feedback'   // Feedback from Slack
  | 'sentry_error'     // Error from Sentry integration
  | 'browser_extension'// Created via browser extension
  | 'vscode_extension' // Created via VS Code extension
  | 'cli'              // Created via CLI
  | 'mcp'              // Created via MCP server
  | 'github_action'    // Created via GitHub Action
  // Legacy aliases for backwards compatibility
  | 'sentry'           // Alias for sentry_error
  | 'ci';              // Alias for github_action

export interface Tag {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  notes?: string;
}

// Alias for consistency with shared package
export type InlineSubtask = Subtask;

export interface Attachment {
  id: string;
  task_id: string;
  user_id?: string;
  file_name: string;
  file_size?: number;
  file_type: string;
  storage_path: string;
  url?: string;
  is_image?: boolean;
  alt_text?: string;
  ai_description?: string;
  created_at?: string;
}

/**
 * Task interface - comprehensive type matching @vibetasks/shared
 * All fields are optional except id and title for flexibility in operations
 */
export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  notes?: string;
  notes_format?: 'html' | 'markdown';
  completed?: boolean;
  completed_at?: string;
  archived_at?: string;
  due_date?: string;
  start_date?: string;
  duration_minutes?: number;
  scheduled_time?: string;
  recurrence_rule?: string;
  recurrence_end?: string;
  priority?: TaskPriority;
  parent_task_id?: string;
  position?: number;
  created_at?: string;
  updated_at?: string;
  tags?: Tag[];
  attachments?: Attachment[];
  subtasks?: Task[];
  subtasks_json?: Subtask[];

  // VibeTasks-specific fields
  status?: TaskStatus;
  project_tag?: string;
  created_by?: 'ai' | 'human';
  context_notes?: string;
  energy_required?: EnergyLevel;
  source_type?: SourceType;

  // GitHub integration fields
  github_issue_id?: number | string;
  github_issue_number?: number;
  github_repo?: string;
  github_url?: string;
  github_labels?: string[];
  github_author?: string;

  // Email integration fields
  email_message_id?: string;
  email_from?: string;
  email_subject?: string;
  email_received_at?: string;

  // Slack integration fields
  slack_message_id?: string;
  slack_channel?: string;
  slack_user?: string;
  slack_ts?: string;
  slack_thread_ts?: string;
  slack_url?: string;

  // Sentry integration fields
  sentry_issue_id?: string;
  sentry_project?: string;
  sentry_error_count?: number;
  sentry_first_seen?: string;
  sentry_last_seen?: string;
  sentry_level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  sentry_url?: string;

  // Error context - parsed error information from @vibetasks/shared parseError
  error_context?: {
    raw_text: string;
    error_type?: string;
    message?: string;
    category?: string;
    file_path?: string;
    line_number?: number;
    column?: number;
    code?: string;
    stack_trace?: string;
    suggestion?: string;
    captured_at: string;
    capture_source?: 'paste' | 'clipboard' | 'terminal' | 'browser' | 'sentry' | 'ci';
  };
}

/**
 * TaskOperations class provides a high-level API for task management
 * Wraps the existing task-service.ts functionality with authentication and configuration
 */
export class TaskOperations {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

/**
   * Create TaskOperations from AuthManager
   * Automatically refreshes expired tokens
   */
  static async fromAuthManager(authManager: AuthManager): Promise<TaskOperations> {
    const supabaseUrl = await authManager.getConfig('supabase_url') || 
      (process.env.SUPABASE_URL || '');
    const supabaseKey = await authManager.getConfig('supabase_key') ||
      (process.env.SUPABASE_ANON_KEY || '');
    
    // Use getValidAccessToken which auto-refreshes expired tokens
    const accessToken = await authManager.getValidAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated or session expired. Run: vibetasks login --browser');
    }

    const supabase = createSupabaseClient({
      supabaseUrl,
      supabaseKey,
      accessToken,
    });

    return new TaskOperations(supabase);
  }

  // ============================================
  // TASK CRUD OPERATIONS
  // ============================================

  async getTasks(filter: TaskFilter = 'all', includeArchived: boolean = false): Promise<Task[]> {
    let query = this.supabase
      .from('tasks')
      .select(`
        *,
        tags:task_tags(tag:tags(*))
      `)
      .is('parent_task_id', null)
      .order('position', { ascending: true });

    // Filter out archived tasks by default
    if (!includeArchived) {
      query = query.neq('status', 'archived');
    }

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      query = query
        .gte('due_date', today.toISOString())
        .lt('due_date', tomorrow.toISOString())
        .eq('completed', false);
    } else if (filter === 'upcoming') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      query = query.gte('due_date', tomorrow.toISOString()).eq('completed', false);
    } else if (filter === 'completed') {
      query = query.eq('completed', true).order('completed_at', { ascending: false });
    } else {
      query = query.eq('completed', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((task: any) => ({
      ...task,
      tags: task.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    })) as Task[];
  }

  async getTask(taskId: string): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select(`
        *,
        tags:task_tags(tag:tags(*)),
        attachments:task_attachments(*)
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;

    return {
      ...data,
      tags: data.tags?.map((t: any) => t.tag).filter(Boolean) || [],
      attachments: data.attachments || [],
      subtasks_json: data.subtasks || [], // DB column is 'subtasks', maps to subtasks_json
    } as Task;
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    // Get current user for user_id
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        notes: task.notes,
        notes_format: task.notes_format || 'markdown',
        due_date: task.due_date,
        start_date: task.start_date,
        duration_minutes: task.duration_minutes,
        scheduled_time: task.scheduled_time,
        recurrence_rule: task.recurrence_rule,
        recurrence_end: task.recurrence_end,
        priority: task.priority || 'none',
        parent_task_id: task.parent_task_id,
        position: task.position || 0,
        subtasks: task.subtasks_json || [], // Inline subtasks as JSON
        // VibeTasks-specific fields
        status: task.status || 'todo',
        project_tag: task.project_tag,
        created_by: task.created_by,
        context_notes: task.context_notes,
        energy_required: task.energy_required,
      })
      .select()
      .single();

    if (error) throw error;

    // Link tags if provided
    if (task.tags && task.tags.length > 0) {
      await this.linkTaskTags(data.id, task.tags.map((t) => t.id));
    }

    return data as Task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.notes_format !== undefined) updateData.notes_format = updates.notes_format;
    if (updates.completed !== undefined) {
      updateData.completed = updates.completed;
      updateData.completed_at = updates.completed ? new Date().toISOString() : null;
    }
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
    if (updates.duration_minutes !== undefined) updateData.duration_minutes = updates.duration_minutes;
    if (updates.scheduled_time !== undefined) updateData.scheduled_time = updates.scheduled_time;
    if (updates.recurrence_rule !== undefined) updateData.recurrence_rule = updates.recurrence_rule;
    if (updates.recurrence_end !== undefined) updateData.recurrence_end = updates.recurrence_end;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.subtasks_json !== undefined) updateData.subtasks = updates.subtasks_json;
    // VibeTasks-specific fields
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.project_tag !== undefined) updateData.project_tag = updates.project_tag;
    if (updates.created_by !== undefined) updateData.created_by = updates.created_by;
    if (updates.context_notes !== undefined) updateData.context_notes = updates.context_notes;
    if (updates.energy_required !== undefined) updateData.energy_required = updates.energy_required;

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Handle tags update if provided
    if (updates.tags !== undefined) {
      await this.unlinkAllTaskTags(taskId);
      if (updates.tags.length > 0) {
        await this.linkTaskTags(taskId, updates.tags.map((t) => t.id));
      }
    }

    return data as Task;
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await this.supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  }

  async completeTask(taskId: string): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        status: 'done',
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  async uncompleteTask(taskId: string): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        completed: false,
        completed_at: null,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  // ============================================
  // ARCHIVE OPERATIONS
  // ============================================

  /**
   * Archive a task - moves it to archived status
   * Typically used for completed tasks you want to hide from views
   */
  async archiveTask(taskId: string): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  /**
   * Unarchive a task - restores it to its previous state (done by default)
   */
  async unarchiveTask(taskId: string, restoreStatus: TaskStatus = 'done'): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        status: restoreStatus,
        archived_at: null,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  /**
   * Get all archived tasks
   */
  async getArchivedTasks(limit: number = 50): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select(`
        *,
        tags:task_tags(tag:tags(*))
      `)
      .eq('status', 'archived')
      .is('parent_task_id', null)
      .order('archived_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((task: any) => ({
      ...task,
      tags: task.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    })) as Task[];
  }

  // ============================================
  // TAG OPERATIONS
  // ============================================

  async getTags(): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Tag[];
  }

  async createTag(name: string, color: string = '#8B5CF6'): Promise<Tag> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('tags')
      .insert({ user_id: user.id, name, color })
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  }

  async linkTaskTags(taskId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const { error } = await this.supabase
      .from('task_tags')
      .insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })));

    if (error) throw error;
  }

  async unlinkAllTaskTags(taskId: string): Promise<void> {
    const { error } = await this.supabase.from('task_tags').delete().eq('task_id', taskId);
    if (error) throw error;
  }

  // ============================================
  // SEARCH & UTILITY
  // ============================================

  async searchTasks(query: string, limit: number = 20, includeArchived: boolean = false): Promise<Task[]> {
    let dbQuery = this.supabase
      .from('tasks')
      .select(`
        *,
        tags:task_tags(tag:tags(*))
      `)
      .ilike('title', `%${query}%`)
      .is('parent_task_id', null)
      .eq('completed', false)
      .order('position', { ascending: true })
      .limit(limit);

    // Filter out archived tasks by default
    if (!includeArchived) {
      dbQuery = dbQuery.neq('status', 'archived');
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    return (data || []).map((task: any) => ({
      ...task,
      tags: task.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    })) as Task[];
  }

  /**
   * Find tag by name (case-insensitive), create if doesn't exist
   */
  async findOrCreateTag(name: string, color?: string): Promise<Tag> {
    const tags = await this.getTags();
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      return existing;
    }

    return await this.createTag(name, color);
  }

  // ============================================
  // ATTACHMENT OPERATIONS
  // ============================================

  /**
   * Get a signed URL for an attachment (valid for 1 hour)
   */
  async getAttachmentUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase
      .storage
      .from('task-attachments')
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Get all attachments for a task with signed URLs
   */
  async getTaskAttachments(taskId: string): Promise<(Attachment & { url: string })[]> {
    const { data, error } = await this.supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId);

    if (error) throw error;

    const attachmentsWithUrls = await Promise.all(
      (data || []).map(async (attachment) => {
        const url = await this.getAttachmentUrl(attachment.storage_path);
        return { ...attachment, url };
      })
    );

    return attachmentsWithUrls;
  }

  // ============================================
  // INBOX OPERATIONS
  // ============================================

  /**
   * Get inbox items - tasks from external sources that need attention
   * Includes: errors (Sentry, CI), feedback (GitHub, Email, Slack)
   * 
   * @param filter.source_type - Filter by source type(s)
   * @param filter.priority - Filter by priority level(s)
   * @param filter.unacknowledged_only - Only show unacknowledged items
   * @param filter.limit - Maximum number of items to return
   */
  async getInboxItems(filter: {
    source_type?: SourceType | SourceType[];
    priority?: TaskPriority | TaskPriority[];
    unacknowledged_only?: boolean;
    limit?: number;
  } = {}): Promise<Task[]> {
    const allTasks = await this.getTasks('all');
    
    // Filter to inbox items (external sources or high-priority errors)
    let inboxTasks = allTasks.filter(t => {
      // Has a source type from an integration
      if (t.source_type && t.source_type !== 'manual') return true;
      
      // Has Sentry data
      if (t.sentry_issue_id) return true;
      
      // Has GitHub data
      if (t.github_issue_id) return true;
      
      // Has email data
      if (t.email_message_id) return true;
      
      // Has Slack data
      if (t.slack_message_id) return true;
      
      // High-priority error tasks (legacy detection)
      if (t.priority === 'high') {
        const title = t.title?.toLowerCase() || '';
        const patterns = ['error', 'bug', 'fix', 'crash', 'fail', 'broken', 'issue'];
        if (patterns.some(p => title.includes(p))) return true;
      }
      
      return false;
    });

    // Apply source_type filter
    if (filter.source_type) {
      const sourceTypes = Array.isArray(filter.source_type) ? filter.source_type : [filter.source_type];
      inboxTasks = inboxTasks.filter(t => {
        // Check explicit source_type
        if (t.source_type && sourceTypes.includes(t.source_type)) return true;
        
        // Infer source from integration fields for legacy tasks
        if (sourceTypes.includes('sentry') && t.sentry_issue_id) return true;
        if (sourceTypes.includes('ci') && t.tags?.some((tag: any) => tag.name === 'ci')) return true;
        if ((sourceTypes.includes('github_bug') || sourceTypes.includes('github_feedback')) && t.github_issue_id) return true;
        
        return false;
      });
    }

    // Apply priority filter
    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      inboxTasks = inboxTasks.filter(t => t.priority && priorities.includes(t.priority));
    }

    // Apply unacknowledged filter
    if (filter.unacknowledged_only) {
      inboxTasks = inboxTasks.filter(t => !t.context_notes?.includes('[AI_ACKNOWLEDGED]'));
    }

    // Sort by created_at desc (newest first)
    inboxTasks.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // Apply limit
    if (filter.limit) {
      inboxTasks = inboxTasks.slice(0, filter.limit);
    }

    return inboxTasks;
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(): Promise<{
    total: number;
    unacknowledged: number;
    by_source: Record<string, number>;
    by_priority: Record<string, number>;
    needs_attention: boolean;
  }> {
    const inboxItems = await this.getInboxItems();
    
    const unacknowledged = inboxItems.filter(t => !t.context_notes?.includes('[AI_ACKNOWLEDGED]'));
    
    // Count by source
    const bySource: Record<string, number> = {
      sentry: 0,
      ci: 0,
      github_bug: 0,
      github_feedback: 0,
      email_bug: 0,
      email_feedback: 0,
      slack_bug: 0,
      slack_feedback: 0,
      manual: 0,
    };
    
    for (const task of inboxItems) {
      if (task.source_type) {
        bySource[task.source_type] = (bySource[task.source_type] || 0) + 1;
      } else if (task.sentry_issue_id) {
        bySource.sentry++;
      } else if (task.github_issue_id) {
        bySource.github_bug++;
      } else if (task.tags?.some((tag: any) => tag.name === 'ci')) {
        bySource.ci++;
      } else {
        bySource.manual++;
      }
    }
    
    // Count by priority
    const byPriority: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };
    
    for (const task of inboxItems) {
      const priority = task.priority || 'none';
      byPriority[priority]++;
    }
    
    return {
      total: inboxItems.length,
      unacknowledged: unacknowledged.length,
      by_source: bySource,
      by_priority: byPriority,
      needs_attention: unacknowledged.length > 3 || byPriority.high > 0,
    };
  }
}
