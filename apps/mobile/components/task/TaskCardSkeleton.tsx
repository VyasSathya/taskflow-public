import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { SkeletonLoader } from '@/components/ui';

export function TaskCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.content}>
        {/* Checkbox skeleton */}
        <SkeletonLoader width={24} height={24} borderRadius={12} />

        {/* Task info skeleton */}
        <View style={styles.taskInfo}>
          {/* Title */}
          <SkeletonLoader width="80%" height={18} style={styles.title} />

          {/* Metadata row */}
          <View style={styles.metadataRow}>
            <SkeletonLoader width={60} height={14} borderRadius={tokens.borderRadius.full} />
            <SkeletonLoader width={60} height={14} borderRadius={tokens.borderRadius.full} />
            <SkeletonLoader width={40} height={14} borderRadius={tokens.borderRadius.full} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <TaskCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  title: {
    marginBottom: tokens.spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  listContainer: {
    paddingTop: tokens.spacing.md,
  },
});
