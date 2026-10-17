/**
 * Recurrence Hooks (Web)
 * Manage recurring task patterns
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { taskKeys } from './useTasks';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days?: number[]; // 0 = Sunday, 6 = Saturday
  time?: string; // HH:mm format
}

interface SetRecurrenceParams {
  taskId: string;
  pattern: RecurrencePattern | null;
}

export function useRecurrence() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const setRecurrence = useMutation({
    mutationFn: async ({ taskId, pattern }: SetRecurrenceParams) => {
      if (!pattern) {
        // Remove recurrence
        const { error } = await supabase
          .from('tasks')
          .update({
            is_recurring: false,
            recurrence_pattern: null,
            recurrence_rule: null,
          })
          .eq('id', taskId);

        if (error) throw error;
        return { removed: true };
      }

      // Update task with recurrence pattern
      const { error } = await supabase
        .from('tasks')
        .update({
          is_recurring: true,
          recurrence_pattern: pattern,
        })
        .eq('id', taskId);

      if (error) throw error;

      return { pattern };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });

  return {
    setRecurrence: setRecurrence.mutate,
    setRecurrenceAsync: setRecurrence.mutateAsync,
    isSettingRecurrence: setRecurrence.isPending,
  };
}
