import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notificationService';
import { useToast } from './useToast';

interface SetReminderParams {
  taskId: string;
  taskTitle: string;
  dueDate: Date | null;
  minutesBefore: number; // -1 to remove, 0+ to set
}

export function useReminders() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const setReminder = useMutation({
    mutationFn: async ({ taskId, taskTitle, dueDate, minutesBefore }: SetReminderParams) => {
      // Cancel existing notifications for this task
      await notificationService.cancelTaskNotifications(taskId);

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

      if (!dueDate) {
        throw new Error('Cannot set reminder on task without due date');
      }

      // Calculate reminder time
      const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);

      // Update database
      const { error } = await supabase
        .from('tasks')
        .update({
          reminder_time: reminderTime.toISOString(),
          reminder_minutes_before: minutesBefore,
          notification_sent: false,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Schedule local notification
      const notificationId = await notificationService.scheduleTaskReminder(
        taskId,
        taskTitle,
        dueDate,
        minutesBefore
      );

      return { notificationId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      if (data.removed) {
        show({ message: 'Reminder removed', type: 'success' });
      } else {
        const time = variables.minutesBefore === 0
          ? 'at task time'
          : `${variables.minutesBefore} min before`;
        show({ message: `Reminder set ${time}`, type: 'success' });
      }
    },
    onError: (error: Error) => {
      show({ message: error.message || 'Failed to set reminder', type: 'error' });
    },
  });

  return { setReminder: setReminder.mutate, isSettingReminder: setReminder.isPending };
}
