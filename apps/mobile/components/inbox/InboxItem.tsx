/**
 * InboxItem - Single inbox item card with source badge
 * Displays task with source indicator (GitHub, Email, Slack, Sentry, Manual)
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors } from '@/lib/theme';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import type { Task } from '@vibetasks/shared';

export type ItemType = 'error' | 'feedback';
export type ItemSource = 'github' | 'email' | 'slack' | 'sentry' | 'manual';

// Extended task type with sentry fields
interface ExtendedTask extends Task {
  sentry_issue_id?: string;
  sentry_error_count?: number;
  sentry_url?: string;
}

interface InboxItemProps {
  task: ExtendedTask & {
    _type: ItemType;
    _source: ItemSource;
  };
  index: number;
  onPress?: () => void;
}

const SOURCE_CONFIG: Record<ItemSource, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  github: { icon: 'logo-github', color: semanticColors.priorityNone, label: 'GitHub' },
  email: { icon: 'mail', color: semanticColors.vibing, label: 'Email' },
  slack: { icon: 'chatbubbles', color: '#E11D48', label: 'Slack' },
  sentry: { icon: 'bug', color: '#362D59', label: 'Sentry' },
  manual: { icon: 'create', color: semanticColors.success, label: 'Manual' },
};

export function InboxItem({ task, index, onPress }: InboxItemProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { updateTaskStatus } = useTaskMutations();

  const sourceConfig = SOURCE_CONFIG[task._source];
  const isError = task._type === 'error';

  // Derive status
  const status = task.status || (task.completed ? 'done' : 'todo');
  const isDone = status === 'done';
  const isVibing = status === 'vibing';

  const handlePress = () => {
    haptics.selection();
    onPress?.();
  };

  const handleToggleStatus = () => {
    haptics.trigger(isDone ? 'light' : 'success');
    updateTaskStatus.mutate({
      taskId: task.id,
      status: isDone ? 'todo' : 'done',
    });
  };

  const handleStartVibing = () => {
    haptics.trigger('medium');
    updateTaskStatus.mutate({
      taskId: task.id,
      status: 'vibing',
    });
  };

  // Priority colors - using semantic colors
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return semanticColors.priorityHigh;
      case 'medium':
        return semanticColors.priorityMedium;
      case 'low':
        return semanticColors.priorityLow;
      default:
        return 'transparent';
    }
  };

  // Format relative time
  const getTimeAgo = () => {
    const date = new Date(task.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={styles.wrapper}
    >
      {/* Source Badge */}
      <View
        style={[
          styles.sourceBadge,
          {
            backgroundColor: colors.surface,
            borderColor: isError ? semanticColors.errorBorder : semanticColors.infoBorder,
          },
        ]}
      >
        <Ionicons name={sourceConfig.icon} size={14} color={sourceConfig.color} />
      </View>

      {/* Card */}
      <Pressable
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isVibing ? semanticColors.vibingBorder : colors.border,
          },
          isVibing && styles.vibingCard,
        ]}
      >
        {/* Header Row */}
        <View style={styles.header}>
          {/* Checkbox */}
          <Pressable
            onPress={handleToggleStatus}
            hitSlop={8}
            style={[
              styles.checkbox,
              {
                borderColor: isDone ? colors.success : isVibing ? semanticColors.vibing : colors.border,
                backgroundColor: isVibing ? semanticColors.vibingLight : 'transparent',
              },
            ]}
          >
            {isDone && <Ionicons name="checkmark" size={16} color={colors.success} />}
            {isVibing && <Ionicons name="flash" size={12} color={semanticColors.vibing} />}
          </Pressable>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { color: isDone ? colors.textSecondary : colors.text },
                isDone && styles.completedTitle,
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            {/* Metadata Row */}
            <View style={styles.metadata}>
              {/* Type Badge */}
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isError ? semanticColors.errorLight : semanticColors.infoLight,
                    borderColor: isError ? semanticColors.errorBorder : semanticColors.infoBorder,
                  },
                ]}
              >
                <Ionicons
                  name={isError ? 'alert-circle' : 'chatbubble'}
                  size={10}
                  color={isError ? semanticColors.error : semanticColors.info}
                />
                <Text style={[styles.typeBadgeText, { color: isError ? semanticColors.error : semanticColors.info }]}>
                  {isError ? 'Error' : 'Feedback'}
                </Text>
              </View>

              {/* Status Badge (for vibing) */}
              {isVibing && (
                <View style={styles.vibingBadge}>
                  <Ionicons name="flash" size={10} color={semanticColors.vibing} />
                  <Text style={styles.vibingBadgeText}>Working</Text>
                </View>
              )}

              {/* Source Label */}
              <View style={styles.sourceLabel}>
                <Ionicons name={sourceConfig.icon} size={10} color={colors.textTertiary} />
                <Text style={[styles.sourceLabelText, { color: colors.textTertiary }]}>
                  {sourceConfig.label}
                </Text>
              </View>

              {/* Priority Dot */}
              {task.priority !== 'none' && (
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor() }]} />
              )}

              {/* Time */}
              <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                {getTimeAgo()}
              </Text>
            </View>

            {/* Project Tag */}
            {task.project_tag && (
              <View style={styles.projectRow}>
                <Ionicons name="folder-outline" size={12} color={semanticColors.project} />
                <Text style={[styles.projectText, { color: semanticColors.project }]}>
                  {task.project_tag}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {status === 'todo' && (
              <Pressable
                onPress={handleStartVibing}
                style={styles.startButton}
                hitSlop={8}
              >
                <Ionicons name="play" size={14} color={semanticColors.vibing} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Notes Preview */}
        {task.notes && !isDone && (
          <View style={styles.notesPreview}>
            <Text
              style={[styles.notesText, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {task.notes.replace(/```[\s\S]*?```/g, '[code]').replace(/\n/g, ' ')}
            </Text>
          </View>
        )}

        {/* Sentry Info */}
        {task.sentry_issue_id && (
          <View style={[styles.sentryInfo, { borderTopColor: colors.border }]}>
            <Ionicons name="bug-outline" size={12} color="#362D59" />
            <Text style={[styles.sentryText, { color: colors.textSecondary }]}>
              {task.sentry_error_count ? `${task.sentry_error_count} occurrences` : 'Sentry Issue'}
            </Text>
            {task.sentry_url && (
              <Text style={[styles.sentryLink, { color: colors.primary }]}>View</Text>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: tokens.spacing.md,
    paddingLeft: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
    position: 'relative',
  },
  sourceBadge: {
    position: 'absolute',
    left: tokens.spacing.sm,
    top: tokens.spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...tokens.shadows.sm,
  },
  card: {
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    marginLeft: tokens.spacing.md,
    overflow: 'hidden',
  },
  vibingCard: {
    shadowColor: semanticColors.vibing,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  vibingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: semanticColors.vibingLight,
    borderWidth: 1,
    borderColor: semanticColors.vibingBorder,
  },
  vibingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: semanticColors.vibing,
  },
  sourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sourceLabelText: {
    fontSize: 10,
    fontWeight: '500',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeText: {
    fontSize: 10,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  projectText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    alignItems: 'flex-end',
  },
  startButton: {
    padding: 6,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: semanticColors.vibingLight,
    borderWidth: 1,
    borderColor: semanticColors.vibingBorder,
  },
  notesPreview: {
    paddingHorizontal: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
    marginLeft: 30,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sentryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    backgroundColor: 'rgba(54, 45, 89, 0.05)',
  },
  sentryText: {
    flex: 1,
    fontSize: 11,
  },
  sentryLink: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default InboxItem;
