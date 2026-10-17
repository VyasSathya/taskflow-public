import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useToast } from './useToast';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days?: number[]; // For weekly: 0=Sun, 1=Mon, etc. For monthly: 1-31
  time?: string; // HH:mm format
}

interface SetRecurrenceParams {
  taskId: string;
  pattern: RecurrencePattern | null; // null to remove
}

export function useRecurrence() {
  const queryClient = useQueryClient();
  const { show } = useToast();

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
            recurrence_end_date: null,
          })
          .eq('id', taskId);

        if (error) throw error;
        return { removed: true };
      }

      // Set recurrence
      const { error } = await supabase
        .from('tasks')
        .update({
          is_recurring: true,
          recurrence_pattern: pattern,
          // TODO: Generate RRULE from pattern
          recurrence_rule: null,
        })
        .eq('id', taskId);

      if (error) throw error;
      return { pattern };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      if (data.removed) {
        show({ message: 'Recurrence removed', type: 'success' });
      } else {
        const { type, interval } = data.pattern!;
        const desc = interval === 1 ? type : `Every ${interval} ${type}`;
        show({ message: `Repeats ${desc}`, type: 'success' });
      }
    },
    onError: (error: Error) => {
      show({ message: error.message || 'Failed to set recurrence', type: 'error' });
    },
  });

  return { setRecurrence: setRecurrence.mutate, isSettingRecurrence: setRecurrence.isPending };
}
