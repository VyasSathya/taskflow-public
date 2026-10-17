/**
 * Task Service (Web)
 * Wraps shared task service with web's Supabase client
 *
 * VibeTasks Status Flow: todo -> vibing -> done
 */

import { createClient } from '@/lib/supabase/client';
import { createTaskService } from '@/lib/shared/services';

// Create a fresh client for each call to ensure session is available
const getTaskService = () => createTaskService(createClient());

// Re-export all methods, creating fresh client each time
export const getTasks = (...args: Parameters<ReturnType<typeof createTaskService>['getTasks']>) =>
  getTaskService().getTasks(...args);
export const getTask = (...args: Parameters<ReturnType<typeof createTaskService>['getTask']>) =>
  getTaskService().getTask(...args);
export const createTask = (...args: Parameters<ReturnType<typeof createTaskService>['createTask']>) =>
  getTaskService().createTask(...args);
export const updateTask = (...args: Parameters<ReturnType<typeof createTaskService>['updateTask']>) =>
  getTaskService().updateTask(...args);
export const deleteTask = (...args: Parameters<ReturnType<typeof createTaskService>['deleteTask']>) =>
  getTaskService().deleteTask(...args);
export const toggleTaskCompletion = (...args: Parameters<ReturnType<typeof createTaskService>['toggleTaskCompletion']>) =>
  getTaskService().toggleTaskCompletion(...args);
export const updateTaskStatus = (...args: Parameters<ReturnType<typeof createTaskService>['updateTaskStatus']>) =>
  getTaskService().updateTaskStatus(...args);
export const getTags = (...args: Parameters<ReturnType<typeof createTaskService>['getTags']>) =>
  getTaskService().getTags(...args);
export const createTag = (...args: Parameters<ReturnType<typeof createTaskService>['createTag']>) =>
  getTaskService().createTag(...args);
export const linkTaskTags = (...args: Parameters<ReturnType<typeof createTaskService>['linkTaskTags']>) =>
  getTaskService().linkTaskTags(...args);
export const unlinkAllTaskTags = (...args: Parameters<ReturnType<typeof createTaskService>['unlinkAllTaskTags']>) =>
  getTaskService().unlinkAllTaskTags(...args);
export const createSubtask = (...args: Parameters<ReturnType<typeof createTaskService>['createSubtask']>) =>
  getTaskService().createSubtask(...args);
export const updateInlineSubtasks = (...args: Parameters<ReturnType<typeof createTaskService>['updateInlineSubtasks']>) =>
  getTaskService().updateInlineSubtasks(...args);
export const searchTasks = (...args: Parameters<ReturnType<typeof createTaskService>['searchTasks']>) =>
  getTaskService().searchTasks(...args);
export const archiveTask = (...args: Parameters<ReturnType<typeof createTaskService>['archiveTask']>) =>
  getTaskService().archiveTask(...args);
export const unarchiveTask = (...args: Parameters<ReturnType<typeof createTaskService>['unarchiveTask']>) =>
  getTaskService().unarchiveTask(...args);
export const seedDefaultTags = () =>
  getTaskService().seedDefaultTags();

// Also export the service directly for cases where multiple calls are made
export const taskService = getTaskService();
