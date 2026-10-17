/**
 * Inbox Screen
 * Shows unified view of errors + feedback with filtering
 * Mirrors web /inbox functionality
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { useTasks, useTaskSubscription } from '@/lib/hooks/useTasks';
import { SafeAreaWrapper } from '@/components/common';
import { EmptyState } from '@/components/ui';
import {
  InboxStats,
  InboxFilters,
  InboxItem,
  type FilterType,
  type FilterSource,
  type FilterStatus,
  type ItemType,
  type ItemSource,
} from '@/components/inbox';
import type { Task } from '@vibetasks/shared';

// Extended task type with optional integration fields
interface ExtendedTask extends Task {
  source_type?: string;
  github_issue_id?: string;
  email_from?: string;
  slack_channel?: string;
  sentry_issue_id?: string;
}

interface ClassifiedTask extends ExtendedTask {
  _type: ItemType;
  _source: ItemSource;
}

export default function InboxScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { data: tasks, isLoading, refetch, isRefetching } = useTasks('all');

  // Subscribe to realtime updates
  useTaskSubscription();

  // Filter states
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('new');

  // Classify tasks into inbox items
  const classifiedTasks = useMemo((): ClassifiedTask[] => {
    if (!tasks) return [];

    return tasks.map((task) => {
      const extTask = task as ExtendedTask;
      const sourceType = extTask.source_type || '';
      const title = task.title?.toLowerCase() || '';

      // Determine if error or feedback
      let type: ItemType = 'feedback';
      if (
        sourceType.includes('bug') ||
        sourceType.includes('error') ||
        sourceType === 'sentry' ||
        (task.priority === 'high' &&
          ['error', 'bug', 'crash', 'fix', 'broken', 'failed', 'exception'].some((p) =>
            title.includes(p)
          )) ||
        extTask.sentry_issue_id
      ) {
        type = 'error';
      }

      // Determine source
      let source: ItemSource = 'manual';
      if (sourceType.startsWith('github') || extTask.github_issue_id) {
        source = 'github';
      } else if (sourceType.startsWith('email') || extTask.email_from) {
        source = 'email';
      } else if (sourceType.startsWith('slack') || extTask.slack_channel) {
        source = 'slack';
      } else if (sourceType === 'sentry' || extTask.sentry_issue_id) {
        source = 'sentry';
      }

      return { ...extTask, _type: type, _source: source };
    });
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return classifiedTasks.filter((task) => {
      // Type filter
      if (filterType === 'errors' && task._type !== 'error') {
        return false;
      }
      if (filterType === 'feedback' && task._type !== 'feedback') {
        return false;
      }

      // Source filter
      if (filterSource !== 'all' && task._source !== filterSource) {
        return false;
      }

      // Status filter
      const status = task.status || (task.completed ? 'done' : 'todo');
      if (filterStatus === 'new' && status !== 'todo') {
        return false;
      }
      if (filterStatus === 'working' && status !== 'vibing') {
        return false;
      }
      if (filterStatus === 'done' && status !== 'done' && !task.completed) {
        return false;
      }

      return true;
    });
  }, [classifiedTasks, filterType, filterSource, filterStatus]);

  // Count by type (only count new/todo items for stats)
  const counts = useMemo(() => {
    const newTasks = classifiedTasks.filter(
      (t) => (t.status || (t.completed ? 'done' : 'todo')) === 'todo'
    );
    return {
      total: newTasks.length,
      errors: newTasks.filter((t) => t._type === 'error').length,
      feedback: newTasks.filter((t) => t._type === 'feedback').length,
      github: newTasks.filter((t) => t._source === 'github').length,
      email: newTasks.filter((t) => t._source === 'email').length,
      slack: newTasks.filter((t) => t._source === 'slack').length,
      sentry: newTasks.filter((t) => t._source === 'sentry').length,
    };
  }, [classifiedTasks]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: ClassifiedTask; index: number }) => (
      <InboxItem task={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: ClassifiedTask) => item.id, []);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title Row - consistent with other screens */}
      <View style={styles.titleRow}>
        <View style={styles.titleContainer}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="mail" size={iconSizes.header} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {counts.total > 0 ? `${counts.total} new items` : 'All caught up'}
            </Text>
            {counts.errors > 0 && (
              <Text style={{ color: semanticColors.error }}> - {counts.errors} errors</Text>
            )}
          </View>
        </View>
      </View>

      {/* Stats */}
      <InboxStats counts={counts} />

      {/* Filters */}
      <InboxFilters
        filterType={filterType}
        filterSource={filterSource}
        filterStatus={filterStatus}
        onFilterTypeChange={setFilterType}
        onFilterSourceChange={setFilterSource}
        onFilterStatusChange={setFilterStatus}
      />

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {filteredTasks.length === classifiedTasks.length
            ? `${classifiedTasks.length} items`
            : `${filteredTasks.length} of ${classifiedTasks.length} items`}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      type="empty-inbox"
      title="Inbox Zero!"
      subtitle={
        filterType !== 'all' || filterSource !== 'all' || filterStatus !== 'all'
          ? 'No items matching your filters'
          : 'No new items to review'
      }
      icon="mail-open-outline"
      primaryColor={colors.success}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaWrapper edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading inbox...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={['top']}>
      <FlatList
        data={filteredTasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.borderRadius.full,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsRow: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  resultsText: {
    fontSize: 12,
  },
});
