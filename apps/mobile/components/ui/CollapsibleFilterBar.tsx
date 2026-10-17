/**
 * CollapsibleFilterBar - Collapsible filter UI for project and tag filtering
 *
 * Features:
 * - Expandable/collapsible filter section
 * - Project filter bubbles
 * - Tag filter buttons with colors
 * - Active filter summary when collapsed
 * - Clear all filters button
 * - Haptic feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
import { useTheme } from '@/lib/hooks';
import type { Tag } from '@/lib/stores/task-store';

interface CollapsibleFilterBarProps {
  /** Available projects to filter by */
  availableProjects: string[];
  /** Selected project filters */
  selectedProjects: string[];
  /** Toggle project selection */
  onToggleProject: (project: string) => void;
  /** Available tags to filter by */
  availableTags: Tag[];
  /** Selected tag IDs */
  selectedTags: string[];
  /** Toggle tag selection */
  onToggleTag: (tagId: string) => void;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Total count of tasks before filtering */
  totalCount: number;
  /** Count of tasks after filtering */
  filteredCount: number;
}

function ProjectChip({
  project,
  isSelected,
  onPress,
  primaryColor,
}: {
  project: string;
  isSelected: boolean;
  onPress: () => void;
  primaryColor: string;
}) {
  const { colors } = useTheme();
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
          styles.chip,
          isSelected
            ? {
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              }
            : {
                backgroundColor: colors.surface,
                borderColor: `${primaryColor}50`,
              },
        ]}
      >
        <Ionicons
          name="folder-outline"
          size={14}
          color={isSelected ? '#fff' : primaryColor}
          style={styles.chipIcon}
        />
        <Text
          style={[
            styles.chipLabel,
            { color: isSelected ? '#fff' : primaryColor },
          ]}
        >
          {project}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TagChip({
  tag,
  isSelected,
  onPress,
}: {
  tag: Tag;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
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
          styles.chip,
          {
            backgroundColor: isSelected ? tag.color : colors.surface,
            borderColor: tag.color,
          },
        ]}
      >
        <Ionicons
          name="pricetag-outline"
          size={14}
          color={isSelected ? '#fff' : tag.color}
          style={styles.chipIcon}
        />
        <Text
          style={[
            styles.chipLabel,
            { color: isSelected ? '#fff' : tag.color },
          ]}
        >
          {tag.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CollapsibleFilterBar({
  availableProjects,
  selectedProjects,
  onToggleProject,
  availableTags,
  selectedTags,
  onToggleTag,
  onClearFilters,
  totalCount,
  filteredCount,
}: CollapsibleFilterBarProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasActiveFilters = selectedProjects.length > 0 || selectedTags.length > 0;
  const hasFiltersAvailable = availableProjects.length > 0 || availableTags.length > 0;

  // Don't render if no filters available
  if (!hasFiltersAvailable) {
    return null;
  }

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  const handleClearFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClearFilters();
  };

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      <TouchableOpacity
        onPress={toggleExpanded}
        style={[styles.toggleButton, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={styles.toggleLeft}>
          <Ionicons
            name="filter-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
            Filters
          </Text>
          {hasActiveFilters && (
            <View style={[styles.activeBadge, { backgroundColor: `${colors.primary}30` }]}>
              <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
                {selectedProjects.length + selectedTags.length} active
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded Filter Content */}
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.filterContent, { borderBottomColor: colors.border }]}
        >
          {/* Projects Section */}
          {availableProjects.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="folder-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Projects
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipContainer}
              >
                {availableProjects.map((project) => (
                  <ProjectChip
                    key={project}
                    project={project}
                    isSelected={selectedProjects.includes(project)}
                    onPress={() => onToggleProject(project)}
                    primaryColor={colors.primary}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tags Section */}
          {availableTags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="pricetag-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Tags
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipContainer}
              >
                {availableTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    isSelected={selectedTags.includes(tag.id)}
                    onPress={() => onToggleTag(tag.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={handleClearFilters}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
                Clear all filters
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Active Filter Summary (when collapsed) */}
      {!isExpanded && hasActiveFilters && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.summaryBar,
            { backgroundColor: `${colors.primary}10`, borderBottomColor: `${colors.primary}30` },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Filtering:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.summaryScroll}
            contentContainerStyle={styles.summaryContainer}
          >
            {selectedProjects.map((project) => (
              <Pressable
                key={project}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleProject(project);
                }}
                style={[
                  styles.summaryChip,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Ionicons
                  name="folder-outline"
                  size={10}
                  color={colors.primary}
                />
                <Text style={[styles.summaryChipText, { color: colors.primary }]}>
                  {project}
                </Text>
                <Ionicons
                  name="close"
                  size={10}
                  color={colors.primary}
                />
              </Pressable>
            ))}
            {selectedTags.map((tagId) => {
              const tag = availableTags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <Pressable
                  key={tagId}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleTag(tagId);
                  }}
                  style={[
                    styles.summaryChip,
                    { backgroundColor: `${tag.color}20` },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={10}
                    color={tag.color}
                  />
                  <Text style={[styles.summaryChipText, { color: tag.color }]}>
                    {tag.name}
                  </Text>
                  <Ionicons
                    name="close"
                    size={10}
                    color={tag.color}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            ({filteredCount} of {totalCount})
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  section: {
    gap: tokens.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScroll: {
    marginHorizontal: -tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: tokens.spacing.xs,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    gap: tokens.spacing.sm,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryScroll: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.borderRadius.full,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryCount: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: tokens.spacing.xs,
  },
});

export default CollapsibleFilterBar;
