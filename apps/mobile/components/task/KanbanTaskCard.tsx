/**
 * Kanban Task Card Component (Mobile)
 * Task card optimized for kanban board with viber features
 * - Status actions: Start (todo), Done (vibing), Undo/Archive (done), Restore (archived)
 * - Context notes display with AI styling
 * - Project tag and AI badges
 * - Quick archive button for done tasks
 * - Completion time badge showing "X ago" for done tasks
 * - Short ID badge support
 * - Simplified UI (no reminder/recurrence bloat)
 * - Long press support for drag operations
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import type { Task } from '@vibetasks/shared';

interface KanbanTaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: 'todo' | 'vibing' | 'done' | 'archived') => void;
  onPress?: () => void;
  onLongPress?: () => void;
  isVibing?: boolean;
  isDone?: boolean;
  isArchived?: boolean;
  isDragging?: boolean;
  shortId?: number;
}

export function KanbanTaskCard({
  task,
  onStatusChange,
  onPress,
  onLongPress,
  isVibing,
  isDone,
  isArchived,
  isDragging,
  shortId,
}: KanbanTaskCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handleStatusChange = (newStatus: 'todo' | 'vibing' | 'done' | 'archived') => {
    haptics.trigger(newStatus === 'done' ? 'success' : newStatus === 'archived' ? 'medium' : 'light');
    onStatusChange(task.id, newStatus);
  };

  // Format completion time as "X ago"
  const getCompletionTimeAgo = () => {
    if (!task.completed_at) return null;
    const completedDate = new Date(task.completed_at);
    const now = new Date();
    const diffMs = now.getTime() - completedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Priority colors
  const priorityColors = {
    high: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    low: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
    none: null,
  };

  const priorityLabels = {
    high: '! High',
    medium: '~ Med',
    low: '_ Low',
    none: '',
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isVibing ? 'rgba(139, 92, 246, 0.5)' : colors.border,
        },
        isVibing && styles.vibingCard,
        isDone && !isArchived && styles.doneCard,
        isArchived && styles.archivedCard,
        isDragging && styles.draggingCard,
      ]}
    >
      {/* Short ID and Quick Archive Button */}
      {(shortId || (isDone && !isArchived)) && (
        <View style={styles.topRight}>
          {/* Quick Archive Button for Done Tasks */}
          {isDone && !isArchived && (
            <Pressable
              onPress={() => handleStatusChange('archived')}
              style={[styles.quickArchiveButton, { backgroundColor: colors.backgroundSecondary }]}
              hitSlop={8}
            >
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
          {/* Short ID Badge */}
          {shortId && (
            <View style={[styles.shortIdBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.shortIdText, { color: colors.textSecondary }]}>#{shortId}</Text>
            </View>
          )}
        </View>
      )}

      {/* Title */}
      <Text
        style={[
          styles.title,
          { color: isDone || isArchived ? colors.textSecondary : colors.text },
          (isDone || isArchived) && styles.doneTitle,
        ]}
        numberOfLines={2}
      >
        {task.title}
      </Text>

      {/* Badges Row */}
      <View style={styles.badges}>
        {/* Priority Badge */}
        {task.priority !== 'none' && priorityColors[task.priority] && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: priorityColors[task.priority]!.bg,
                borderColor: priorityColors[task.priority]!.border,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: priorityColors[task.priority]!.text }]}>
              {priorityLabels[task.priority]}
            </Text>
          </View>
        )}

        {/* AI Created Badge */}
        {task.created_by === 'ai' && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
              },
            ]}
          >
            <Ionicons name="sparkles" size={10} color="#8B5CF6" />
            <Text style={[styles.badgeText, { color: '#A78BFA', marginLeft: 3 }]}>AI</Text>
          </View>
        )}

        {/* Project Tag */}
        {task.project_tag && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
              },
            ]}
          >
            <Ionicons name="folder-outline" size={10} color="#8B5CF6" />
            <Text style={[styles.badgeText, { color: '#A78BFA', marginLeft: 3 }]}>
              {task.project_tag}
            </Text>
          </View>
        )}

        {/* Due Date */}
        {task.due_date && !isDone && (
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="time-outline" size={10} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary, marginLeft: 3 }]}>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}

        {/* Subtasks Count */}
        {task.subtasks && task.subtasks.length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="checkmark-outline" size={10} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary, marginLeft: 3 }]}>
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
            </Text>
          </View>
        )}

        {/* Completion Time Badge (for done tasks) */}
        {isDone && !isArchived && getCompletionTimeAgo() && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={10} color="#10B981" />
            <Text style={[styles.badgeText, { color: '#10B981', marginLeft: 3 }]}>
              {getCompletionTimeAgo()}
            </Text>
          </View>
        )}
      </View>

      {/* Context Notes (Where I left off) - AI styling when created by AI */}
      {task.context_notes && !isDone && !isArchived && (
        <View
          style={[
            styles.contextNotes,
            task.created_by === 'ai' && styles.aiContextNotes,
          ]}
        >
          <Ionicons
            name={task.created_by === 'ai' ? 'sparkles' : 'chatbubble-outline'}
            size={12}
            color={task.created_by === 'ai' ? '#8B5CF6' : '#3B82F6'}
          />
          <Text style={[styles.contextNotesText, { color: colors.textSecondary }]} numberOfLines={2}>
            {task.context_notes}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {!isDone && !isArchived && (
        <View style={styles.actions}>
          {task.status === 'todo' && (
            <Pressable
              onPress={() => handleStatusChange('vibing')}
              style={[styles.actionButton, styles.startButton]}
            >
              <Ionicons name="play" size={14} color="#8B5CF6" />
              <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Start</Text>
            </Pressable>
          )}

          {task.status === 'vibing' && (
            <Pressable
              onPress={() => handleStatusChange('done')}
              style={[styles.actionButton, styles.doneButton]}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Done State - Undo or Archive */}
      {isDone && !isArchived && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleStatusChange('todo')}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Ionicons name="arrow-undo" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Undo</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatusChange('archived')}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Ionicons name="archive-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Archive</Text>
          </Pressable>
        </View>
      )}

      {/* Archived State - Restore */}
      {isArchived && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleStatusChange('done')}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Ionicons name="arrow-undo" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Restore</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatusChange('todo')}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>To Todo</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    marginBottom: tokens.spacing.sm,
  },
  vibingCard: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  doneCard: {
    opacity: 0.6,
  },
  archivedCard: {
    opacity: 0.5,
  },
  draggingCard: {
    opacity: 0.5,
    transform: [{ scale: 1.05 }, { rotate: '2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  topRight: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  quickArchiveButton: {
    padding: 4,
    borderRadius: tokens.borderRadius.sm,
  },
  shortIdBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  shortIdText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: tokens.spacing.sm,
    paddingRight: 50, // Space for short ID badge
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: tokens.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: tokens.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  contextNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: tokens.spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(59, 130, 246, 0.5)',
    borderRadius: 4,
    marginBottom: tokens.spacing.sm,
    gap: 6,
  },
  aiContextNotes: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderLeftColor: 'rgba(139, 92, 246, 0.5)',
  },
  contextNotesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  doneButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
});
