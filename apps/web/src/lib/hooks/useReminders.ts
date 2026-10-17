/**
 * Reminder Hooks (Web)
 * Set and manage task reminders
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { taskKeys } from './useTasks';

interface SetReminderParams {
  taskId: string;
  taskTitle: string;
  dueDate: Date | null;
  minutesBefore: number;
}

export function useReminders() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const setReminder = useMutation({
    mutationFn: async ({ taskId, taskTitle, dueDate, minutesBefore }: SetReminderParams) => {
      if (!dueDate) {
        throw new Error('Cannot set reminder without a due date');
      }

      if (minutesBefore === -1) {
        // Remove reminder
        const { error } = await supabase
          .from('tasks')
          .update({
            reminder_time: null,
            reminder_minutes_before: null,
            notification_sent: false,
          })
          .eq('id', taskId);

        if (error) throw error;
        return { removed: true };
      }

      // Calculate reminder time
      const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);

      // Update task with reminder
      const { error } = await supabase
        .from('tasks')
        .update({
          reminder_time: reminderTime.toISOString(),
          reminder_minutes_before: minutesBefore,
          notification_sent: false,
        })
        .eq('id', taskId);

      if (error) throw error;

      return { reminderTime };
    },
    onSuccess: (data, variables) => {
      // Invalidate task queries to refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });

  return {
    setReminder: setReminder.mutate,
    setReminderAsync: setReminder.mutateAsync,
    isSettingReminder: setReminder.isPending,
  };
}
