/**
 * Kanban Board Component (Mobile)
 * Displays tasks in three columns: Todo, Vibing, Done
 * Matches web app features:
 * - WIP limit warning for >3 vibing tasks
 * - Short ID badges on cards
 * - History toggle for archived tasks
 * - Quick archive buttons on done cards
 * - Completion time badges
 */

import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { useTaskMutations, useArchivedTasks } from '@/lib/hooks/useTasks';
import { WIP_LIMIT, type Task } from '@vibetasks/shared';

interface KanbanBoardProps {
  tasks: Task[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = Math.min(300, SCREEN_WIDTH * 0.85);

export function KanbanBoard({ tasks, isRefreshing, onRefresh }: KanbanBoardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { updateTaskStatus } = useTaskMutations();
  const { data: archivedTasks } = useArchivedTasks();
  const scrollViewRef = useRef<ScrollView>(null);

  // State for history toggle
  const [showHistory, setShowHistory] = useState(false);

  // Group tasks by status (excluding archived tasks from main board)
  const { todoTasks, vibingTasks, doneTasks } = useMemo(() => {
    const todo: Task[] = [];
    const vibing: Task[] = [];
    const done: Task[] = [];

    tasks.forEach((task) => {
      const status = task.status || (task.completed ? 'done' : 'todo');
      // Skip archived tasks - they show in history section
      if (status === 'archived') {
        return;
      }
      if (status === 'vibing') {
        vibing.push(task);
      } else if (status === 'done' || task.completed) {
        done.push(task);
      } else {
        todo.push(task);
      }
    });

    return { todoTasks: todo, vibingTasks: vibing, doneTasks: done };
  }, [tasks]);

  const archivedTasksList = archivedTasks || [];
  const isOverWipLimit = vibingTasks.length > WIP_LIMIT;

  // Create shortId mapping for all tasks (1-99) - vibing first, then todo, done, archived
  const taskShortIdMap = useMemo(() => {
    const allDisplayTasks = [...vibingTasks, ...todoTasks, ...doneTasks, ...archivedTasksList];
    const map = new Map<string, number>();
    allDisplayTasks.slice(0, 99).forEach((task, index) => {
      map.set(task.id, index + 1);
    });
    return map;
  }, [vibingTasks, todoTasks, doneTasks, archivedTasksList]);

  // Handle status change (including archived)
  const handleStatusChange = useCallback(
    (taskId: string, newStatus: 'todo' | 'vibing' | 'done' | 'archived') => {
      haptics.trigger(newStatus === 'done' ? 'success' : newStatus === 'archived' ? 'medium' : 'light');
      updateTaskStatus.mutate({ taskId, status: newStatus });
    },
    [updateTaskStatus, haptics]
  );

  // Toggle history section
  const toggleHistory = () => {
    haptics.trigger('light');
    setShowHistory(!showHistory);
  };

  return (
    <View style={styles.container}>
      {/* WIP Limit Warning */}
      {isOverWipLimit && (
        <View style={[styles.wipWarning, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <View style={styles.wipWarningContent}>
            <Text style={[styles.wipWarningTitle, { color: '#F59E0B' }]}>
              WIP Limit Exceeded
            </Text>
            <Text style={[styles.wipWarningText, { color: colors.textSecondary }]}>
              You have {vibingTasks.length} tasks in progress. Research shows 3+ concurrent tasks
              = 40% productivity loss. Focus on finishing before starting new work.
            </Text>
          </View>
        </View>
      )}

      {/* History Toggle Button */}
      <View style={styles.historyToggleContainer}>
        <Pressable
          onPress={toggleHistory}
          style={[
            styles.historyToggle,
            { 
              backgroundColor: showHistory ? colors.primary : colors.surface,
              borderColor: showHistory ? colors.primary : colors.border,
            }
          ]}
        >
          {showHistory ? (
            <>
              <Ionicons name="eye-off-outline" size={14} color="#fff" />
              <Text style={[styles.historyToggleText, { color: '#fff' }]}>
                Hide History
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.historyToggleText, { color: colors.textSecondary }]}>
                Show History ({archivedTasksList.length})
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Kanban Columns */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsContainer}
        snapToInterval={COLUMN_WIDTH + tokens.spacing.sm * 2}
        decelerationRate="fast"
      >
        {/* Todo Column */}
        <KanbanColumn
          title="Todo"
          subtitle="Ready to start when you have energy"
          count={todoTasks.length}
          color="gray"
          columnId="todo"
        >
          {todoTasks.length === 0 ? (
            <View style={styles.emptyColumn}>
              <Ionicons name="checkbox-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tasks waiting
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Add a task to get started
              </Text>
            </View>
          ) : (
            todoTasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                shortId={taskShortIdMap.get(task.id)}
              />
            ))
          )}
        </KanbanColumn>

        {/* Vibing Column */}
        <KanbanColumn
          title="Vibing"
          subtitle={`Currently working on (limit: ${WIP_LIMIT})`}
          count={vibingTasks.length}
          color="purple"
          columnId="vibing"
          isWarning={isOverWipLimit}
        >
          {vibingTasks.length === 0 ? (
            <View style={styles.emptyColumn}>
              <Ionicons name="flash-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nothing in progress
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Tap "Start" on a task to begin
              </Text>
            </View>
          ) : (
            vibingTasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                isVibing
                shortId={taskShortIdMap.get(task.id)}
              />
            ))
          )}
        </KanbanColumn>

