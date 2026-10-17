/**
 * Task Service (Shared)
 * Supabase CRUD operations that work with both mobile and web
 *
 * VibeTasks Status Flow: todo -> vibing -> done -> archived
 */

import type { Task, Tag, TaskFilter, TaskStatus } from '../types';
import { AUTO_ARCHIVE_HOURS } from '../types';

// Using 'any' for supabase client to avoid version conflicts between workspaces
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTaskService(supabase: any) {
  return {
    // ============================================
    // TASK CRUD OPERATIONS
    // ============================================

    async getTasks(filter: TaskFilter = 'all') {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          tags:task_tags(tag:tags(*)),
          attachments:task_attachments(*),
          child_tasks:tasks!parent_task_id(*)
        `)
        .is('parent_task_id', null)
        .order('position', { ascending: true });

      if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        query = query
          .gte('due_date', today.toISOString())
          .lt('due_date', tomorrow.toISOString())
          .neq('status', 'done');
      } else if (filter === 'upcoming') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        query = query.gte('due_date', tomorrow.toISOString()).neq('status', 'done');
      } else if (filter === 'completed') {
        query = query.eq('status', 'done').order('completed_at', { ascending: false });
      } else if (filter === 'archived') {
        query = query.eq('status', 'archived').order('archived_at', { ascending: false });
      } else {
        // 'all' filter shows active tasks (todo, vibing) AND recent done tasks (< 24 hours)
        // Archived tasks are always hidden from 'all' view
        query = query.neq('status', 'archived');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Ensure status field has a default value for backwards compatibility
      // Map DB fields: 'subtasks' column contains JSON, 'child_tasks' is the relation
      return (data || []).map((task: any) => ({
        ...task,
        status: task.status || (task.completed ? 'done' : 'todo'),
        tags: task.tags?.map((t: any) => t.tag).filter(Boolean) || [],
        // Map inline subtasks from DB 'subtasks' column (JSONB) to subtasks_json
        subtasks_json: task.subtasks || [],
        // Map legacy subtask rows (child tasks) to subtasks
        subtasks: task.child_tasks || [],
      })) as Task[];
    },

    async getTask(taskId: string) {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          tags:task_tags(tag:tags(*)),
          attachments:task_attachments(*),
          child_tasks:tasks!parent_task_id(*)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status || (data.completed ? 'done' : 'todo'),
        tags: data.tags?.map((t: any) => t.tag).filter(Boolean) || [],
        // Map inline subtasks from DB 'subtasks' column (JSONB) to subtasks_json
        subtasks_json: data.subtasks || [],
        // Map legacy subtask rows (child tasks) to subtasks
        subtasks: data.child_tasks || [],
      } as Task;
    },

    async createTask(task: Partial<Task>) {
      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build insert data, only including defined fields
      const insertData: Record<string, any> = {
        user_id: user.id,
        title: task.title,
        notes: task.notes,
        notes_format: task.notes_format || 'html',
        status: task.status || 'todo',
        completed: task.status === 'done',
        priority: task.priority || 'none',
        created_by: task.created_by || 'human',
        position: task.position || 0,
      };
      
      // Only include optional fields if they have values
      if (task.due_date) insertData.due_date = task.due_date;
      if (task.project_tag) insertData.project_tag = task.project_tag;
      if (task.context_notes) insertData.context_notes = task.context_notes;
      if (task.energy_required) insertData.energy_required = task.energy_required;
      if (task.parent_task_id) insertData.parent_task_id = task.parent_task_id;
      if (task.source_type) insertData.source_type = task.source_type;
      // Error & Feedback context (JSONB columns) - only if DB supports them
      if ((task as any).error_context) insertData.error_context = (task as any).error_context;
      if ((task as any).feedback_context) insertData.feedback_context = (task as any).feedback_context;

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (task.tags && task.tags.length > 0) {
        await this.linkTaskTags(data.id, task.tags.map((t) => t.id));
      }

      return data as Task;
    },

    async updateTask(taskId: string, updates: Partial<Task>) {
      // Build update object, syncing status and completed
      const updateData: Record<string, any> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.notes_format !== undefined) updateData.notes_format = updates.notes_format;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.project_tag !== undefined) updateData.project_tag = updates.project_tag;
      if (updates.context_notes !== undefined) updateData.context_notes = updates.context_notes;
      if (updates.energy_required !== undefined) updateData.energy_required = updates.energy_required;
      if (updates.source_type !== undefined) updateData.source_type = updates.source_type;
      // Error & Feedback context (JSONB columns)
      if ((updates as any).error_context !== undefined) updateData.error_context = (updates as any).error_context;
      if ((updates as any).feedback_context !== undefined) updateData.feedback_context = (updates as any).feedback_context;
      if ((updates as any).acknowledgment !== undefined) updateData.acknowledgment = (updates as any).acknowledgment;

      // Sync status and completed fields
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        updateData.completed = updates.status === 'done' || updates.status === 'archived';
        if (updates.status === 'done') {
          updateData.completed_at = new Date().toISOString();
        } else if (updates.status === 'archived') {
          updateData.archived_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
          updateData.archived_at = null;
        }
      } else if (updates.completed !== undefined) {
        updateData.completed = updates.completed;
        updateData.status = updates.completed ? 'done' : 'todo';
        updateData.completed_at = updates.completed ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      if (updates.tags !== undefined) {
        await this.unlinkAllTaskTags(taskId);
        if (updates.tags && updates.tags.length > 0) {
          await this.linkTaskTags(taskId, updates.tags.map((t) => t.id));
        }
      }

      return data as Task;
    },

    async deleteTask(taskId: string) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },

    /**
     * Toggle task completion (legacy support)
     * Prefer updateTaskStatus for new code
     */
    async toggleTaskCompletion(taskId: string, completed: boolean) {
      return this.updateTaskStatus(taskId, completed ? 'done' : 'todo');
    },

    /**
     * Update task status (todo -> vibing -> done -> archived)
     * This is the preferred method for status changes
     */
    async updateTaskStatus(taskId: string, status: TaskStatus, contextNotes?: string) {
      const updateData: Record<string, any> = {
        status,
        completed: status === 'done' || status === 'archived',
      };

      if (status === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'archived') {
        updateData.archived_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
        updateData.archived_at = null;
      }

      // Optionally update context notes when pausing work
      if (contextNotes !== undefined) {
        updateData.context_notes = contextNotes;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },

    /**
     * Archive a task manually
     */
    async archiveTask(taskId: string) {
      return this.updateTaskStatus(taskId, 'archived');
    },

    /**
     * Unarchive a task (move back to done)
     */
    async unarchiveTask(taskId: string) {
      return this.updateTaskStatus(taskId, 'done');
    },

    /**
     * Auto-archive done tasks older than AUTO_ARCHIVE_HOURS (24 hours)
     * Call this on app load or periodically
     */
    async autoArchiveOldTasks() {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - AUTO_ARCHIVE_HOURS);

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('status', 'done')
        .lt('completed_at', cutoffDate.toISOString())
        .select();

      if (error) throw error;
      return data as Task[];
    },

    // ============================================
    // TAG OPERATIONS
    // ============================================

    async getTags() {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Tag[];
    },

    async createTag(name: string, color: string = '#8B5CF6') {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name, color })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },

    /**
     * Seed default dev-focused tags for new users
     * Only creates tags if user has none
     */
    async seedDefaultTags() {
      // Check if user already has tags
      const { data: existingTags, error: checkError } = await supabase
        .from('tags')
        .select('id')
        .limit(1);

      if (checkError) throw checkError;

      // If user already has tags, skip seeding
      if (existingTags && existingTags.length > 0) {
        return [];
      }

      // Dev-focused default tags
      const defaultTags = [
        { name: 'backend', color: '#3B82F6' },   // Blue
        { name: 'frontend', color: '#10B981' },  // Green
        { name: 'ai', color: '#8B5CF6' },        // Purple
        { name: 'ui', color: '#F59E0B' },        // Amber
        { name: 'ux', color: '#EC4899' },        // Pink
        { name: 'api', color: '#6366F1' },       // Indigo
        { name: 'db', color: '#14B8A6' },        // Teal
        { name: 'devops', color: '#EF4444' },    // Red
        { name: 'testing', color: '#84CC16' },   // Lime
        { name: 'docs', color: '#9CA3AF' },      // Gray
      ];

      const { data, error } = await supabase
        .from('tags')
        .insert(defaultTags)
        .select();

      if (error) throw error;
      return data as Tag[];
    },

    async linkTaskTags(taskId: string, tagIds: string[]) {
      const { error } = await supabase
        .from('task_tags')
        .insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })));

      if (error) throw error;
    },

    async unlinkAllTaskTags(taskId: string) {
      const { error } = await supabase.from('task_tags').delete().eq('task_id', taskId);
      if (error) throw error;
    },

    // ============================================
    // SUBTASK OPERATIONS
    // ============================================

    /**
     * Create a legacy subtask (separate task row with parent_task_id)
     */
    async createSubtask(parentTaskId: string, title: string, position: number = 0) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          parent_task_id: parentTaskId,
          position,
          priority: 'none',
          notes_format: 'html',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },

    /**
     * Update inline subtasks (JSON array stored in 'subtasks' column)
     * Used by CLI-created subtasks
     */
    async updateInlineSubtasks(taskId: string, subtasks: { id: string; title: string; done: boolean; notes?: string }[]) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ subtasks }) // 'subtasks' is the actual DB column name (JSONB)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    async searchTasks(query: string) {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          tags:task_tags(tag:tags(*)),
          attachments:task_attachments(*),
          child_tasks:tasks!parent_task_id(*)
        `)
        .ilike('title', `%${query}%`)
        .is('parent_task_id', null)
        .eq('completed', false)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || []).map((task: any) => ({
        ...task,
        tags: task.tags?.map((t: any) => t.tag).filter(Boolean) || [],
        subtasks_json: task.subtasks || [],
        subtasks: task.child_tasks || [],
      })) as Task[];
    },
  };
}
