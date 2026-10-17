import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Alert, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { SwipeableTaskCard, TaskQuickAdd, TaskListSkeleton } from '@/components/task';
import { TaskSearchBar } from '@/components/task/TaskSearchBar';
import { EmptyState } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useTasks, useArchivedTasks, useTaskSubscription, useTaskMutations } from '@/lib/hooks/useTasks';
import type { Task } from '@/lib/stores/task-store';
import { useState, useMemo, useCallback } from 'react';

export default function CompletedTasksScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { data: completedTasks, isLoading: loadingCompleted, refetch, isRefetching } = useTasks('completed');
  const { data: archivedTasks, isLoading: loadingArchived } = useArchivedTasks();
  const { archiveAllCompleted, unarchiveTask } = useTaskMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(true);

  // Subscribe to realtime updates
  useTaskSubscription();

  const isLoading = loadingCompleted || (showArchived && loadingArchived);

  const handleArchiveAll = useCallback(() => {
    if (!completedTasks || completedTasks.length === 0) return;

    Alert.alert(
      'Archive All Completed',
      `Move ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''} to history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive All',
          style: 'default',
          onPress: () => {
            haptics.trigger('medium');
            archiveAllCompleted.mutate();
          },
        },
      ]
    );
  }, [completedTasks, haptics, archiveAllCompleted]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Filter tasks by search query
  const filteredCompletedTasks = useMemo(() => {
    if (!searchQuery.trim() || !completedTasks) return completedTasks;
    const query = searchQuery.toLowerCase();
    return completedTasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.notes?.toLowerCase().includes(query) ||
      task.project_tag?.toLowerCase().includes(query) ||
      task.tags?.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [completedTasks, searchQuery]);

  const filteredArchivedTasks = useMemo(() => {
    if (!searchQuery.trim() || !archivedTasks) return archivedTasks;
    const query = searchQuery.toLowerCase();
    return archivedTasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.notes?.toLowerCase().includes(query) ||
      task.project_tag?.toLowerCase().includes(query) ||
      task.tags?.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [archivedTasks, searchQuery]);

  // Prepare sections for SectionList
  const sections = useMemo(() => {
    const result: Array<{
      title: string;
      data: Task[];
      type: 'completed' | 'archived';
      count: number;
    }> = [];

    if (filteredCompletedTasks && filteredCompletedTasks.length > 0) {
      result.push({
        title: 'Recently Completed',
        data: filteredCompletedTasks,
        type: 'completed',
        count: filteredCompletedTasks.length,
      });
    }

    if (showArchived && filteredArchivedTasks && filteredArchivedTasks.length > 0) {
      result.push({
        title: 'History',
        data: filteredArchivedTasks,
        type: 'archived',
        count: filteredArchivedTasks.length,
      });
    }

    return result;
  }, [filteredCompletedTasks, filteredArchivedTasks, showArchived]);

  const completedCount = completedTasks?.length || 0;
  const archivedCount = archivedTasks?.length || 0;
  const totalResultsCount = sections.reduce((total, section) => total + section.data.length, 0);

  const renderTask = ({ item, section }: { item: Task; section: { type: 'completed' | 'archived' } }) => (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
    >
      <SwipeableTaskCard 
        task={item} 
        showArchiveAction={section.type === 'completed'}
        showUnarchiveAction={section.type === 'archived'}
      />
    </Animated.View>
  );

  const renderSectionHeader = ({ section }: { section: { title: string; type: string; count: number } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <View style={styles.sectionTitleRow}>
        <Ionicons 
          name={section.type === 'completed' ? 'checkmark-circle' : 'archive'} 
          size={18} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
        <View style={[styles.sectionBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionBadgeText, { color: colors.textSecondary }]}>
            {section.count}
          </Text>
        </View>
      </View>
      {section.type === 'completed' && (
        <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
          Tasks stay here for 24 hours before moving to history
        </Text>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title and subtitle - consistent with other screens */}
      <View style={styles.headerTop}>
        <View style={styles.titleContainer}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="checkmark-done-circle" size={iconSizes.header} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]}>Completed</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {completedCount} recently done
            {showArchived && archivedCount > 0 && (
              <Text style={{ color: colors.textTertiary }}> + {archivedCount} in history</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TaskSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search completed tasks..."
        />
      </View>

      {/* Toggle and Archive buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => {
            haptics.trigger('selection');
            setShowArchived(!showArchived);
          }}
          style={[
            styles.toggleButton,
            { 
              backgroundColor: showArchived ? colors.primary + '15' : colors.surface,
              borderColor: showArchived ? colors.primary : colors.border,
            }
          ]}
        >
          <Ionicons 
            name={showArchived ? 'eye' : 'eye-off'} 
            size={16} 
            color={showArchived ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: showArchived ? colors.primary : colors.textSecondary }
          ]}>
            {showArchived ? 'Showing History' : `Show History (${archivedCount})`}
          </Text>
        </TouchableOpacity>

        {completedTasks && completedTasks.length > 0 && (
          <TouchableOpacity
            onPress={handleArchiveAll}
            style={[styles.archiveAllButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.archiveAllText, { color: colors.textSecondary }]}>Archive All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search results count */}
      {searchQuery && (
        <View style={styles.searchResultsRow}>
          <Text style={[styles.searchResults, { color: colors.textSecondary }]}>
            {totalResultsCount} result{totalResultsCount !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={handleClearSearch}>
            <Text style={[styles.clearSearchText, { color: colors.primary }]}>
              Clear search
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return null;
    }

    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyState
            type="no-results"
            title="No tasks found"
            subtitle={`No completed tasks match "${searchQuery}"`}
            icon="search-outline"
            primaryColor={colors.primary}
          />
          <TouchableOpacity
            onPress={handleClearSearch}
            style={[styles.clearSearchButton, { backgroundColor: colors.primary + '15' }]}
          >
            <Text style={[styles.clearSearchButtonText, { color: colors.primary }]}>
              Clear search
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <EmptyState
        type="no-data"
        title="No completed tasks yet"
        subtitle="Mark tasks as done to see them here. They'll stay in 'Recently Completed' for 24 hours before moving to history."
        icon="checkmark-done-circle-outline"
        primaryColor={colors.primary}
      />
    );
  };

  const renderFooter = () => {
    if (!showArchived && archivedCount > 0 && !searchQuery) {
      return (
        <TouchableOpacity
          onPress={() => setShowArchived(true)}
          style={[styles.showHistoryFooter, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.showHistoryText, { color: colors.textSecondary }]}>
            Show {archivedCount} archived task{archivedCount !== 1 ? 's' : ''} in history
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  // Show loading state on initial load
  if (isLoading) {
    return (
      <SafeAreaWrapper edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="checkmark-done-circle" size={iconSizes.header} color={colors.textSecondary} />
                <Text style={[styles.title, { color: colors.text }]}>Completed</Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Loading...</Text>
            </View>
          </View>
        </View>
        <TaskListSkeleton count={6} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={['top']}>
      <SectionList
        sections={sections}
        renderItem={renderTask}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      <TaskQuickAdd />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: tokens.spacing.xxl + 80, // Extra padding for TaskQuickAdd
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
  headerTop: {
    marginBottom: tokens.spacing.md,
  },
  titleContainer: {
    gap: 2,
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
  subtitle: {
    fontSize: 14,
    marginTop: tokens.spacing.xs,
  },
  searchContainer: {
    marginBottom: tokens.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  archiveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
  },
  archiveAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchResultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.sm,
  },
  searchResults: {
    fontSize: 14,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.lg + tokens.spacing.sm, // Align with title
  },
  emptyContainer: {
    alignItems: 'center',
  },
  clearSearchButton: {
    marginTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  showHistoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
  },
  showHistoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
