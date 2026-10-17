/**
 * Priority Page (Mobile)
 * Shows tasks sorted by priority (high -> medium -> low -> none)
 * with status, project, and tag filters
 * 
 * Matches web app's Priority view with:
 * - Status filter (Todo, Vibing, Done) - defaults to Todo only
 * - Project filter bubbles
 * - Tag filter with colors
 * - Tasks sorted by priority (High -> Medium -> Low -> None)
 * - Priority sections with headers
 * - "Next" task badge showing highest priority task
 * - Collapsible filter bar with active filter summary when collapsed
 * - Clear all filters button
 */

import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors, iconSizes } from '@/lib/theme';
import { SwipeableTaskCard, TaskQuickAdd, TaskListSkeleton } from '@/components/task';
import { EmptyState } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useTasks, useTags, useTaskSubscription } from '@/lib/hooks/useTasks';
import type { Task, Tag } from '@/lib/stores/task-store';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Priority order for sorting (high first)
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };

// Priority display config - using semantic colors
const PRIORITY_CONFIG = {
  high: { label: 'High Priority', color: semanticColors.priorityHigh, dotColor: semanticColors.priorityHigh },
  medium: { label: 'Medium Priority', color: semanticColors.priorityMedium, dotColor: semanticColors.priorityMedium },
  low: { label: 'Low Priority', color: semanticColors.priorityLow, dotColor: semanticColors.priorityLow },
  none: { label: 'No Priority', color: semanticColors.priorityNone, dotColor: semanticColors.priorityNone },
};

// Status filter options (matches web exactly) - using semantic colors
const STATUS_OPTIONS = [
  { id: 'todo', label: 'Todo', icon: 'play-outline', color: semanticColors.priorityNone },
  { id: 'vibing', label: 'Vibing', icon: 'flash-outline', color: semanticColors.vibing },
  { id: 'done', label: 'Done', icon: 'checkmark-outline', color: semanticColors.success },
];

interface PrioritySectionData {
  title: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  data: Task[];
}

