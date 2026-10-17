import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDebounce, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { SwipeableTaskCard, TaskQuickAdd, TaskListSkeleton, KanbanBoard } from '@/components/task';
import { EmptyState, SearchFilterBar, BottomSheet, CollapsibleFilterBar } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useTasks, useTags, useTaskSubscription } from '@/lib/hooks/useTasks';
import type { Task } from '@/lib/stores/task-store';
// @ts-ignore - BottomSheet library types

type Priority = 'all' | 'none' | 'low' | 'medium' | 'high';
type SortBy = 'created' | 'dueDate' | 'priority' | 'alphabetical';
type ViewMode = 'kanban' | 'list';

const PRIORITY_FILTERS = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'high', label: 'High', icon: 'arrow-up' },
  { id: 'medium', label: 'Medium', icon: 'remove' },
  { id: 'low', label: 'Low', icon: 'arrow-down' },
];

const SORT_OPTIONS = [
  { id: 'created', label: 'Created Date', icon: 'calendar-outline' },
  { id: 'dueDate', label: 'Due Date', icon: 'time-outline' },
  { id: 'priority', label: 'Priority', icon: 'flag-outline' },
  { id: 'alphabetical', label: 'Alphabetical', icon: 'text-outline' },
];

export default function AllTasksScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const sortSheetRef = useRef<any>(null);

  const { data: tasks, isLoading, refetch, isRefetching, error } = useTasks('all');
  const { data: tags } = useTags();

  // Subscribe to realtime updates
  useTaskSubscription();

  // Get unique projects from tasks
  const availableProjects = useMemo(() => {
    if (!tasks) return [];
    return [...new Set(tasks.map((t: Task) => t.project_tag).filter(Boolean))] as string[];
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    let result = [...tasks];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((task) => {
        // Search in title
        if (task.title.toLowerCase().includes(query)) return true;
        // Search in notes
        if (task.notes?.toLowerCase().includes(query)) return true;
        // Search in tags
        if (task.tags?.some((tag: { name: string }) => tag.name.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      result = result.filter((task) => task.priority === selectedPriority);
    }

    // Filter by selected projects
    if (selectedProjects.length > 0) {
      result = result.filter((task) =>
        task.project_tag && selectedProjects.includes(task.project_tag)
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      result = result.filter((task) =>
        task.tags?.some((tag: { id: string }) => selectedTags.includes(tag.id))
      );
    }

    // Sort tasks
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];

        case 'alphabetical':
          return a.title.localeCompare(b.title);

        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [tasks, debouncedSearch, selectedPriority, selectedProjects, selectedTags, sortBy]);

  // Toggle handlers with haptic feedback
  const toggleProject = (project: string) => {
    haptics.selection();
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project]
    );
  };

  const toggleTag = (tagId: string) => {
    haptics.selection();
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    haptics.selection();
    setSelectedProjects([]);
    setSelectedTags([]);
  };

  const renderTask = ({ item }: { item: Task }) => <SwipeableTaskCard task={item} />;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleContainer}>
          {/* Title with icon - consistent with other screens */}
          <View style={styles.titleWithIcon}>
            <Ionicons name="flash" size={iconSizes.header} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]}>Focus</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filteredTasks.length === tasks?.length
              ? `${tasks?.length || 0} active tasks`
              : `${filteredTasks.length} of ${tasks?.length || 0} tasks`}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {/* View Toggle */}
          <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                setViewMode('kanban');
              }}
              style={[
                styles.viewToggleButton,
                viewMode === 'kanban' && { backgroundColor: colors.primary }
              ]}
            >
              <Ionicons 
                name="grid-outline" 
                size={iconSizes.sm} 
                color={viewMode === 'kanban' ? '#fff' : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                setViewMode('list');
              }}
              style={[
                styles.viewToggleButton,
                viewMode === 'list' && { backgroundColor: colors.primary }
              ]}
            >
              <Ionicons 
                name="list-outline" 
                size={iconSizes.sm} 
                color={viewMode === 'list' ? '#fff' : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Sort Button */}
          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              sortSheetRef.current?.snapToIndex(0);
            }}
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="funnel-outline" size={iconSizes.button} color={colors.primary} />
            <Text style={[styles.sortButtonText, { color: colors.text }]}>Sort</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search tasks, notes, tags..."
        filters={PRIORITY_FILTERS}
        selectedFilter={selectedPriority}
        onFilterSelect={(id) => setSelectedPriority(id as Priority)}
        primaryColor={colors.primary}
      />

      {/* Collapsible Project/Tag Filters */}
      <CollapsibleFilterBar
        availableProjects={availableProjects}
        selectedProjects={selectedProjects}
        onToggleProject={toggleProject}
        availableTags={tags || []}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        onClearFilters={clearFilters}
        totalCount={tasks?.length || 0}
        filteredCount={filteredTasks.length}
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      type="no-data"
      title="No active tasks"
      subtitle="Add a task above to get started with your focus board"
      icon="grid-outline"
    />
  );

  return (
    <SafeAreaWrapper edges={['top']}>
      {isLoading ? (
        <>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Focus</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Loading...</Text>
              </View>
            </View>
          </View>
          <TaskListSkeleton count={8} />
        </>
      ) : error ? (
        <>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Focus</Text>
              </View>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <EmptyState
              type="error"
              title="Failed to Load Tasks"
              subtitle="There was an error loading your tasks. Please check your connection and try again."
              ctaText="Retry"
              onCtaPress={() => refetch()}
              primaryColor={colors.primary}
            />
          </View>
        </>
      ) : (
        <>
          {viewMode === 'kanban' ? (
            <ScrollView
              style={styles.container}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                />
              }
            >
              {renderHeader()}
              <KanbanBoard 
                tasks={filteredTasks} 
                isRefreshing={isRefetching}
                onRefresh={refetch}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={filteredTasks}
              renderItem={renderTask}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </>
      )}

      <TaskQuickAdd />

      {/* Sort Bottom Sheet */}
      <BottomSheet ref={sortSheetRef} snapPoints={['40%']} enableDynamicSizing={false}>
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Sort by</Text>

          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => {
                haptics.selection();
                setSortBy(option.id as SortBy);
                sortSheetRef.current?.close();
              }}
              style={[
                styles.sortOption,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.sortOptionLeft}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={sortBy === option.id ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: sortBy === option.id ? colors.primary : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </View>

              {sortBy === option.id && (
                <Ionicons name="checkmark" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
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
  subtitle: {
    fontSize: 14,
    marginTop: tokens.spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: tokens.borderRadius.full,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.full,
  },
  sheetContent: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: tokens.spacing.lg,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
