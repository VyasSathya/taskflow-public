/**
 * React Query hooks for Tags
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks';
import type { Tag } from '@/lib/stores/task-store';

// ============================================
// QUERY KEYS
// ============================================

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (userId: string) => [...tagKeys.lists(), userId] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Get all tags for the current user
 */
export function useTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: tagKeys.list(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Tag mutations (create, update, delete, attach, detach)
 */
export function useTagMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Create tag
  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name,
          color,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  // Update tag
  const updateTag = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  // Delete tag
  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  // Attach tag to task
  const attachTagToTask = useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const { error } = await supabase
        .from('task_tags')
        .insert({ task_id: taskId, tag_id: tagId });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both tags and tasks queries
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Detach tag from task
  const detachTagFromTask = useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const { error } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both tags and tasks queries
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    createTag,
    updateTag,
    deleteTag,
    attachTagToTask,
    detachTagFromTask,
  };
}
