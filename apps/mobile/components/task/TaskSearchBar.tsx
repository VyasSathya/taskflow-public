/**
 * Task Search Bar Component
 * Search and filter tasks
 */

import { View, TextInput, StyleSheet, TouchableOpacity, Modal, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { useState } from 'react';

interface SearchFilters {
  priority?: 'high' | 'medium' | 'low' | 'none';
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface TaskSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TaskSearchBar({
  value,
  onChangeText,
  onFiltersChange,
  placeholder = 'Search tasks...',
  autoFocus = false,
}: TaskSearchBarProps) {
  const { colors } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleClear = () => {
    onChangeText('');
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof SearchFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  }).length;

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />

        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={[
            styles.filterButton,
            { backgroundColor: activeFiltersCount > 0 ? colors.primary : 'transparent' },
          ]}
        >
          <Ionicons
            name="funnel-outline"
            size={20}
            color={activeFiltersCount > 0 ? '#FFFFFF' : colors.textSecondary}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
          />

          <View style={[styles.filtersContainer, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.filtersHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContent} showsVerticalScrollIndicator={false}>
              {/* Priority Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Priority</Text>
                <View style={styles.filterOptions}>
                  {(['high', 'medium', 'low', 'none'] as const).map((priority) => {
                    const isSelected = filters.priority === priority;
                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.filterOption,
                          { backgroundColor: colors.background },
                          isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          handleFilterChange({
                            ...filters,
                            priority: isSelected ? undefined : priority,
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { color: colors.text },
                            isSelected && { color: colors.primary, fontWeight: '600' },
                          ]}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Clear Filters */}
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => {
                  handleFilterChange({});
                  setShowFilters(false);
                }}
                disabled={activeFiltersCount === 0}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.clearFiltersText, { color: colors.error }]}>
                  Clear all filters
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Apply Button */}
            <View style={[styles.filtersFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.lg,
    gap: tokens.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: tokens.spacing.xs,
  },
  clearButton: {
    padding: tokens.spacing.xs,
  },
  filterButton: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filtersContainer: {
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filtersContent: {
    padding: tokens.spacing.lg,
  },
  filterSection: {
    marginBottom: tokens.spacing.xl,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  filterOptions: {
    gap: tokens.spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 15,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  clearFiltersText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filtersFooter: {
    padding: tokens.spacing.lg,
    borderTopWidth: 1,
  },
  applyButton: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
