import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/utils/storage';
import type { Task, Tag, Attachment, TaskFilter, OfflineOperation } from '@vibetasks/shared';

// Re-export types for backwards compatibility
export type { Task, Tag, Attachment, TaskFilter, OfflineOperation };

// ============================================
// STORE INTERFACE
// ============================================

interface TaskState {
  // UI State
  expandedTaskIds: Set<string>;
  selectedFilter: TaskFilter;
  searchQuery: string;
  selectedTags: string[];

  // Archive Preferences
  showArchived: boolean;
  autoArchiveDays: number; // 0 = disabled, otherwise archive after N days

  // Offline Queue
  offlineQueue: OfflineOperation[];

  // Actions - UI State
  toggleTaskExpanded: (taskId: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tagId: string) => void;
  clearSelectedTags: () => void;

  // Actions - Archive
  setShowArchived: (show: boolean) => void;
  setAutoArchiveDays: (days: number) => void;

  // Actions - Offline Queue
  addToOfflineQueue: (operation: OfflineOperation) => void;
  removeFromOfflineQueue: (operationId: string) => void;
  clearOfflineQueue: () => void;

  // Actions - Utility
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  expandedTaskIds: new Set<string>(),
  selectedFilter: 'all' as TaskFilter,
  searchQuery: '',
  selectedTags: [],
  showArchived: false,
  autoArchiveDays: 7, // Default: auto-archive after 7 days
  offlineQueue: [],
};

// ============================================
// STORE
// ============================================

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // UI STATE ACTIONS
      // ========================================

      toggleTaskExpanded: (taskId: string) => {
        const expanded = new Set(get().expandedTaskIds);
        if (expanded.has(taskId)) {
          expanded.delete(taskId);
        } else {
          expanded.add(taskId);
        }
        set({ expandedTaskIds: expanded });
      },

      setFilter: (filter: TaskFilter) => {
        set({ selectedFilter: filter });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      toggleTag: (tagId: string) => {
        const tags = get().selectedTags;
        set({
          selectedTags: tags.includes(tagId)
            ? tags.filter((t) => t !== tagId)
            : [...tags, tagId],
        });
      },

      clearSelectedTags: () => {
        set({ selectedTags: [] });
      },

      // ========================================
      // ARCHIVE ACTIONS
      // ========================================

      setShowArchived: (show: boolean) => {
        set({ showArchived: show });
      },

      setAutoArchiveDays: (days: number) => {
        set({ autoArchiveDays: days });
      },

      // ========================================
      // OFFLINE QUEUE ACTIONS
      // ========================================

      addToOfflineQueue: (operation: OfflineOperation) => {
        set({
          offlineQueue: [...get().offlineQueue, operation],
        });
      },

      removeFromOfflineQueue: (operationId: string) => {
        set({
          offlineQueue: get().offlineQueue.filter((op) => op.id !== operationId),
        });
      },

      clearOfflineQueue: () => {
        set({ offlineQueue: [] });
      },

      // ========================================
      // UTILITY ACTIONS
      // ========================================

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Only persist UI preferences and offline queue
        // Don't persist task data (comes from Supabase)
        selectedFilter: state.selectedFilter,
        selectedTags: state.selectedTags,
        showArchived: state.showArchived,
        autoArchiveDays: state.autoArchiveDays,
        offlineQueue: state.offlineQueue,
        // Don't persist expandedTaskIds (should reset on app restart)
      }),
    }
  )
);

// ============================================
// SELECTORS (for performance optimization)
// ============================================

export const useExpandedTaskIds = () =>
  useTaskStore((state) => state.expandedTaskIds);

export const useSelectedFilter = () =>
  useTaskStore((state) => state.selectedFilter);

export const useSearchQuery = () => useTaskStore((state) => state.searchQuery);

export const useSelectedTags = () => useTaskStore((state) => state.selectedTags);

export const useOfflineQueue = () => useTaskStore((state) => state.offlineQueue);

export const useHasOfflineChanges = () =>
  useTaskStore((state) => state.offlineQueue.length > 0);

export const useShowArchived = () => useTaskStore((state) => state.showArchived);

export const useAutoArchiveDays = () =>
  useTaskStore((state) => state.autoArchiveDays);
