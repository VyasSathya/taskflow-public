import { View, Text, Pressable, TextInput, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import type { Task } from '@/lib/stores/task-store';

interface SubtaskListProps {
  parentTaskId: string;
  subtasks: Task[];
}

export function SubtaskList({ parentTaskId, subtasks }: SubtaskListProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { createTask, toggleTaskCompletion, deleteTask } = useTaskMutations();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      haptics.light();
      await createTask.mutateAsync({
        title: newSubtaskTitle.trim(),
        parent_task_id: parentTaskId,
        completed: false,
      });

      setNewSubtaskTitle('');
      setIsAdding(false);
      haptics.success();
    } catch (error) {
      haptics.trigger('error');
      Alert.alert('Error', 'Failed to create subtask');
    }
  };

  const handleToggleSubtask = (subtask: Task) => {
    haptics.selection();
    toggleTaskCompletion.mutate({
      taskId: subtask.id,
      completed: !subtask.completed,
    });
  };

  const handleDeleteSubtask = (subtask: Task) => {
    Alert.alert('Delete Subtask', `Remove "${subtask.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          deleteTask.mutate(subtask.id);
        },
      },
    ]);
  };

  // Calculate progress
  const completedCount = subtasks.filter((st) => st.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.success, width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completedCount}/{totalCount} completed
          </Text>
        </View>
      )}

      {/* Subtask list */}
      {subtasks.map((subtask) => (
        <View key={subtask.id} style={styles.subtaskRow}>
          {/* Checkbox */}
          <Pressable
            onPress={() => handleToggleSubtask(subtask)}
            hitSlop={8}
            style={[
              styles.checkbox,
              {
                backgroundColor: subtask.completed ? colors.success : 'transparent',
                borderColor: subtask.completed ? colors.success : colors.border,
              },
            ]}
          >
            {subtask.completed && <Ionicons name="checkmark" size={12} color="#fff" />}
          </Pressable>

          {/* Title */}
          <Text
            style={[
              styles.subtaskText,
              { color: subtask.completed ? colors.textSecondary : colors.text },
              subtask.completed && styles.completedText,
            ]}
          >
            {subtask.title}
          </Text>

          {/* Delete button */}
          <Pressable
            onPress={() => handleDeleteSubtask(subtask)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}

      {/* Add subtask */}
      {isAdding ? (
        <View style={styles.addInputContainer}>
          <TextInput
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            placeholder="Subtask title..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.addInput, { color: colors.text, borderColor: colors.border }]}
            autoFocus
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <View style={styles.addActions}>
            <Pressable
              onPress={() => {
                setNewSubtaskTitle('');
                setIsAdding(false);
              }}
              style={styles.actionButton}
            >
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              style={[styles.actionButton, !newSubtaskTitle.trim() && styles.actionButtonDisabled]}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setIsAdding(true)}
          style={[styles.addButton, { borderColor: colors.border }]}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Subtask</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
  },
  progressContainer: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    fontSize: 14,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  deleteButton: {
    padding: tokens.spacing.xs,
  },
  addInputContainer: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  addInput: {
    fontSize: 14,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  actionButton: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
