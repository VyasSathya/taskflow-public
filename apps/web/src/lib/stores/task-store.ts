/**
 * Task Store (Zustand)
 * Client-side state management for TaskFlow web
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskFilter } from '@/lib/types';

interface TaskState {
  // UI State
  expandedTaskIds: Set<string>;
  selectedFilter: TaskFilter;
  showArchived: boolean;
  showArchivedColumn: boolean; // For Kanban view

  // Actions
  toggleTaskExpanded: (taskId: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setShowArchived: (show: boolean) => void;
  toggleShowArchived: () => void;
  setShowArchivedColumn: (show: boolean) => void;
  toggleShowArchivedColumn: () => void;
  reset: () => void;
}

const initialState = {
  expandedTaskIds: new Set<string>(),
  selectedFilter: 'all' as TaskFilter,
  showArchived: false,
  showArchivedColumn: false,
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      ...initialState,

      toggleTaskExpanded: (taskId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedTaskIds);
          if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
          } else {
            newExpanded.add(taskId);
          }
          return { expandedTaskIds: newExpanded };
        }),

      setFilter: (filter) => set({ selectedFilter: filter }),

      setShowArchived: (show) => set({ showArchived: show }),

      toggleShowArchived: () =>
        set((state) => ({ showArchived: !state.showArchived })),

      setShowArchivedColumn: (show) => set({ showArchivedColumn: show }),

      toggleShowArchivedColumn: () =>
        set((state) => ({ showArchivedColumn: !state.showArchivedColumn })),

      reset: () => set(initialState),
    }),
    {
      name: 'taskflow-store',
      // Custom serialization for Set
      partialize: (state) => ({
        expandedTaskIds: Array.from(state.expandedTaskIds),
        selectedFilter: state.selectedFilter,
        showArchived: state.showArchived,
        showArchivedColumn: state.showArchivedColumn,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        return {
          ...currentState,
          expandedTaskIds: new Set(persisted.expandedTaskIds || []),
          selectedFilter: persisted.selectedFilter || 'all',
          showArchived: persisted.showArchived ?? false,
          showArchivedColumn: persisted.showArchivedColumn ?? false,
        };
      },
    }
  )
);
