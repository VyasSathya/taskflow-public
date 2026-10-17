import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useHaptics } from '@/lib/hooks';
import { tokens } from '@/lib/theme';
import { Button } from '@/components/ui';
import { parseTaskInput } from '@/lib/services/nlp-service';
import { useTaskMutations, useTagMutations } from '@/lib/hooks/useTasks';
import { useAuthStore } from '@/lib/stores/auth-store';

interface TaskQuickAddProps {
  onTaskAdded?: () => void;
}

export function TaskQuickAdd({ onTaskAdded }: TaskQuickAddProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { createTask } = useTaskMutations();
  const { createTag } = useTagMutations();

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    haptics.trigger('light');

    try {
      // Parse NLP input
      const parsed = parseTaskInput(input);

      // Check if we need to create new tags
      const tagPromises = parsed.tags.map(async (tagName) => {
        // In a real app, you'd check if the tag exists first
        try {
          return await createTag.mutateAsync({ name: tagName });
        } catch (error) {
          // Tag might already exist, ignore error
          return null;
        }
      });

      await Promise.allSettled(tagPromises);

      // Create the task
      await createTask.mutateAsync({
        title: parsed.title,
        due_date: parsed.due_date,
        priority: parsed.priority,
        notes_format: 'html',
        position: 0,
        // Tags will be linked after we fetch them
      });

      // Success!
      haptics.trigger('success');
      setInput('');
      onTaskAdded?.();

      // Re-focus input for next task
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to create task:', error);
      haptics.trigger('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, tokens.spacing.sm),
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          placeholder="Add a task..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          blurOnSubmit={false}
          multiline={false}
          editable={!isSubmitting}
        />

        <Button
          title="Add"
          onPress={handleSubmit}
          size="sm"
          disabled={!input.trim() || isSubmitting}
          loading={isSubmitting}
          haptic="light"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: 44,
    paddingHorizontal: tokens.spacing.sm,
  },
});
