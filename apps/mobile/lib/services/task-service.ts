/**
 * Task Service (Mobile)
 * Wraps shared task service with mobile's Supabase client
 *
 * VibeTasks Status Flow: todo -> vibing -> done -> archived
 */

import { supabase } from '@/lib/supabase/client';
import { createTaskService } from '@vibetasks/shared';

// Ensure Supabase is configured before creating service
if (!supabase) {
  throw new Error(
    'Supabase not configured. Create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const taskService = createTaskService(supabase);

// Re-export all methods for backwards compatibility
export const getTasks = taskService.getTasks.bind(taskService);
export const getTask = taskService.getTask.bind(taskService);
export const createTask = taskService.createTask.bind(taskService);
export const updateTask = taskService.updateTask.bind(taskService);
export const deleteTask = taskService.deleteTask.bind(taskService);
export const toggleTaskCompletion = taskService.toggleTaskCompletion.bind(taskService);
export const updateTaskStatus = taskService.updateTaskStatus.bind(taskService);
export const getTags = taskService.getTags.bind(taskService);
export const createTag = taskService.createTag.bind(taskService);
export const seedDefaultTags = taskService.seedDefaultTags.bind(taskService);
export const linkTaskTags = taskService.linkTaskTags.bind(taskService);
export const unlinkAllTaskTags = taskService.unlinkAllTaskTags.bind(taskService);
export const createSubtask = taskService.createSubtask.bind(taskService);
export const searchTasks = taskService.searchTasks.bind(taskService);

// Archive operations
export const getArchivedTasks = taskService.getArchivedTasks.bind(taskService);
export const archiveTask = taskService.archiveTask.bind(taskService);
export const unarchiveTask = taskService.unarchiveTask.bind(taskService);
export const archiveAllCompleted = taskService.archiveAllCompleted.bind(taskService);
export const clearArchivedTasks = taskService.clearArchivedTasks.bind(taskService);
export const autoArchiveOldTasks = taskService.autoArchiveOldTasks.bind(taskService);
