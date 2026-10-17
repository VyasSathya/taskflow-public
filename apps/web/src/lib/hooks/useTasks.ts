/**
 * Task Hooks
 * TanStack Query hooks for fetching and mutating tasks
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as taskService from '@/lib/services/task-service';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskFilter, Tag } from '@/lib/types';

// ============================================
// QUERY KEYS
// ============================================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filter: TaskFilter) => [...taskKeys.lists(), filter] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  tags: ['tags'] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch tasks with filter
 */
export function useTasks(filter: TaskFilter = 'all') {
  return useQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => taskService.getTasks(filter),
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => taskService.getTask(taskId),
    enabled: !!taskId,
  });
}

/**
 * Fetch all tags
 */
export function useTags() {
  return useQuery({
    queryKey: taskKeys.tags,
    queryFn: () => taskService.getTags(),
  });
}

/**
 * Search tasks
 */
export function useSearchTasks(query: string) {
  return useQuery({
    queryKey: ['tasks', 'search', query],
    queryFn: () => taskService.searchTasks(query),
    enabled: query.length > 0,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Task mutations (create, update, delete, toggle)
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  // Create task
  const createTask = useMutation({
    mutationFn: (task: Partial<Task>) => taskService.createTask(task),
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update
      queryClient.setQueryData(taskKeys.list('all'), (old: Task[] = []) => [
        {
          id: `temp-${Date.now()}`,
          ...newTask,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Task,
        ...old,
      ]);

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskService.updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        )
      );

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically remove
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.filter((task) => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Toggle task completion
  const toggleTaskCompletion = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskService.toggleTaskCompletion(taskId, completed),
    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed,
                completed_at: completed ? new Date().toISOString() : undefined,
              }
            : task
        )
      );

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Archive task
  const archiveTask = useMutation({
    mutationFn: (taskId: string) => taskService.archiveTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update - move to archived status
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'archived' as const,
                archived_at: new Date().toISOString(),
              }
            : task
        )
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Unarchive task (move back to done)
  const unarchiveTask = useMutation({
    mutationFn: (taskId: string) => taskService.unarchiveTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('archived'));

      // Optimistically update - move to done status
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'done' as const,
                archived_at: undefined,
              }
            : task
        )
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('archived'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    archiveTask,
    unarchiveTask,
  };
}

/**
 * Tag mutations
 */
export function useTagMutations() {
  const queryClient = useQueryClient();

  const createTag = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      taskService.createTag(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.tags });
    },
  });

  return { createTag };
}

/**
 * Subtask mutations
 */
export function useSubtaskMutations(parentTaskId: string) {
  const queryClient = useQueryClient();

  const createSubtask = useMutation({
    mutationFn: ({ title, position }: { title: string; position?: number }) =>
      taskService.createSubtask(parentTaskId, title, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(parentTaskId) });
    },
  });

  /**
   * Update inline subtasks (JSON array in 'subtasks' column)
   * Used for CLI-created subtasks
   */
  const updateInlineSubtasks = useMutation({
    mutationFn: (subtasks: { id: string; title: string; done: boolean; notes?: string }[]) =>
      taskService.updateInlineSubtasks(parentTaskId, subtasks),
    onMutate: async (subtasks) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update subtasks_json
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === parentTaskId ? { ...task, subtasks_json: subtasks } : task
        )
      );

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('all'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(parentTaskId) });
    },
  });

  return { createSubtask, updateInlineSubtasks };
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

/**
 * Handle realtime payload and invalidate queries
 */
function handleRealtimeChange(
  queryClient: ReturnType<typeof useQueryClient>,
  eventType: string,
  payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }
) {
  console.log('[Realtime] Task change received:', eventType, payload);

  // Invalidate all task queries to refetch fresh data
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

  // Also invalidate the specific task detail if we have the ID
  if (payload.new && 'id' in payload.new) {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(payload.new.id as string) });
  }
  if (payload.old && 'id' in payload.old) {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(payload.old.id as string) });
  }
}

/**
 * Subscribe to realtime task updates via broadcast channel
 * Uses trigger-based broadcasting for better scalability
 * Call this hook once in your layout or main dashboard component
 */
export function useTaskSubscription(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      console.log('[Realtime] No userId, skipping subscription');
      return;
    }

    console.log('[Realtime] Setting up broadcast subscription for user:', userId);
    const supabase = createClient();

    // Use private broadcast channel (trigger sends to user:{userId}:tasks)
    const channel = supabase
      .channel(`user:${userId}:tasks`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, ({ payload }) => {
        handleRealtimeChange(queryClient, 'INSERT', payload || {});
      })
      .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        handleRealtimeChange(queryClient, 'UPDATE', payload || {});
      })
      .on('broadcast', { event: 'DELETE' }, ({ payload }) => {
        handleRealtimeChange(queryClient, 'DELETE', payload || {});
      })
      .subscribe(async (status) => {
        console.log('[Realtime] Broadcast subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to tasks channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - check RLS policies on realtime.messages');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from broadcast channel');
      channel.unsubscribe();
    };
  }, [userId, queryClient]);
}
