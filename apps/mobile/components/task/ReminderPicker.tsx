/**
 * Reminder Picker Component
 * Allows users to set reminders for tasks
 */

import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useState } from 'react';

interface ReminderOption {
  id: string;
  label: string;
  minutesBefore: number;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ReminderPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (minutesBefore: number) => void;
  currentReminder?: number;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  { id: 'at-time', label: 'At time of task', minutesBefore: 0, icon: 'time-outline' },
  { id: '5-min', label: '5 minutes before', minutesBefore: 5, icon: 'timer-outline' },
  { id: '10-min', label: '10 minutes before', minutesBefore: 10, icon: 'timer-outline' },
  { id: '15-min', label: '15 minutes before', minutesBefore: 15, icon: 'timer-outline' },
  { id: '30-min', label: '30 minutes before', minutesBefore: 30, icon: 'alarm-outline' },
  { id: '1-hour', label: '1 hour before', minutesBefore: 60, icon: 'alarm-outline' },
  { id: '2-hours', label: '2 hours before', minutesBefore: 120, icon: 'alarm-outline' },
  { id: '1-day', label: '1 day before', minutesBefore: 1440, icon: 'calendar-outline' },
];

export function ReminderPicker({ visible, onClose, onSelect, currentReminder }: ReminderPickerProps) {
  const { colors } = useTheme();
  const [selectedMinutes, setSelectedMinutes] = useState<number | undefined>(currentReminder);

  const handleSelect = (minutesBefore: number) => {
    setSelectedMinutes(minutesBefore);
    onSelect(minutesBefore);
    onClose();
  };

  const handleRemove = () => {
    setSelectedMinutes(undefined);
    onSelect(-1); // -1 means remove reminder
    onClose();
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
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Set Reminder</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView style={styles.options} showsVerticalScrollIndicator={false}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  { borderBottomColor: colors.border },
                  selectedMinutes === option.minutesBefore && {
                    backgroundColor: colors.primary + '10',
                  },
                ]}
                onPress={() => handleSelect(option.minutesBefore)}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={option.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </View>
                {selectedMinutes === option.minutesBefore && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Remove Reminder */}
            {selectedMinutes !== undefined && (
              <TouchableOpacity
                style={[styles.option, styles.removeOption, { borderBottomColor: colors.border }]}
                onPress={handleRemove}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  </View>
                  <Text style={[styles.optionLabel, { color: colors.error }]}>
                    Remove reminder
                  </Text>
                </View>
              </TouchableOpacity>
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
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeOption: {
    marginTop: tokens.spacing.md,
  },
});
