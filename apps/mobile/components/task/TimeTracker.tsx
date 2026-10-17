/**
 * Time Tracker Component
 * Track time spent on tasks
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

export interface TimeEntry {
  id: string;
  task_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  notes?: string;
}

interface TimeTrackerProps {
  taskId: string;
  timeEntries?: TimeEntry[];
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  isTracking?: boolean;
}

export function TimeTracker({
  taskId,
  timeEntries = [],
  onStart,
  onStop,
  onDelete,
  isTracking = false,
}: TimeTrackerProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Get active time entry
  const activeEntry = timeEntries.find(entry => !entry.ended_at);

  useEffect(() => {
    if (isTracking && activeEntry) {
      // Calculate elapsed time
      const startTime = new Date(activeEntry.started_at).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      };

      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isTracking, activeEntry]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationText = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleToggleTimer = async () => {
    haptics.impact();
    if (isTracking) {
      await onStop?.();
    } else {
      await onStart?.();
    }
  };

  const handleDeleteEntry = (entry: TimeEntry) => {
    Alert.alert(
      'Delete Time Entry',
      'Are you sure you want to delete this time entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptics.impact();
            await onDelete?.(entry.id);
          },
        },
      ]
    );
  };

  // Calculate total time
  const totalSeconds = timeEntries.reduce((total, entry) => {
    if (entry.duration_seconds) {
      return total + entry.duration_seconds;
    }
    return total;
  }, 0) + (isTracking ? elapsedSeconds : 0);

  // Get completed entries (excluding active)
  const completedEntries = timeEntries.filter(entry => entry.ended_at);

  return (
    <View style={styles.container}>
      {/* Timer Display */}
      <View style={[styles.timerCard, { backgroundColor: colors.surface }]}>
        <View style={styles.timerHeader}>
          <View style={styles.timerTitleRow}>
            <Ionicons
              name={isTracking ? 'timer' : 'timer-outline'}
              size={24}
              color={isTracking ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.timerTitle, { color: colors.text }]}>Time Tracker</Text>
          </View>
          {totalSeconds > 0 && (
            <Text style={[styles.totalTime, { color: colors.textSecondary }]}>
              Total: {formatDurationText(totalSeconds)}
            </Text>
          )}
        </View>

        <View style={styles.timerDisplay}>
          <Text
            style={[
              styles.timerText,
              { color: isTracking ? colors.primary : colors.text },
            ]}
          >
            {formatDuration(isTracking ? elapsedSeconds : 0)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.timerButton,
            {
              backgroundColor: isTracking ? colors.error : colors.primary,
            },
          ]}
          onPress={handleToggleTimer}
        >
          <Ionicons
            name={isTracking ? 'stop' : 'play'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.timerButtonText}>
            {isTracking ? 'Stop Timer' : 'Start Timer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Entries List */}
      {completedEntries.length > 0 && (
        <View style={styles.entriesSection}>
          <Text style={[styles.entriesTitle, { color: colors.text }]}>
            Time Entries ({completedEntries.length})
          </Text>

          <ScrollView
            style={styles.entriesList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {completedEntries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryDuration, { color: colors.text }]}>
                      {formatDurationText(entry.duration_seconds || 0)}
                    </Text>
                    <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                      {format(new Date(entry.started_at), 'MMM dd, yyyy • h:mm a')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteEntry(entry)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {entry.notes && (
                  <Text
                    style={[styles.entryNotes, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {entry.notes}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.lg,
  },
  timerCard: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  timerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  entriesSection: {
    gap: tokens.spacing.md,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: tokens.spacing.xs,
  },
  entriesList: {
    maxHeight: 300,
  },
  entryCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryInfo: {
    flex: 1,
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 13,
  },
  deleteButton: {
    padding: tokens.spacing.xs,
  },
  entryNotes: {
    fontSize: 14,
    marginTop: tokens.spacing.sm,
    lineHeight: 20,
  },
});
