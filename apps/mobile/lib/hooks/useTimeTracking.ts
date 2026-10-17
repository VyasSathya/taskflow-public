import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  notes?: string;
}

export function useTimeTracking(taskId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { show } = useToast();

  // Fetch time entries for this task
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

  // Check if there's an active entry (no ended_at)
  const activeEntry = entries.find(entry => !entry.ended_at);
  const isTracking = !!activeEntry;

  // Start timer
  const startTimer = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (activeEntry) throw new Error('Timer already running');

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
      show({ message: 'Timer started', type: 'success' });
    },
    onError: (error: Error) => {
      show({ message: error.message || 'Failed to start timer', type: 'error' });
    },
  });

  // Stop timer
  const stopTimer = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error('No active timer');

      const endedAt = new Date().toISOString();
      const startedAt = new Date(activeEntry.started_at);
      const durationSeconds = Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 1000);

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
    onSuccess: (durationSeconds) => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      show({
        message: `Tracked ${minutes}m ${seconds}s`,
        type: 'success',
      });
    },
    onError: (error: Error) => {
      show({ message: error.message || 'Failed to stop timer', type: 'error' });
    },
  });

  // Delete entry
  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      show({ message: 'Entry deleted', type: 'success' });
    },
    onError: (error: Error) => {
      show({ message: error.message || 'Failed to delete entry', type: 'error' });
    },
  });

  return {
    entries,
    isLoading,
    isTracking,
    activeEntry,
    startTimer: startTimer.mutate,
    stopTimer: stopTimer.mutate,
    deleteEntry: deleteEntry.mutate,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
}