export default function PriorityScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['todo']); // Default to todo only (matches web)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: allTasks, isLoading, refetch, isRefetching, error } = useTasks('all');
  const { data: tags } = useTags();

  // Subscribe to realtime updates
  useTaskSubscription();

  // Get unique projects from tasks
  const availableProjects = useMemo((): string[] => {
    if (!allTasks) return [];
    return [...new Set(allTasks.map((t: Task) => t.project_tag).filter(Boolean))] as string[];
  }, [allTasks]);

  // Filter and sort tasks by priority (matches web logic exactly)
  const filteredTasks = useMemo((): Task[] => {
    if (!allTasks) return [];

    // Filter by selected statuses (default: todo only)
    let filtered = allTasks.filter((t: Task) => {
      // Always exclude archived
      if (t.status === 'archived') return false;
      // Apply status filter
      return selectedStatuses.length === 0 || selectedStatuses.includes(t.status || 'todo');
    });

    // Apply project filter
    if (selectedProjects.length > 0) {
      filtered = filtered.filter((t: Task) => t.project_tag && selectedProjects.includes(t.project_tag));
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t: Task) =>
        t.tags?.some((tag: { id: string }) => selectedTags.includes(tag.id))
      );
    }

    // Sort by priority (high -> medium -> low -> none), then by position
    return filtered.sort((a: Task, b: Task) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.position || 0) - (b.position || 0);
    });
  }, [allTasks, selectedProjects, selectedTags, selectedStatuses]);

  // Group tasks by priority for SectionList
  const sections: PrioritySectionData[] = useMemo(() => {
    const grouped = {
      high: filteredTasks.filter((t: Task) => t.priority === 'high'),
      medium: filteredTasks.filter((t: Task) => t.priority === 'medium'),
      low: filteredTasks.filter((t: Task) => t.priority === 'low'),
      none: filteredTasks.filter((t: Task) => t.priority === 'none'),
    };

    return (['high', 'medium', 'low', 'none'] as const)
      .filter((priority) => grouped[priority].length > 0)
      .map((priority) => ({
        title: PRIORITY_CONFIG[priority].label,
        priority,
        data: grouped[priority],
      }));
  }, [filteredTasks]);

  // Get the next task (highest priority)
  const nextTask = filteredTasks.length > 0 ? filteredTasks[0] : null;

  // Stats
  const totalCount = allTasks?.filter((t: Task) => !t.completed && t.status !== 'archived').length || 0;
  const filteredCount = filteredTasks.length;
  const highCount = filteredTasks.filter((t: Task) => t.priority === 'high').length;
  const mediumCount = filteredTasks.filter((t: Task) => t.priority === 'medium').length;
  const lowCount = filteredTasks.filter((t: Task) => t.priority === 'low').length;

  // Check if filters differ from defaults (matches web logic)
  const hasActiveFilters =
    selectedProjects.length > 0 ||
    selectedTags.length > 0 ||
    !(selectedStatuses.length === 1 && selectedStatuses[0] === 'todo');

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedTags([]);
    setSelectedStatuses(['todo']); // Reset to default (matches web)
  };

  const toggleFilters = () => {
    haptics.selection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const toggleStatus = (status: string) => {
    haptics.selection();
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

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

  const renderTask = ({ item }: { item: Task }) => <SwipeableTaskCard task={item} />;

  const renderSectionHeader = ({ section }: { section: PrioritySectionData }) => {
    const config = PRIORITY_CONFIG[section.priority];
    return (
      <View style={[styles.sectionHeader, { borderBottomColor: `${config.color}40` }]}>
        <View style={[styles.priorityDot, { backgroundColor: config.dotColor }]} />
        <Text style={[styles.sectionTitle, { color: config.color }]}>{section.title}</Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          ({section.data.length})
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleContainer}>
                <View style={styles.titleWithIcon}>
                  <Ionicons name="list" size={iconSizes.header} color={colors.textSecondary} />
                  <Text style={[styles.title, { color: colors.text }]}>Priority</Text>
                </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filteredCount} tasks
            {highCount > 0 && <Text style={{ color: '#EF4444' }}> · {highCount} high</Text>}
            {mediumCount > 0 && <Text style={{ color: '#F59E0B' }}> · {mediumCount} medium</Text>}
            {lowCount > 0 && <Text style={{ color: '#3B82F6' }}> · {lowCount} low</Text>}
          </Text>
        </View>

        {/* Next Task Badge (matches web) */}
        {nextTask && (
          <View style={[styles.nextTaskBadge, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.nextTaskLabel, { color: colors.textSecondary }]}>Next:</Text>
            <Text style={[styles.nextTaskTitle, { color: colors.text }]} numberOfLines={1}>
              {nextTask.title}
            </Text>
          </View>
        )}
      </View>

      {/* Collapsible Filter Bar (matches web structure) */}
      <View style={[styles.filterBar, { borderColor: colors.border }]}>
        {/* Filter Toggle Button */}
        <TouchableOpacity
          onPress={toggleFilters}
          style={[styles.filterToggle, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <View style={styles.filterToggleLeft}>
            <Ionicons name="folder-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.filterToggleText, { color: colors.textSecondary }]}>Filters</Text>
            {hasActiveFilters && (
              <View style={[styles.filterActiveBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.filterActiveBadgeText, { color: colors.primary }]}>
                  {selectedStatuses.length + selectedProjects.length + selectedTags.length} active
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Filter Content (expanded) */}
        {showFilters && (
          <View style={[styles.filterContent, { backgroundColor: colors.surface }]}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="flash-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Status</Text>
              </View>
              <View style={styles.filterChips}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleStatus(option.id)}
                    style={[
                      styles.filterChip,
                      selectedStatuses.includes(option.id)
                        ? { backgroundColor: option.color, borderColor: option.color }
                        : { backgroundColor: 'transparent', borderColor: `${option.color}40` },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={12}
                      color={selectedStatuses.includes(option.id) ? '#fff' : option.color}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedStatuses.includes(option.id) ? '#fff' : option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Projects Filter */}
            {availableProjects.length > 0 && (
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="folder-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Projects</Text>
                </View>
                <View style={styles.filterChips}>
                  {availableProjects.map((project) => (
                    <TouchableOpacity
                      key={project}
                      onPress={() => toggleProject(project)}
                      style={[
                        styles.filterChip,
                        selectedProjects.includes(project)
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: 'transparent', borderColor: `${colors.primary}40` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedProjects.includes(project) ? '#fff' : colors.primary },
                        ]}
                      >
                        {project}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Tags Filter */}
            {tags && tags.length > 0 && (
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Tags</Text>
                </View>
                <View style={styles.filterChips}>
                  {tags.map((tag: Tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      onPress={() => toggleTag(tag.id)}
                      style={[
                        styles.filterChip,
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { backgroundColor: 'transparent', borderColor: tag.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedTags.includes(tag.id) ? '#fff' : tag.color },
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                <Ionicons name="close" size={12} color={colors.textSecondary} />
                <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>
                  Clear all filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Active Filters Summary (when collapsed) - matches web */}
      {!showFilters && hasActiveFilters && (
        <View style={[styles.activeFiltersSummary, { backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}20` }]}>
          <Text style={[styles.activeFiltersLabel, { color: colors.textSecondary }]}>Filtering:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            {/* Status filters */}
            {selectedStatuses.map((status) => {
              const config = STATUS_OPTIONS.find((s) => s.id === status);
              if (!config) return null;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => toggleStatus(status)}
                  style={[styles.activeFilterChip, { backgroundColor: `${config.color}20` }]}
                >
                  <Ionicons name={config.icon as any} size={10} color={config.color} />
                  <Text style={[styles.activeFilterChipText, { color: config.color }]}>{status}</Text>
                  <Ionicons name="close" size={10} color={config.color} />
                </TouchableOpacity>
              );
            })}
            {/* Project filters */}
            {selectedProjects.map((project) => (
              <TouchableOpacity
                key={project}
                onPress={() => toggleProject(project)}
                style={[styles.activeFilterChip, { backgroundColor: `${colors.primary}20` }]}
              >
                <Ionicons name="folder-outline" size={10} color={colors.primary} />
                <Text style={[styles.activeFilterChipText, { color: colors.primary }]}>{project}</Text>
                <Ionicons name="close" size={10} color={colors.primary} />
              </TouchableOpacity>
            ))}
            {/* Tag filters */}
            {selectedTags.map((tagId) => {
              const tag = tags?.find((t: Tag) => t.id === tagId);
              if (!tag) return null;
              return (
                <TouchableOpacity
                  key={tagId}
                  onPress={() => toggleTag(tagId)}
                  style={[styles.activeFilterChip, { backgroundColor: `${tag.color}20` }]}
                >
                  <Ionicons name="pricetag-outline" size={10} color={tag.color} />
                  <Text style={[styles.activeFilterChipText, { color: tag.color }]}>{tag.name}</Text>
                  <Ionicons name="close" size={10} color={tag.color} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.filterCountText, { color: colors.textSecondary }]}>
            ({filteredCount} of {totalCount})
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      type="no-data"
      title="No tasks yet"
      subtitle="Add a task to get started with priority-based organization"
      icon="list-outline"
    />
  );

  return (
    <SafeAreaWrapper edges={['top']}>
      {isLoading ? (
        <>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <View style={styles.titleWithIcon}>
                  <Ionicons name="list" size={24} color={colors.textSecondary} />
                  <Text style={[styles.title, { color: colors.text }]}>Priority</Text>
                </View>
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
                <View style={styles.titleWithIcon}>
                  <Ionicons name="list" size={24} color={colors.textSecondary} />
                  <Text style={[styles.title, { color: colors.text }]}>Priority</Text>
                </View>
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
        <SectionList
          sections={sections}
          renderItem={renderTask}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <TaskQuickAdd />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
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
  },
  subtitle: {
    fontSize: 14,
  },
  nextTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    maxWidth: 200,
  },
  nextTaskLabel: {
    fontSize: 12,
  },
  nextTaskTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  // Collapsible Filter Bar
  filterBar: {
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: tokens.spacing.sm,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
  },
  filterActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
  },
  filterActiveBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  filterSection: {
    marginBottom: tokens.spacing.md,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: tokens.spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: tokens.spacing.xs,
  },
  clearFiltersText: {
    fontSize: 12,
  },
  // Active Filters Summary (collapsed state)
  activeFiltersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    marginBottom: tokens.spacing.sm,
  },
  activeFiltersLabel: {
    fontSize: 11,
    marginRight: tokens.spacing.xs,
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.borderRadius.full,
    marginRight: 6,
  },
  activeFilterChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  filterCountText: {
    fontSize: 10,
    marginLeft: tokens.spacing.xs,
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
