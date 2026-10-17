import { View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { TaskCard } from './TaskCard';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import type { Task } from '@vibetasks/shared';

interface SwipeableTaskCardProps {
  task: Task;
  onPress?: () => void;
  /** Show archive action instead of complete for completed tasks */
  showArchiveAction?: boolean;
  /** Show unarchive action for archived tasks */
  showUnarchiveAction?: boolean;
  /** Short ID for easy reference (1-99) */
  shortId?: number;
}

export function SwipeableTaskCard({
  task,
  onPress,
  showArchiveAction = false,
  showUnarchiveAction = false,
  shortId,
}: SwipeableTaskCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { updateTaskStatus, deleteTask, archiveTask, unarchiveTask } = useTaskMutations();

  // Derive status for backwards compatibility
  const status = task.status || (task.completed ? 'done' : 'todo');
  const isDone = status === 'done';
  const isArchived = status === 'archived';

  const handleComplete = () => {
    haptics.trigger('success');
    // Toggle between done and todo
    updateTaskStatus.mutate({
      taskId: task.id,
      status: isDone ? 'todo' : 'done',
    });
  };

  const handleDelete = () => {
    haptics.trigger('heavy');
    deleteTask.mutate(task.id);
  };

  const handleArchive = () => {
    haptics.trigger('medium');
    archiveTask.mutate(task.id);
  };

  const handleUnarchive = () => {
    haptics.trigger('success');
    unarchiveTask.mutate(task.id);
  };

  // Right swipe action - changes based on task state
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    // For archived tasks: show unarchive (restore)
    if (showUnarchiveAction || isArchived) {
      return (
        <View style={[styles.rightAction, { backgroundColor: colors.info }]}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="arrow-undo-circle" size={32} color="#fff" />
          </Animated.View>
        </View>
      );
    }

    // For completed tasks: show archive
    if (showArchiveAction || isDone) {
      return (
        <View style={[styles.rightAction, { backgroundColor: colors.warning }]}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="archive" size={32} color="#fff" />
          </Animated.View>
        </View>
      );
    }

    // Default: show complete
    return (
      <View style={[styles.rightAction, { backgroundColor: colors.success }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="checkmark-circle" size={32} color="#fff" />
        </Animated.View>
      </View>
    );
  };

  // Left swipe action (delete)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.leftAction, { backgroundColor: colors.error }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={32} color="#fff" />
        </Animated.View>
      </View>
    );
  };

  const handleSwipeOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // For archived tasks: unarchive
      if (showUnarchiveAction || isArchived) {
        handleUnarchive();
      }
      // For completed tasks: archive
      else if (showArchiveAction || isDone) {
        handleArchive();
      }
      // Default: complete
      else {
        handleComplete();
      }
    } else if (direction === 'left') {
      handleDelete();
    }
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      overshootLeft={false}
      rightThreshold={80}
      leftThreshold={80}
    >
      <TaskCard task={task} onPress={onPress} isArchived={isArchived} shortId={shortId} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightAction: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: tokens.spacing.lg,
    flex: 1,
  },
  leftAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: tokens.spacing.lg,
    flex: 1,
  },
});
