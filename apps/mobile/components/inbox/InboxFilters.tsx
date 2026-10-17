/**
 * InboxFilters - Filter chips for inbox items
 * Supports filtering by type (All/Errors/Feedback), source, and status
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens, semanticColors } from '@/lib/theme';

export type FilterType = 'all' | 'errors' | 'feedback';
export type FilterSource = 'all' | 'github' | 'email' | 'slack' | 'sentry' | 'manual';
export type FilterStatus = 'all' | 'new' | 'working' | 'done';

interface InboxFiltersProps {
  filterType: FilterType;
  filterSource: FilterSource;
  filterStatus: FilterStatus;
  onFilterTypeChange: (filter: FilterType) => void;
  onFilterSourceChange: (filter: FilterSource) => void;
  onFilterStatusChange: (filter: FilterStatus) => void;
}

interface FilterChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  activeColor?: string;
}

function FilterChip({ label, icon, isActive, onPress, activeColor = semanticColors.vibing }: FilterChipProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? activeColor : colors.surface,
          borderColor: isActive ? activeColor : colors.border,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={isActive ? '#FFFFFF' : colors.textSecondary}
          style={styles.chipIcon}
        />
      )}
      <Text
        style={[
          styles.chipLabel,
          { color: isActive ? '#FFFFFF' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function InboxFilters({
  filterType,
  filterSource,
  filterStatus,
  onFilterTypeChange,
  onFilterSourceChange,
  onFilterStatusChange,
}: InboxFiltersProps) {
  const { colors } = useTheme();

  const typeFilters: { id: FilterType; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'All' },
    { id: 'errors', label: 'Errors', icon: 'alert-circle-outline' },
    { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
  ];

  const sourceFilters: { id: FilterSource; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'github', label: 'GitHub', icon: 'logo-github' },
    { id: 'email', label: 'Email', icon: 'mail-outline' },
    { id: 'slack', label: 'Slack', icon: 'chatbubbles-outline' },
    { id: 'sentry', label: 'Sentry', icon: 'bug-outline' },
    { id: 'manual', label: 'Manual', icon: 'create-outline' },
  ];

  const statusFilters: { id: FilterStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'new', label: 'New', icon: 'time-outline' },
    { id: 'working', label: 'Working', icon: 'flash-outline' },
    { id: 'done', label: 'Done', icon: 'checkmark-circle-outline' },
    { id: 'all', label: 'All', icon: 'funnel-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Type Filters */}
      <View style={styles.filterSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {typeFilters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              icon={filter.icon}
              isActive={filterType === filter.id}
              onPress={() => onFilterTypeChange(filter.id)}
              activeColor={filter.id === 'errors' ? semanticColors.error : filter.id === 'feedback' ? semanticColors.info : semanticColors.vibing}
            />
          ))}
        </ScrollView>
      </View>

      {/* Source Filters */}
      <View style={styles.filterSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Source</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {sourceFilters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              icon={filter.icon}
              isActive={filterSource === filter.id}
              onPress={() => onFilterSourceChange(filter.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {statusFilters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              icon={filter.icon}
              isActive={filterStatus === filter.id}
              onPress={() => onFilterStatusChange(filter.id)}
              activeColor={
                filter.id === 'new' ? semanticColors.warning :
                filter.id === 'working' ? semanticColors.vibing :
                filter.id === 'done' ? semanticColors.success : semanticColors.vibing
              }
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: tokens.spacing.sm,
  },
  filterSection: {
    marginBottom: tokens.spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  filterRow: {
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default InboxFilters;
