/**
 * Upcoming Screen with List/Calendar Toggle
 * Combines list view and calendar view in one screen
 */

import { View, Text, FlatList, StyleSheet, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { SwipeableTaskCard, TaskQuickAdd } from '@/components/task';
import { EmptyState } from '@/components/ui';
import { SafeAreaWrapper } from '@/components/common';
import { useTasks, useTaskSubscription } from '@/lib/hooks/useTasks';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import type { Task } from '@vibetasks/shared';
import { format } from 'date-fns';

type ViewMode = 'list' | 'calendar';

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
    tasks?: Task[];
  };
}

export default function UpcomingScreen() {
  const { colors, isDark } = useTheme();
  const { data: upcomingTasks, isLoading, refetch, isRefetching } = useTasks('upcoming');
  const { data: allTasks } = useTasks('all');
  const { data: todayTasks } = useTasks('today');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Subscribe to realtime updates
  useTaskSubscription();

  // Combine all tasks for calendar view
  const allTasksCombined = useMemo(() => {
    const combined = [
      ...(allTasks || []),
      ...(todayTasks || []),
      ...(upcomingTasks || []),
    ];
    const uniqueMap = new Map();
    combined.forEach(task => uniqueMap.set(task.id, task));
    return Array.from(uniqueMap.values());
  }, [allTasks, todayTasks, upcomingTasks]);

  // Group tasks by date for calendar
  const markedDates = useMemo<MarkedDates>(() => {
    const marked: MarkedDates = {};

    allTasksCombined
      .filter(task => !task.completed && (task.due_date || task.start_date))
      .forEach(task => {
        const dateStr = format(new Date(task.due_date || task.start_date!), 'yyyy-MM-dd');

        if (!marked[dateStr]) {
          marked[dateStr] = {
            marked: true,
            tasks: [],
          };
        }

        // Priority colors for dots
        const priorityColors: Record<string, string> = {
          high: colors.error,
          medium: colors.warning,
          low: colors.info,
          none: colors.primary,
        };

        const currentColor = marked[dateStr].dotColor;
        const newColor = priorityColors[task.priority] || colors.primary;

        // Higher priority overrides lower
        if (!currentColor ||
            (task.priority === 'high') ||
            (task.priority === 'medium' && currentColor !== priorityColors.high) ||
            (task.priority === 'low' && currentColor !== priorityColors.high && currentColor !== priorityColors.medium)) {
          marked[dateStr].dotColor = newColor;
        }

        marked[dateStr].tasks!.push(task);
      });

    // Highlight selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = colors.primary + '20';
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary + '20',
        tasks: [],
      };
    }

    return marked;
  }, [allTasksCombined, selectedDate, colors]);

  const selectedDateTasks = useMemo(() => {
    return markedDates[selectedDate]?.tasks || [];
  }, [markedDates, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleAddTask = () => {
    Alert.alert('Add Task', `Create task for ${format(new Date(selectedDate), 'MMM dd, yyyy')}`);
  };

  const getPriorityColor = (priority: string) => {
    const colors_map: Record<string, string> = {
      high: colors.error,
      medium: colors.warning,
      low: colors.info,
      none: colors.textSecondary,
    };
    return colors_map[priority] || colors.textSecondary;
  };

  const getPriorityIcon = (priority: string): keyof typeof Ionicons.glyphMap => {
    const icons = {
      high: 'alert-circle' as const,
      medium: 'warning' as const,
      low: 'information-circle' as const,
      none: 'ellipse' as const,
    };
    return icons[priority as keyof typeof icons] || 'ellipse';
  };

  const renderTask = ({ item }: { item: Task }) => <SwipeableTaskCard task={item} />;

  const renderEmpty = () => (
    <EmptyState
      type="no-data"
      title="No upcoming tasks"
      subtitle="Tasks with future due dates will appear here"
      icon="time-outline"
    />
  );

  return (
    <SafeAreaWrapper edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with View Toggle */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.text }]}>Upcoming</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {viewMode === 'list'
                ? `${upcomingTasks?.length || 0} tasks scheduled`
                : `${allTasksCombined.filter(t => !t.completed).length} active tasks`
              }
            </Text>
          </View>

          {/* View Toggle */}
          <View style={[styles.toggleContainer, { backgroundColor: colors.backgroundTertiary }]}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={[
                styles.toggleButton,
                viewMode === 'list' && [styles.toggleButtonActive, { backgroundColor: colors.surface }],
              ]}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('calendar')}
              style={[
                styles.toggleButton,
                viewMode === 'calendar' && [styles.toggleButtonActive, { backgroundColor: colors.surface }],
              ]}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={viewMode === 'calendar' ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* List View */}
        {viewMode === 'list' && (
          <FlatList
            data={upcomingTasks || []}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
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

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <ScrollView style={styles.calendarView} showsVerticalScrollIndicator={false}>
            {/* Calendar */}
            <View
              style={[
                styles.calendarContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDark ? 0 : 1,
                },
                !isDark && tokens.shadows.md,
              ]}
            >
              <Calendar
                current={selectedDate}
                onDayPress={handleDayPress}
                markedDates={markedDates}
                theme={{
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.textInverse,
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textTertiary,
                  dotColor: colors.primary,
                  selectedDotColor: colors.textInverse,
                  monthTextColor: colors.text,
                  textMonthFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  arrowColor: colors.primary,
                  textDayHeaderFontWeight: '600',
                  todayBackgroundColor: isDark ? colors.backgroundTertiary : colors.backgroundSecondary,
                  todayDotColor: colors.primary,
                }}
                enableSwipeMonths
              />
            </View>

            {/* Selected Date Tasks */}
            <View style={styles.tasksSection}>
              <View style={styles.tasksSectionHeader}>
                <View>
                  <Text style={[styles.tasksTitle, { color: colors.text }]}>
                    {format(new Date(selectedDate), 'MMMM dd, yyyy')}
                  </Text>
                  <Text style={[styles.tasksCount, { color: colors.textSecondary }]}>
                    {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleAddTask}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={24} color={colors.textInverse} />
                </TouchableOpacity>
              </View>

              {selectedDateTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No tasks for this date
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                    Tap + to add a task
                  </Text>
                </View>
              ) : (
                selectedDateTasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: isDark ? 0 : 1,
                      },
                      !isDark && tokens.shadows.sm,
                    ]}
                    onPress={() => Alert.alert('Task Detail', task.title)}
                  >
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleRow}>
                        <Ionicons
                          name={getPriorityIcon(task.priority)}
                          size={16}
                          color={getPriorityColor(task.priority)}
                          style={styles.priorityIcon}
                        />
                        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
                          {task.title}
                        </Text>
                      </View>
                    </View>

                    {task.start_date && (
                      <View style={styles.taskTime}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.taskTimeText, { color: colors.textSecondary }]}>
                          {format(new Date(task.start_date), 'h:mm a')}
                          {task.duration_minutes && ` • ${task.duration_minutes} min`}
                        </Text>
                      </View>
                    )}

                    {task.notes && (
                      <Text style={[styles.taskNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                        {task.notes.replace(/<[^>]*>/g, '')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Legend */}
            <View style={[styles.legend, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>Priority:</Text>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>High</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Medium</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Low</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {viewMode === 'list' && <TaskQuickAdd />}
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.md,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: tokens.borderRadius.md,
    padding: 2,
    marginTop: 4,
  },
  toggleButton: {
    padding: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
  },
  toggleButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
  },
  calendarView: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: tokens.spacing.lg,
  },
  tasksSection: {
    marginTop: tokens.spacing.md,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tasksCount: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xl * 2,
    paddingHorizontal: tokens.spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: tokens.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  taskCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    marginBottom: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.lg,
  },
  taskHeader: {
    marginBottom: tokens.spacing.xs,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    marginRight: tokens.spacing.xs,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  taskTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: tokens.spacing.xs,
  },
  taskTimeText: {
    fontSize: 13,
  },
  taskNotes: {
    fontSize: 14,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: 1,
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendItems: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