        {/* Done Column */}
        <KanbanColumn
          title="Done"
          subtitle="Recently completed, archive when ready"
          count={doneTasks.length}
          color="green"
          columnId="done"
        >
          {doneTasks.length === 0 ? (
            <View style={styles.emptyColumn}>
              <Ionicons name="trophy-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No completed tasks yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Finish a task to see it here
              </Text>
            </View>
          ) : (
            <>
              {doneTasks.slice(0, 10).map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  isDone
                  shortId={taskShortIdMap.get(task.id)}
                />
              ))}
              {doneTasks.length > 10 && (
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                  +{doneTasks.length - 10} more completed
                </Text>
              )}
            </>
          )}

          {/* View History Link (when history is hidden) */}
          {!showHistory && archivedTasksList.length > 0 && (
            <Pressable onPress={toggleHistory} style={styles.viewHistoryLink}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.viewHistoryText, { color: colors.textSecondary }]}>
                View History ({archivedTasksList.length})
              </Text>
            </Pressable>
          )}
        </KanbanColumn>

        {/* History/Archived Column (optional) */}
        {showHistory && (
          <KanbanColumn
            title="History"
            subtitle="Older completed tasks, stored for reference"
            count={archivedTasksList.length}
            color="slate"
            columnId="archived"
          >
            {archivedTasksList.length === 0 ? (
              <View style={styles.emptyColumn}>
                <Ionicons name="archive-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No archived tasks
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                  Archive done tasks to move them here
                </Text>
              </View>
            ) : (
              <>
                {archivedTasksList.slice(0, 15).map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    isDone
                    isArchived
                    shortId={taskShortIdMap.get(task.id)}
                  />
                ))}
                {archivedTasksList.length > 15 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    +{archivedTasksList.length - 15} more in history
                  </Text>
                )}
              </>
            )}
          </KanbanColumn>
        )}
      </ScrollView>

      {/* Hint */}
      <View style={styles.dragHint}>
        <Ionicons name="hand-left-outline" size={12} color={colors.textTertiary} />
        <Text style={[styles.dragHintText, { color: colors.textTertiary }]}>
          Use action buttons to move tasks between columns
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wipWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: tokens.spacing.sm,
  },
  wipWarningContent: {
    flex: 1,
  },
  wipWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  wipWarningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  historyToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  columnsContainer: {
    paddingHorizontal: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
  },
  emptyColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: tokens.spacing.sm,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  viewHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dragHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  dragHintText: {
    fontSize: 11,
  },
});
