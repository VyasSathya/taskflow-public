/**
 * SearchFilterBar - Search Input with Filter Chips
 * Reusable search/filter component for list screens
 *
 * Use for:
 * - Content discovery
 * - List filtering
 * - Search interfaces
 *
 * Features:
 * - Animated search input
 * - Horizontal scrolling filter chips
 * - Active state styling
 * - Clear button
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { tokens } from '@/lib/theme';

interface FilterOption {
  id: string;
  label: string;
  icon?: string;
}

interface SearchFilterBarProps {
  /** Placeholder text for search input */
  placeholder?: string;
  /** Current search value */
  searchValue: string;
  /** Search value change handler */
  onSearchChange: (value: string) => void;
  /** Filter options to display */
  filters?: FilterOption[];
  /** Currently selected filter ID */
  selectedFilter?: string;
  /** Filter selection handler */
  onFilterSelect?: (filterId: string) => void;
  /** Primary accent color */
  primaryColor?: string;
  /** Show search input */
  showSearch?: boolean;
  /** Show filter chips */
  showFilters?: boolean;
}

function FilterChip({
  filter,
  isSelected,
  onPress,
  primaryColor,
}: {
  filter: FilterOption;
  isSelected: boolean;
  onPress: () => void;
  primaryColor: string;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.filterChip,
          isSelected && {
            backgroundColor: `${primaryColor}30`,
            borderColor: primaryColor,
          },
        ]}
      >
        {filter.icon && (
          <Ionicons
            name={filter.icon as any}
            size={14}
            color={isSelected ? primaryColor : 'rgba(255,255,255,0.6)'}
            style={styles.filterIcon}
          />
        )}
        <Text
          style={[
            styles.filterLabel,
            isSelected && { color: primaryColor },
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SearchFilterBar({
  placeholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  selectedFilter,
  onFilterSelect,
  primaryColor = '#8B5CF6',
  showSearch = true,
  showFilters = true,
}: SearchFilterBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSearchChange('');
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      {showSearch && (
        <View
          style={[
            styles.searchContainer,
            isFocused && { borderColor: primaryColor },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={isFocused ? primaryColor : 'rgba(255,255,255,0.4)'}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchValue}
            onChangeText={onSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchValue.length > 0 && (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      {/* Filter Chips */}
      {showFilters && filters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {filters.map((filter) => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={selectedFilter === filter.id}
              onPress={() => onFilterSelect?.(filter.id)}
              primaryColor={primaryColor}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: tokens.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: Platform.OS === 'ios' ? tokens.spacing.sm : 0,
  },
  clearButton: {
    padding: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  filtersScroll: {
    marginTop: tokens.spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterIcon: {
    marginRight: tokens.spacing.xs,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
});

export default SearchFilterBar;
