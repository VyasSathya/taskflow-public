/**
 * Kanban Column Component (Mobile)
 * A single column in the kanban board - Todo, Vibing, Done, or History
 * Supports drag over visual feedback
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

interface KanbanColumnProps {
  title: string;
  subtitle: string;
  count: number;
  color: 'gray' | 'purple' | 'green' | 'slate';
  columnId: 'todo' | 'vibing' | 'done' | 'archived';
  isWarning?: boolean;
  isDragOver?: boolean;
  onDrop?: () => void;
  children: React.ReactNode;
}

const colorMap = {
  gray: {
    dot: '#6B7280',
    border: 'rgba(107, 114, 128, 0.2)',
    dragOver: 'rgba(107, 114, 128, 0.1)',
  },
  purple: {
    dot: '#8B5CF6',
    border: 'rgba(139, 92, 246, 0.2)',
    dragOver: 'rgba(139, 92, 246, 0.1)',
  },
  green: {
    dot: '#10B981',
    border: 'rgba(16, 185, 129, 0.2)',
    dragOver: 'rgba(16, 185, 129, 0.1)',
  },
  slate: {
    dot: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.2)',
    dragOver: 'rgba(148, 163, 184, 0.1)',
  },
};

export function KanbanColumn({
  title,
  subtitle,
  count,
  color,
  columnId,
  isWarning,
  isDragOver,
  onDrop,
  children,
}: KanbanColumnProps) {
  const { colors } = useTheme();
  const columnColors = colorMap[color];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDragOver ? columnColors.dragOver : colors.surface,
          borderColor: isDragOver ? columnColors.dot : colors.border,
        },
        isDragOver && styles.dragOverContainer,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: columnColors.dot }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text
            style={[
              styles.count,
              { color: isWarning ? '#F59E0B' : colors.textSecondary },
              isWarning && styles.countWarning,
            ]}
          >
            {count}
            {isWarning && ' !'}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>

      {/* Cards */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: tokens.spacing.xs,
  },
  dragOverContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  header: {
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: tokens.spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
  },
  countWarning: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginLeft: 18, // Align with title (after dot)
  },
  content: {
    flex: 1,
    padding: tokens.spacing.sm,
    maxHeight: 450,
  },
});
