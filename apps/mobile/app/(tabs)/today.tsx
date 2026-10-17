import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { SwipeableTaskCard, TaskQuickAdd } from '@/components/task';
import { EmptyState } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useTasks, useTaskSubscription } from '@/lib/hooks/useTasks';
import type { Task } from '@/lib/stores/task-store';

export default function TodayTasksScreen() {
  const { colors } = useTheme();
  const { data: tasks, isLoading, refetch, isRefetching } = useTasks('today');

  // Subscribe to realtime updates
  useTaskSubscription();

  const renderTask = ({ item }: { item: Task }) => <SwipeableTaskCard task={item} />;

  const renderHeader = () => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const formattedDate = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

    return (
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Today</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {formattedDate} · {tasks?.length || 0} tasks
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      type="no-data"
      title="Nothing due today"
      subtitle="You're all caught up! Add a task or enjoy your day."
      icon="today-outline"
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

      <TaskQuickAdd />
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
});
