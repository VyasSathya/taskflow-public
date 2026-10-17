/**
 * Archived Tasks Screen
 * View and manage archived tasks
 */

import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { SwipeableTaskCard } from '@/components/task';
import { EmptyState } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useArchivedTasks, useTaskSubscription, useTaskMutations } from '@/lib/hooks/useTasks';
import type { Task } from '@/lib/stores/task-store';

export default function ArchivedTasksScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { data: tasks, isLoading, refetch, isRefetching } = useArchivedTasks();
  const { clearArchivedTasks } = useTaskMutations();

  // Subscribe to realtime updates
  useTaskSubscription();

  const handleClearAll = () => {
    if (!tasks || tasks.length === 0) return;

    Alert.alert(
      'Clear All Archived',
      `Are you sure you want to permanently delete ${tasks.length} archived task${tasks.length > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            haptics.trigger('heavy');
            clearArchivedTasks.mutate();
          },
        },
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => (
    <SwipeableTaskCard task={item} showUnarchiveAction />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Archived</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {tasks?.length || 0} archived tasks
          </Text>
        </View>

        {/* Clear All Button */}
        {tasks && tasks.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={[styles.clearAllButton, { backgroundColor: colors.error + '15' }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Swipe hint */}
      <View style={[styles.swipeHint, { backgroundColor: colors.surface }]}>
        <Ionicons name="swap-horizontal-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>
          Swipe right to restore, left to delete
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      type="no-data"
      title="No archived tasks"
      subtitle="Archived tasks will appear here"
      icon="archive-outline"
    />
  );

  return (
    <SafeAreaWrapper edges={['top']}>
      <FlatList
        data={tasks || []}
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
    paddingBottom: tokens.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.md,
    alignSelf: 'flex-start',
  },
  swipeHintText: {
    fontSize: 12,
  },
});
