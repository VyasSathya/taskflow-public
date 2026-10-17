import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import * as taskService from '@/lib/services/task-service';
import { useTaskStore, type Task, type TaskFilter, type Tag } from '@/lib/stores/task-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { TaskStatus } from '@vibetasks/shared';

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
  archived: () => [...taskKeys.all, 'archived'] as const,
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
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Fetch archived tasks
 */
export function useArchivedTasks() {
  return useQuery({
    queryKey: taskKeys.archived(),
    queryFn: () => taskService.getArchivedTasks(),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
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
  const addToOfflineQueue = useTaskStore((state) => state.addToOfflineQueue);

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

      // Add to offline queue
      addToOfflineQueue({
        id: `offline-${Date.now()}`,
        type: 'create',
        task: variables,
        timestamp: Date.now(),
      });
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

      addToOfflineQueue({
        id: `offline-${Date.now()}`,
        type: 'update',
        task: { id: variables.id, ...variables.updates },
        timestamp: Date.now(),
      });
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

      addToOfflineQueue({
        id: `offline-${Date.now()}`,
        type: 'delete',
        task: { id: taskId },
        timestamp: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Toggle task completion (legacy, prefer updateTaskStatus)
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
                status: completed ? 'done' : 'todo',
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

  // Update task status (todo -> vibing -> done -> archived)
  const updateTaskStatus = useMutation({
    mutationFn: ({
      taskId,
      status,
      contextNotes,
    }: {
      taskId: string;
      status: TaskStatus;
      contextNotes?: string;
    }) => taskService.updateTaskStatus(taskId, status, contextNotes),
    onMutate: async ({ taskId, status, contextNotes }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('all'));

      // Optimistically update
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                completed: status === 'done' || status === 'archived',
                completed_at: status === 'done' ? new Date().toISOString() : task.completed_at,
                archived_at: status === 'archived' ? new Date().toISOString() : undefined,
                context_notes: contextNotes ?? task.context_notes,
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
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  // Archive task
  const archiveTask = useMutation({
    mutationFn: (taskId: string) => taskService.archiveTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list('completed'));

      // Optimistically remove from completed list
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] = []) =>
        old.filter((task) => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list('completed'), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  // Unarchive task
  const unarchiveTask = useMutation({
    mutationFn: (taskId: string) => taskService.unarchiveTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.archived() });

      const previousArchived = queryClient.getQueryData(taskKeys.archived());

      // Optimistically remove from archived list
      queryClient.setQueryData(taskKeys.archived(), (old: Task[] = []) =>
        old.filter((task) => task.id !== taskId)
      );

      return { previousArchived };
    },
    onError: (error, taskId, context) => {
      if (context?.previousArchived) {
        queryClient.setQueryData(taskKeys.archived(), context.previousArchived);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  // Archive all completed tasks
  const archiveAllCompleted = useMutation({
    mutationFn: () => taskService.archiveAllCompleted(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  // Clear all archived tasks
  const clearArchivedTasks = useMutation({
    mutationFn: () => taskService.clearArchivedTasks(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: taskKeys.archived() });

      const previousArchived = queryClient.getQueryData(taskKeys.archived());

      // Optimistically clear archived list
      queryClient.setQueryData(taskKeys.archived(), []);

      return { previousArchived };
    },
    onError: (error, variables, context) => {
      if (context?.previousArchived) {
        queryClient.setQueryData(taskKeys.archived(), context.previousArchived);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  // Auto-archive old tasks (uses AUTO_ARCHIVE_HOURS from shared config)
  const autoArchiveOldTasks = useMutation({
    mutationFn: () => taskService.autoArchiveOldTasks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    updateTaskStatus,
    archiveTask,
    unarchiveTask,
    archiveAllCompleted,
    clearArchivedTasks,
    autoArchiveOldTasks,
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

  return { createSubtask };
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

/**
 * Subscribe to realtime task updates
 */
export function useTaskSubscription() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime change received:', payload);

          // Invalidate all task queries to refetch
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);
}

// ============================================
// APP INITIALIZATION
// ============================================

/**
 * Initialize app-level task operations when user is authenticated
 * - Seeds default tags for new users
 * - Auto-archives old done tasks
 * Call this once when the main tabs layout mounts
 */
export function useTaskInit() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    // Run initialization tasks in background
    const initTasks = async () => {
      try {
        // Seed default tags for new users (no-op if user already has tags)
        await taskService.seedDefaultTags();
        queryClient.invalidateQueries({ queryKey: taskKeys.tags });
      } catch (error) {
        console.error('Failed to seed default tags:', error);
      }

      try {
        // Auto-archive done tasks older than 24 hours
        await taskService.autoArchiveOldTasks();
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
        queryClient.invalidateQueries({ queryKey: taskKeys.archived() });
      } catch (error) {
        console.error('Failed to auto-archive old tasks:', error);
      }
    };

    initTasks();
  }, [user?.id, queryClient]);
}

// ============================================
// OFFLINE SYNC
// ============================================

/**
 * Process offline queue when connection is restored
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const offlineQueue = useTaskStore((state) => state.offlineQueue);
  const removeFromOfflineQueue = useTaskStore((state) => state.removeFromOfflineQueue);

  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    console.log(`Processing ${offlineQueue.length} offline operations...`);

    for (const operation of offlineQueue) {
      try {
        switch (operation.type) {
          case 'create':
            await taskService.createTask(operation.task);
            break;
          case 'update':
            if (operation.task.id) {
              await taskService.updateTask(operation.task.id, operation.task);
            }
            break;
          case 'delete':
            if (operation.task.id) {
              await taskService.deleteTask(operation.task.id);
            }
            break;
        }

        removeFromOfflineQueue(operation.id);
      } catch (error) {
        console.error('Failed to sync offline operation:', error);
        // Keep in queue for retry
      }
    }

    // Refetch after sync
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  };

  return { processOfflineQueue };
}
