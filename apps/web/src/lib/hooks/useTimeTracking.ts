/**
 * Time Tracking Hooks (Web)
 * Track time spent on tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { taskKeys } from './useTasks';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  notes?: string;
}

export function useTimeTracking(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch time entries for task
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timeEntries', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!taskId,
  });

  // Find active entry
  const activeEntry = entries.find((entry) => !entry.ended_at);
  const isTracking = !!activeEntry;

  // Start timer
  const startTimer = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', taskId] });
    },
  });

  // Stop timer
  const stopTimer = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error('No active timer');

      const endedAt = new Date().toISOString();
      const durationSeconds = Math.floor(
        (new Date(endedAt).getTime() - new Date(activeEntry.started_at).getTime()) / 1000
      );

      const { error } = await supabase
        .from('task_time_entries')
        .update({
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      return durationSeconds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', taskId] });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Delete time entry
  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('task_time_entries').delete().eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', taskId] });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });

  return {
    entries,
    isLoading,
    isTracking,
    activeEntry,
    startTimer: startTimer.mutate,
    startTimerAsync: startTimer.mutateAsync,
    stopTimer: stopTimer.mutate,
    stopTimerAsync: stopTimer.mutateAsync,
    deleteEntry: deleteEntry.mutate,
    deleteEntryAsync: deleteEntry.mutateAsync,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
}
