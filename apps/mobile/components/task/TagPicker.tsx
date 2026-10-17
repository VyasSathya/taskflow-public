import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import type { Tag } from '@/lib/stores/task-store';

interface TagPickerProps {
  taskId: string;
  selectedTags: Tag[];
  availableTags: Tag[];
  onTagAdded?: (tag: Tag) => void;
  onTagRemoved?: (tagId: string) => void;
  onCreateTag?: (name: string, color: string) => Promise<Tag>;
}

const TAG_COLORS = [
  '#8B5CF6', // Violet (default)
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export function TagPicker({
  taskId,
  selectedTags,
  availableTags,
  onTagAdded,
  onTagRemoved,
  onCreateTag,
}: TagPickerProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const handleSelectTag = (tag: Tag) => {
    haptics.selection();
    const isSelected = selectedTags.some((t) => t.id === tag.id);

    if (isSelected) {
      onTagRemoved?.(tag.id);
    } else {
      onTagAdded?.(tag);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return;

    try {
      setCreating(true);
      haptics.light();

      const newTag = await onCreateTag(newTagName.trim(), selectedColor);

      onTagAdded?.(newTag);
      setNewTagName('');
      setSelectedColor(TAG_COLORS[0]);
      setIsAdding(false);
      haptics.success();
    } catch (error) {
      haptics.trigger('error');
      Alert.alert('Error', 'Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  const unselectedTags = availableTags.filter(
    (tag) => !selectedTags.some((t) => t.id === tag.id)
  );

  return (
    <View style={styles.container}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedTags}>
          {selectedTags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => handleSelectTag(tag)}
              style={[styles.tag, { backgroundColor: tag.color + '20', borderColor: tag.color }]}
            >
              <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              <Ionicons name="close-circle" size={16} color={tag.color} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Available tags */}
      {unselectedTags.length > 0 && !isAdding && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Available Tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            <View style={styles.tagList}>
              {unselectedTags.map((tag) => (
                <Pressable
                  key={tag.id}
                  onPress={() => handleSelectTag(tag)}
                  style={[
                    styles.tag,
                    styles.tagOutline,
                    { borderColor: tag.color, backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                  <Ionicons name="add-circle-outline" size={16} color={tag.color} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Create new tag */}
      {isAdding ? (
        <View style={styles.createForm}>
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="Tag name..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            autoFocus
            returnKeyType="done"
          />

          {/* Color picker */}
          <View style={styles.colorPicker}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.colorList}>
                {TAG_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => {
                      haptics.light();
                      setSelectedColor(color);
                    }}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                setNewTagName('');
                setSelectedColor(TAG_COLORS[0]);
                setIsAdding(false);
              }}
              disabled={creating}
              style={styles.actionButton}
            >
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateTag}
              disabled={!newTagName.trim() || creating}
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                { backgroundColor: colors.primary },
                (!newTagName.trim() || creating) && styles.actionButtonDisabled,
              ]}
            >
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setIsAdding(true)}
          style={[styles.addButton, { borderColor: colors.border }]}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Create Tag</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.md,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  section: {
    gap: tokens.spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagScroll: {
    marginHorizontal: -tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  tagList: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
  },
  tagOutline: {
    borderStyle: 'dashed',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createForm: {
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  input: {
    fontSize: 14,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: '#fff',
  },
  colorPicker: {
    gap: tokens.spacing.xs,
  },
  colorList: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  actionButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.md,
  },
  actionButtonPrimary: {
    // backgroundColor set inline
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
