/**
 * Calendar Screen
 * Visual calendar view of tasks with time blocking
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '@/lib/hooks';
import { useTasks } from '@/lib/hooks/useTasks';
import { tokens } from '@/lib/theme';
import { SafeAreaWrapper } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import type { Task } from '@vibetasks/shared';
import { format } from 'date-fns';
import { router } from 'expo-router';

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
    tasks?: Task[];
  };
}

export default function CalendarScreen() {
  const { colors, isDark } = useTheme();
  const { data: allTasks } = useTasks('all');
  const { data: todayTasks } = useTasks('today');
  const { data: upcomingTasks } = useTasks('upcoming');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Combine and deduplicate tasks
  const tasks = useMemo(() => {
    const combined = [
      ...(allTasks || []),
      ...(todayTasks || []),
      ...(upcomingTasks || []),
    ];
    const uniqueMap = new Map();
    combined.forEach(task => uniqueMap.set(task.id, task));
    return Array.from(uniqueMap.values());
  }, [allTasks, todayTasks, upcomingTasks]);

  // Group tasks by date and create marked dates
  const markedDates = useMemo<MarkedDates>(() => {
    const marked: MarkedDates = {};

    tasks
      .filter(task => !task.completed && (task.due_date || task.start_date))
      .forEach(task => {
        const dateStr = format(new Date(task.due_date || task.start_date!), 'yyyy-MM-dd');

        if (!marked[dateStr]) {
          marked[dateStr] = {
            marked: true,
            tasks: [],
          };
        }

        // Set dot color based on highest priority task on that day
        const priorityColors: Record<string, string> = {
          high: colors.error,
          medium: colors.warning,
          low: colors.info,
          none: colors.primary,
        };

        const currentColor = marked[dateStr].dotColor;
        const newColor = priorityColors[task.priority] || colors.primary;

        // High priority overrides all, medium overrides low/none, etc.
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
  }, [tasks, selectedDate, colors]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    return markedDates[selectedDate]?.tasks || [];
  }, [markedDates, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleAddTask = () => {
    // TODO: Open task creation modal with pre-filled due date
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

  return (
    <SafeAreaWrapper edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {tasks.filter(t => !t.completed).length} active tasks
          </Text>
        </View>

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

          <ScrollView
            style={styles.tasksList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tasksListContent}
          >
            {selectedDateTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={colors.textTertiary}
                />
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
                  onPress={() => {
                    // TODO: Open task detail
                    Alert.alert('Task Detail', task.title);
                  }}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <Ionicons
                        name={getPriorityIcon(task.priority)}
                        size={16}
                        color={getPriorityColor(task.priority)}
                        style={styles.priorityIcon}
                      />
                      <Text
                        style={[styles.taskTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
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
                    <Text
                      style={[styles.taskNotes, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {task.notes.replace(/<[^>]*>/g, '')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  calendarContainer: {
    paddingHorizontal: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    overflow: 'hidden',
  },
  tasksSection: {
    flex: 1,
    marginTop: tokens.spacing.lg,
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
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xl * 2,
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
