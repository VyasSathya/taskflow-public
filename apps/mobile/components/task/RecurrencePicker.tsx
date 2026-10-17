/**
 * Recurrence Picker Component
 * Allows users to set recurring patterns for tasks
 */

import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useState } from 'react';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days?: number[]; // For weekly: 0=Sun, 1=Mon, etc. For monthly: 1-31
  time?: string; // HH:mm format
}

interface RecurrenceOption {
  id: string;
  label: string;
  description: string;
  pattern: RecurrencePattern;
  icon: keyof typeof Ionicons.glyphMap;
}

interface RecurrencePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (pattern: RecurrencePattern | null) => void;
  currentPattern?: RecurrencePattern;
}

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  {
    id: 'daily',
    label: 'Daily',
    description: 'Repeats every day',
    pattern: { type: 'daily', interval: 1 },
    icon: 'today-outline',
  },
  {
    id: 'weekdays',
    label: 'Weekdays',
    description: 'Monday through Friday',
    pattern: { type: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] },
    icon: 'briefcase-outline',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Repeats every week',
    pattern: { type: 'weekly', interval: 1 },
    icon: 'calendar-outline',
  },
  {
    id: 'biweekly',
    label: 'Bi-weekly',
    description: 'Every 2 weeks',
    pattern: { type: 'weekly', interval: 2 },
    icon: 'calendar-outline',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Repeats every month',
    pattern: { type: 'monthly', interval: 1 },
    icon: 'calendar-number-outline',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    description: 'Repeats every year',
    pattern: { type: 'yearly', interval: 1 },
    icon: 'calendar-clear-outline',
  },
];

const WEEKDAYS = [
  { id: 0, short: 'Su', full: 'Sunday' },
  { id: 1, short: 'Mo', full: 'Monday' },
  { id: 2, short: 'Tu', full: 'Tuesday' },
  { id: 3, short: 'We', full: 'Wednesday' },
  { id: 4, short: 'Th', full: 'Thursday' },
  { id: 5, short: 'Fr', full: 'Friday' },
  { id: 6, short: 'Sa', full: 'Saturday' },
];

export function RecurrencePicker({
  visible,
  onClose,
  onSelect,
  currentPattern,
}: RecurrencePickerProps) {
  const { colors } = useTheme();
  const [selectedPattern, setSelectedPattern] = useState<RecurrencePattern | undefined>(
    currentPattern
  );
  const [customWeekdays, setCustomWeekdays] = useState<number[]>(currentPattern?.days || []);
  const [showCustomWeekdays, setShowCustomWeekdays] = useState(false);

  const handleSelect = (pattern: RecurrencePattern) => {
    if (pattern.type === 'weekly' && !pattern.days) {
      // Show custom weekday selector
      setSelectedPattern(pattern);
      setShowCustomWeekdays(true);
    } else {
      setSelectedPattern(pattern);
      onSelect(pattern);
      onClose();
    }
  };

  const handleWeekdayToggle = (dayId: number) => {
    setCustomWeekdays((prev) => {
      if (prev.includes(dayId)) {
        return prev.filter((d) => d !== dayId);
      } else {
        return [...prev, dayId].sort();
      }
    });
  };

  const handleCustomWeekdaysConfirm = () => {
    if (customWeekdays.length === 0) {
      return; // Must select at least one day
    }
    const pattern: RecurrencePattern = {
      type: 'weekly',
      interval: selectedPattern?.interval || 1,
      days: customWeekdays,
    };
    onSelect(pattern);
    setShowCustomWeekdays(false);
    onClose();
  };

  const handleRemove = () => {
    setSelectedPattern(undefined);
    onSelect(null);
    onClose();
  };

  const isPatternSelected = (option: RecurrenceOption) => {
    if (!selectedPattern) return false;
    if (selectedPattern.type !== option.pattern.type) return false;
    if (selectedPattern.interval !== option.pattern.interval) return false;

    // Check days match for weekly patterns
    if (option.pattern.days) {
      return JSON.stringify(selectedPattern.days?.sort()) === JSON.stringify(option.pattern.days.sort());
    }

    return true;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="repeat-outline" size={24} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>
                {showCustomWeekdays ? 'Select Days' : 'Set Recurrence'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (showCustomWeekdays) {
                  setShowCustomWeekdays(false);
                } else {
                  onClose();
                }
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.options} showsVerticalScrollIndicator={false}>
            {!showCustomWeekdays ? (
              <>
                {RECURRENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                      isPatternSelected(option) && {
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                    onPress={() => handleSelect(option.pattern)}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name={option.icon} size={20} color={colors.primary} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionLabel, { color: colors.text }]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                      </View>
                    </View>
                    {isPatternSelected(option) && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Remove Recurrence */}
                {selectedPattern && (
                  <TouchableOpacity
                    style={[styles.option, styles.removeOption, { borderBottomColor: colors.border }]}
                    onPress={handleRemove}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionLabel, { color: colors.error }]}>
                          Don't repeat
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.error + 'AA' }]}>
                          Remove recurrence
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* Custom Weekdays Selector */}
                <View style={styles.weekdaysContainer}>
                  <Text style={[styles.weekdaysTitle, { color: colors.textSecondary }]}>
                    Select which days to repeat
                  </Text>
                  <View style={styles.weekdaysGrid}>
                    {WEEKDAYS.map((day) => {
                      const isSelected = customWeekdays.includes(day.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.weekdayButton,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            isSelected && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={() => handleWeekdayToggle(day.id)}
                        >
                          <Text
                            style={[
                              styles.weekdayText,
                              { color: colors.text },
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            {day.short}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.primary },
                    customWeekdays.length === 0 && {
                      backgroundColor: colors.border,
                    },
                  ]}
                  onPress={handleCustomWeekdaysConfirm}
                  disabled={customWeekdays.length === 0}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: tokens.spacing.xs,
  },
  options: {
    maxHeight: 500,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  removeOption: {
    marginTop: tokens.spacing.md,
  },
  weekdaysContainer: {
    padding: tokens.spacing.lg,
  },
  weekdaysTitle: {
    fontSize: 14,
    marginBottom: tokens.spacing.md,
    textAlign: 'center',
  },
  weekdaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    justifyContent: 'center',
  },
  weekdayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    margin: tokens.spacing.lg,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
