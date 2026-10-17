import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import type { Task, ErrorCategory, ErrorContext } from '@vibetasks/shared';
import { formatDueDate, isOverdue } from '@/lib/services/nlp-service';
import { useTaskMutations } from '@/lib/hooks/useTasks';
import { AttachmentPicker } from './AttachmentPicker';
import { SubtaskList } from './SubtaskList';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  /** Whether the task is archived (applies dim styling) */
  isArchived?: boolean;
  /** Short ID for easy reference (1-99) */
  shortId?: number;
}

// =============================================================================
// ERROR CONTEXT VIEW COMPONENT
// =============================================================================

interface ErrorContextViewProps {
  errorContext: ErrorContext;
  colors: ReturnType<typeof useTheme>['colors'];
}

function getCategoryColor(category?: ErrorCategory): string {
  const categoryColors: Record<ErrorCategory, string> = {
    typescript: '#3178C6',
    nodejs: '#68A063',
    npm: '#CB3837',
    webpack: '#8DD6F9',
    vite: '#646CFF',
    expo: '#000020',
    python: '#3776AB',
    rust: '#DEA584',
    go: '#00ADD8',
    general: '#6B7280',
  };
  return categoryColors[category || 'general'];
}

function ErrorContextView({ errorContext, colors }: ErrorContextViewProps) {
  const categoryColor = getCategoryColor(errorContext.category);
  
  return (
    <View style={errorContextStyles.container}>
      {/* Category & Type Header */}
      <View style={errorContextStyles.header}>
        <View style={[errorContextStyles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[errorContextStyles.categoryText, { color: categoryColor }]}>
            {errorContext.category || 'general'}
          </Text>
        </View>
        {errorContext.error_type && (
          <Text style={[errorContextStyles.errorType, { color: colors.text }]}>
            {errorContext.error_type}
          </Text>
        )}
      </View>

      {/* Error Message */}
      {errorContext.message && (
        <View style={errorContextStyles.section}>
          <Text style={[errorContextStyles.label, { color: colors.textSecondary }]}>Message</Text>
          <Text style={[errorContextStyles.message, { color: colors.text }]}>
            {errorContext.message}
          </Text>
        </View>
      )}

      {/* File Location */}
      {errorContext.file_path && (
        <View style={errorContextStyles.section}>
          <Text style={[errorContextStyles.label, { color: colors.textSecondary }]}>Location</Text>
          <View style={[errorContextStyles.fileBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="document-outline" size={14} color={colors.textSecondary} />
            <Text style={[errorContextStyles.filePath, { color: colors.text }]} numberOfLines={1}>
              {errorContext.file_path}
              {errorContext.line_number && `:${errorContext.line_number}`}
              {errorContext.column && `:${errorContext.column}`}
            </Text>
          </View>
        </View>
      )}

      {/* Suggestion */}
      {errorContext.suggestion && (
        <View style={errorContextStyles.suggestionBox}>
          <Ionicons name="bulb-outline" size={14} color={semanticColors.warning} />
          <Text style={errorContextStyles.suggestionText}>{errorContext.suggestion}</Text>
        </View>
      )}

      {/* Stack Trace (collapsible) */}
      {errorContext.stack_trace && (
        <View style={errorContextStyles.section}>
          <Text style={[errorContextStyles.label, { color: colors.textSecondary }]}>Stack Trace</Text>
          <ScrollView 
            style={[errorContextStyles.stackBox, { backgroundColor: colors.backgroundSecondary }]}
            horizontal={false}
            nestedScrollEnabled
          >
            <Text style={[errorContextStyles.stackText, { color: colors.text }]}>
              {errorContext.stack_trace}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Raw Error (collapsible) */}
      <View style={errorContextStyles.section}>
        <Text style={[errorContextStyles.label, { color: colors.textSecondary }]}>Raw Error</Text>
        <ScrollView 
          style={[errorContextStyles.rawBox, { backgroundColor: colors.backgroundSecondary }]}
          horizontal={false}
          nestedScrollEnabled
        >
          <Text style={[errorContextStyles.rawText, { color: colors.text }]}>
            {errorContext.raw_text}
          </Text>
        </ScrollView>
      </View>

      {/* Capture Info */}
      <View style={errorContextStyles.captureInfo}>
        <Text style={[errorContextStyles.captureText, { color: colors.textTertiary }]}>
          Captured {errorContext.capture_source ? `via ${errorContext.capture_source}` : ''} 
          {errorContext.captured_at && ` on ${new Date(errorContext.captured_at).toLocaleDateString()}`}
        </Text>
      </View>
    </View>
  );
}

const errorContextStyles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorType: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: tokens.spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
  },
  filePath: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: tokens.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: semanticColors.warning,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: semanticColors.warning,
    fontWeight: '500',
  },
  stackBox: {
    maxHeight: 100,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
  },
  stackText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  rawBox: {
    maxHeight: 120,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
  },
  rawText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  captureInfo: {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  captureText: {
    fontSize: 11,
  },
});

// =============================================================================
// TASK CARD COMPONENT
// =============================================================================

// Tab type for expanded view
type ExpandedTab = 'details' | 'context';

export function TaskCard({ task, onPress, isArchived = false, shortId }: TaskCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ExpandedTab>('details');
  const { updateTaskStatus, archiveTask } = useTaskMutations();

  // Animation values
  const expandHeight = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Calculate indicators
  const hasNotes = Boolean(task.notes);
  const hasAttachments = task.attachments && task.attachments.length > 0;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const hasErrorContext = Boolean(task.error_context);

  const subtaskProgress = hasSubtasks
    ? {
        completed: task.subtasks!.filter((st) => st.completed).length,
        total: task.subtasks!.length,
      }
    : null;

  // Derive status for backwards compatibility
  const status = task.status || (task.completed ? 'done' : 'todo');
  const isDone = status === 'done';
  const isVibing = status === 'vibing';

  const handleToggle = () => {
    haptics.selection();
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    expandHeight.value = withSpring(newExpanded ? 200 : 0, {
      damping: 20,
      stiffness: 300,
    });

    rotation.value = withSpring(newExpanded ? 180 : 0, {
      damping: 20,
      stiffness: 300,
    });

    onPress?.();
  };

  const handleToggleComplete = () => {
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

  const handleArchive = () => {
    haptics.trigger('medium');
    archiveTask.mutate(task.id);
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

  // Animated styles
  const expandedStyle = useAnimatedStyle(() => ({
    height: expandHeight.value,
    opacity: interpolate(expandHeight.value, [0, 200], [0, 1], Extrapolation.CLAMP),
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Priority colors - using semantic colors for consistency
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

  // Due date styling - using semantic colors
  const getDueDateColor = () => {
    if (!task.due_date) return colors.textSecondary;
    if (isOverdue(task.due_date)) return semanticColors.error;
    return semanticColors.warning; // Amber for upcoming
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isVibing ? 'rgba(139, 92, 246, 0.5)' : colors.border,
          opacity: isArchived ? 0.6 : 1,
        },
        isVibing && styles.vibingContainer,
        isArchived && styles.archivedContainer,
      ]}
    >
      {/* Top Right: Short ID and Quick Archive */}
      {(shortId || (isDone && !isArchived)) && (
        <View style={styles.topRight}>
          {/* Quick Archive Button for Done Tasks */}
          {isDone && !isArchived && (
            <Pressable
              onPress={handleArchive}
              style={[styles.quickArchiveButton, { backgroundColor: colors.backgroundSecondary }]}
              hitSlop={8}
            >
              <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
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

      {/* Main Task Row */}
      <Pressable onPress={handleToggle} style={styles.header}>
        {/* Status Indicator / Checkbox */}
        <Pressable
          onPress={handleToggleComplete}
          hitSlop={8}
          style={[
            styles.checkbox,
            {
            borderColor: isDone
                ? colors.success
                : isVibing
                ? semanticColors.vibing
                : colors.border,
              backgroundColor: isVibing ? semanticColors.vibingLight : 'transparent',
            },
          ]}
        >
          {isDone && <Ionicons name="checkmark" size={18} color={colors.success} />}
          {isVibing && <Ionicons name="flash" size={14} color={semanticColors.vibing} />}
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: isDone ? colors.textSecondary : colors.text },
              isDone && styles.completedText,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {/* Metadata row */}
          <View style={styles.metadata}>
            {/* Status Badge (for vibing) */}
            {isVibing && (
              <View style={styles.vibingBadge}>
                <Ionicons name="flash" size={10} color={semanticColors.vibing} />
                <Text style={styles.vibingBadgeText}>Vibing</Text>
              </View>
            )}

            {/* Project Tag */}
            {task.project_tag && (
              <View style={styles.projectBadge}>
                <Ionicons name="folder-outline" size={10} color={semanticColors.project} />
                <Text style={styles.projectBadgeText}>{task.project_tag}</Text>
              </View>
            )}

            {/* Due date */}
            {task.due_date && !isDone && (
              <View style={styles.metadataItem}>
                <Ionicons name="calendar-outline" size={14} color={getDueDateColor()} />
                <Text style={[styles.metadataText, { color: getDueDateColor() }]}>
                  {formatDueDate(task.due_date)}
                </Text>
              </View>
            )}

            {/* Tags - show all tags with colors */}
            {task.tags && task.tags.length > 0 && task.tags.map((tag) => (
              <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color + '20', borderColor: tag.color + '40' }]}>
                <Text style={[styles.tagText, { color: tag.color }]}>
                  {tag.name}
                </Text>
              </View>
            ))}

            {/* Priority indicator */}
            {task.priority !== 'none' && (
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor() }]} />
            )}

            {/* Completion time badge for done tasks */}
            {isDone && !isArchived && getCompletionTimeAgo() && (
              <View style={styles.completionTimeBadge}>
                <Ionicons name="checkmark-circle" size={12} color={semanticColors.success} />
                <Text style={styles.completionTimeText}>{getCompletionTimeAgo()}</Text>
              </View>
            )}
          </View>

          {/* Context Notes (Where I left off) - AI styling when created by AI */}
          {task.context_notes && !isDone && (
            <View
              style={[
                styles.contextNotes,
                task.created_by === 'ai' && styles.aiContextNotesInline,
              ]}
            >
              <Ionicons
                name={task.created_by === 'ai' ? 'sparkles' : 'chatbubble-outline'}
                size={11}
                color={task.created_by === 'ai' ? semanticColors.ai : semanticColors.info}
              />
              <Text
                style={[styles.contextNotesText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {task.context_notes}
              </Text>
            </View>
          )}
        </View>

        {/* Indicators & Actions */}
        <View style={styles.right}>
          {/* Indicators */}
          <View style={styles.indicators}>
            {hasErrorContext && (
              <View style={styles.errorIndicator}>
                <Ionicons name="bug" size={12} color={semanticColors.error} />
              </View>
            )}
            {hasNotes && <Text style={styles.indicator}>📝</Text>}
            {hasAttachments && <Text style={styles.indicator}>📎</Text>}
            {hasSubtasks && subtaskProgress && (
              <Text style={[styles.indicator, styles.subtaskProgress]}>
                ✓ {subtaskProgress.completed}/{subtaskProgress.total}
              </Text>
            )}
          </View>

          {/* Quick Start Button (for todo tasks) */}
          {status === 'todo' && !expanded && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleStartVibing();
              }}
              style={styles.quickStartButton}
            >
              <Ionicons name="play" size={14} color={semanticColors.vibing} />
            </Pressable>
          )}

          {/* Chevron */}
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {expanded && (
        <Animated.View style={[styles.expandedContent, expandedStyle]}>
          {/* Tabs (only show if there's error context) */}
          {hasErrorContext && (
            <View style={styles.tabBar}>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === 'details' && styles.tabActive,
                  { borderColor: activeTab === 'details' ? semanticColors.vibing : 'transparent' }
                ]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'details' ? semanticColors.vibing : colors.textSecondary }
                ]}>
                  Details
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === 'context' && styles.tabActive,
                  { borderColor: activeTab === 'context' ? semanticColors.error : 'transparent' }
                ]}
                onPress={() => setActiveTab('context')}
              >
                <Ionicons 
                  name="bug" 
                  size={14} 
                  color={activeTab === 'context' ? semanticColors.error : colors.textSecondary} 
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'context' ? semanticColors.error : colors.textSecondary }
                ]}>
                  Error Context
                </Text>
              </Pressable>
            </View>
          )}

          {/* Details Tab Content */}
          {(!hasErrorContext || activeTab === 'details') && (
            <>
              {/* Notes */}
              {hasNotes && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[styles.notes, { color: colors.text }]} numberOfLines={5}>
                    {task.notes}
                  </Text>
                </View>
              )}

              {/* Created By Badge (for AI tasks) */}
              {task.created_by && (
                <View style={styles.section}>
                  {task.created_by === 'ai' ? (
                    <View style={styles.aiCreatedBadge}>
                      <Ionicons name="sparkles" size={14} color={semanticColors.ai} />
                      <Text style={styles.aiCreatedBadgeText}>AI Created</Text>
                    </View>
                  ) : (
                    <View style={styles.humanCreatedBadge}>
                      <Ionicons name="person-outline" size={14} color={semanticColors.info} />
                      <Text style={styles.humanCreatedBadgeText}>Created by you</Text>
                    </View>
                  )}
                </View>
              )}

              {/* AI Context Notes (shown for AI tasks or when context exists) */}
              {(task.created_by === 'ai' || task.context_notes) && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: semanticColors.ai }]}>
                    <Ionicons name="sparkles" size={11} color={semanticColors.ai} /> AI Context
                    <Text style={[styles.readOnlyHint, { color: colors.textTertiary }]}> (read-only)</Text>
                  </Text>
                  <View style={styles.aiContextNotesBox}>
                    {task.context_notes ? (
                      <Text style={[styles.aiContextNotesText, { color: colors.text }]}>
                        {task.context_notes}
                      </Text>
                    ) : (
                      <Text style={[styles.aiContextNotesPlaceholder, { color: colors.textTertiary }]}>
                        AI will update this field as it works on this task...
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Subtasks */}
              {hasSubtasks && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Subtasks</Text>
                  <SubtaskList parentTaskId={task.id} subtasks={task.subtasks || []} />
                </View>
              )}

              {/* Attachments */}
              {hasAttachments && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Attachments
                  </Text>
                  <AttachmentPicker
                    taskId={task.id}
                    attachments={task.attachments || []}
                    onAttachmentAdded={() => {}}
                    onAttachmentRemoved={() => {}}
                  />
                </View>
              )}
            </>
          )}

          {/* Error Context Tab Content */}
          {hasErrorContext && activeTab === 'context' && task.error_context && (
            <ErrorContextView errorContext={task.error_context} colors={colors} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.borderRadius.lg,
    marginHorizontal: tokens.spacing.md,
    marginVertical: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vibingContainer: {
    shadowColor: semanticColors.vibing,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  archivedContainer: {
    borderStyle: 'dashed',
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
    padding: 6,
    borderRadius: tokens.borderRadius.sm,
  },
  shortIdBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  shortIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: tokens.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tag: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completionTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: semanticColors.successLight,
    borderWidth: 1,
    borderColor: semanticColors.successBorder,
  },
  completionTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: semanticColors.success,
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
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: semanticColors.projectLight,
    borderWidth: 1,
    borderColor: semanticColors.projectBorder,
  },
  projectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: semanticColors.project,
  },
  contextNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: semanticColors.infoLight,
    borderLeftWidth: 2,
    borderLeftColor: semanticColors.infoBorder,
    borderRadius: 4,
  },
  contextNotesText: {
    flex: 1,
    fontSize: 11,
  },
  contextNotesExpanded: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: semanticColors.infoLight,
    borderLeftWidth: 2,
    borderLeftColor: semanticColors.infoBorder,
    borderRadius: 4,
  },
  contextNotesExpandedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    gap: tokens.spacing.xs,
  },
  indicators: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    alignItems: 'center',
  },
  indicator: {
    fontSize: 14,
  },
  subtaskProgress: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickStartButton: {
    padding: 6,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: semanticColors.vibingLight,
    borderWidth: 1,
    borderColor: semanticColors.vibingBorder,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  section: {
    marginBottom: tokens.spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.xs,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
  },
  // AI Created Badge styles
  aiCreatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: semanticColors.aiLight,
    borderWidth: 1,
    borderColor: semanticColors.aiBorder,
    borderRadius: tokens.borderRadius.md,
  },
  aiCreatedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: semanticColors.project,
  },
  humanCreatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: semanticColors.infoLight,
    borderWidth: 1,
    borderColor: semanticColors.infoBorder,
    borderRadius: tokens.borderRadius.md,
  },
  humanCreatedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: semanticColors.info,
  },
  // AI Context Notes Box styles
  readOnlyHint: {
    fontSize: 10,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  aiContextNotesBox: {
    padding: tokens.spacing.md,
    backgroundColor: semanticColors.aiLight,
    borderWidth: 1,
    borderColor: semanticColors.aiBorder,
    borderRadius: tokens.borderRadius.md,
  },
  aiContextNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiContextNotesPlaceholder: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  // AI Context Notes inline style (for collapsed view)
  aiContextNotesInline: {
    backgroundColor: semanticColors.aiLight,
    borderLeftColor: semanticColors.aiBorder,
  },
  // Error indicator styles
  errorIndicator: {
    padding: 2,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: tokens.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // Border color set dynamically
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
